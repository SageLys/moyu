import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../state';
import { generateQteSteps, applyQteStepClick, applyQteSuccess, applyQteFail } from '../qte';
import { setDanger } from '../dangers';
import { qteOutcome, coworkerRescueEffect } from '../config';
import type { GameState } from '../types';

function qteState(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialGameState();
  s.currentMode = 'QTE_ACTIVE';
  s.qteRemaining = 10;
  return Object.assign(s, overrides);
}

describe('generateQteSteps – single danger', () => {
  it('single unsafe_screen → [switch_safe_work]', () => {
    const state = createInitialGameState();
    setDanger(state, 'unsafe_screen');
    const steps = generateQteSteps(state, 1);
    expect(steps.length).toBe(1);
    expect(steps[0].stepId).toBe('switch_safe_work');
    expect(steps[0].clearsDanger).toBe('unsafe_screen');
  });
});

describe('generateQteSteps – multiple dangers by priority', () => {
  it('unsafe_screen(p1) before desk_empty(p4) when both active', () => {
    const state = createInitialGameState();
    setDanger(state, 'desk_empty');
    setDanger(state, 'unsafe_screen');
    const steps = generateQteSteps(state, 2);
    expect(steps[0].stepId).toBe('switch_safe_work');
    expect(steps[1].stepId).toBe('organize_work_trace');
  });
});

describe('generateQteSteps – step count truncation', () => {
  it('truncates to stepCount even if more dangers active', () => {
    const state = createInitialGameState();
    setDanger(state, 'unsafe_screen');
    setDanger(state, 'phone_lit');
    setDanger(state, 'takeout_open');
    const steps = generateQteSteps(state, 2);
    expect(steps.length).toBe(2);
  });
});

describe('generateQteSteps – filler when no real dangers', () => {
  it('fills with sit_up and type_keyboard when scene is clean', () => {
    const state = createInitialGameState();
    const steps = generateQteSteps(state, 2);
    expect(steps.length).toBe(2);
    const ids = steps.map(s => s.stepId);
    expect(ids).toContain('sit_up');
    expect(ids).toContain('type_keyboard');
  });

  it('filler with 1 step returns sit_up first', () => {
    const state = createInitialGameState();
    const steps = generateQteSteps(state, 1);
    expect(steps[0].stepId).toBe('sit_up');
  });
});

describe('generateQteSteps – no repeated stepId', () => {
  it('each stepId appears at most once', () => {
    const state = createInitialGameState();
    setDanger(state, 'unsafe_screen');
    setDanger(state, 'phone_lit');
    const steps = generateQteSteps(state, 5);
    const ids = steps.map(s => s.stepId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('applyQteStepClick – correct click', () => {
  it('clears the danger and advances index', () => {
    const state = qteState();
    setDanger(state, 'unsafe_screen');
    state.qteSteps = generateQteSteps(state, 1);
    state.qteStepIndex = 0;

    const result = applyQteStepClick(state, 'computer');
    expect(result.hit).toBe(true);
    expect(state.activeDangers.has('unsafe_screen')).toBe(false);
  });

  it('last step click marks complete and calls applyQteSuccess', () => {
    const state = qteState();
    state.qteSteps = generateQteSteps(state, 1);
    state.qteStepIndex = 0;

    const result = applyQteStepClick(state, state.qteSteps[0].targetObjectId);
    expect(result.complete).toBe(true);
    expect(state.currentMode).toBe('QTE_SUCCESS');
  });
});

describe('applyQteStepClick – wrong click', () => {
  it('deducts wrongClickPenaltySeconds from qteRemaining', () => {
    const state = qteState();
    state.qteSteps = [{ stepId: 'switch_safe_work', targetObjectId: 'computer', clearsDanger: 'unsafe_screen' }];
    state.qteStepIndex = 0;
    state.qteRemaining = 5;

    const result = applyQteStepClick(state, 'phone'); // wrong target
    expect(result.hit).toBe(false);
    expect(result.complete).toBe(false);
    expect(state.qteRemaining).toBeCloseTo(5 - 0.5, 5);
  });

  it('wrong click does not advance step index', () => {
    const state = qteState();
    state.qteSteps = [{ stepId: 'switch_safe_work', targetObjectId: 'computer', clearsDanger: 'unsafe_screen' }];
    state.qteStepIndex = 0;

    applyQteStepClick(state, 'phone');
    expect(state.qteStepIndex).toBe(0);
  });

  it('wrong click does not immediately fail (mode stays QTE_ACTIVE)', () => {
    const state = qteState();
    state.qteSteps = [{ stepId: 'switch_safe_work', targetObjectId: 'computer', clearsDanger: 'unsafe_screen' }];
    state.qteStepIndex = 0;
    state.qteRemaining = 5;

    applyQteStepClick(state, 'phone');
    expect(state.currentMode).toBe('QTE_ACTIVE');
  });
});

describe('applyQteStepClick – 宽限窗口(LEADER_WARNING)也受理收拾点击', () => {
  it('LEADER_WARNING 期间命中目标清除危险并推进', () => {
    const state = createInitialGameState();
    state.currentMode = 'LEADER_WARNING';
    state.leaderWarningRemaining = 8;
    setDanger(state, 'unsafe_screen');
    state.qteSteps = generateQteSteps(state, 1);
    state.qteStepIndex = 0;

    const result = applyQteStepClick(state, 'computer');
    expect(result.hit).toBe(true);
    expect(state.activeDangers.has('unsafe_screen')).toBe(false);
  });

  it('LEADER_WARNING 期间错点扣减 leaderWarningRemaining（不扣 qteRemaining）', () => {
    const state = createInitialGameState();
    state.currentMode = 'LEADER_WARNING';
    state.leaderWarningRemaining = 5;
    state.qteRemaining = 0;
    state.qteSteps = [
      { stepId: 'switch_safe_work', targetObjectId: 'computer', clearsDanger: 'unsafe_screen' },
    ];
    state.qteStepIndex = 0;

    const result = applyQteStepClick(state, 'phone'); // 错点
    expect(result.hit).toBe(false);
    expect(state.leaderWarningRemaining).toBeCloseTo(5 - 0.5, 5);
    expect(state.qteRemaining).toBe(0);
  });

  it('宽限窗口内清完最后一步 → 提前成功(QTE_SUCCESS)', () => {
    const state = createInitialGameState();
    state.currentMode = 'LEADER_WARNING';
    state.leaderWarningRemaining = 8;
    state.qteSteps = generateQteSteps(state, 1);
    state.qteStepIndex = 0;

    const result = applyQteStepClick(state, state.qteSteps[0].targetObjectId);
    expect(result.complete).toBe(true);
    expect(state.currentMode).toBe('QTE_SUCCESS');
  });
});

describe('applyQteSuccess', () => {
  it('applies success delta from qteOutcome', () => {
    const state = qteState();
    const spiritBefore = state.resources.spirit;
    const trustBefore = state.resources.trust;
    applyQteSuccess(state);
    expect(state.resources.spirit).toBeCloseTo(spiritBefore + qteOutcome.success.delta.spirit, 5);
    expect(state.resources.trust).toBeCloseTo(trustBefore + qteOutcome.success.delta.trust, 5);
  });

  it('sets safeWindow to safeWindowSeconds', () => {
    const state = qteState();
    applyQteSuccess(state);
    expect(state.safeWindow).toBe(qteOutcome.success.safeWindowSeconds);
  });

  it('increments wave by 1', () => {
    const state = qteState();
    const waveBefore = state.wave;
    applyQteSuccess(state);
    expect(state.wave).toBe(waveBefore + 1);
  });

  it('sets mode to QTE_SUCCESS', () => {
    const state = qteState();
    applyQteSuccess(state);
    expect(state.currentMode).toBe('QTE_SUCCESS');
  });
});

describe('applyQteFail', () => {
  it('applies fail delta from qteOutcome', () => {
    const state = qteState();
    // Set resources high enough to survive the penalty
    state.resources.spirit = 80;
    state.resources.trust = 80;
    const spiritBefore = state.resources.spirit;
    const trustBefore = state.resources.trust;
    applyQteFail(state);
    expect(state.resources.spirit).toBeCloseTo(spiritBefore + qteOutcome.fail.delta.spirit, 5);
    expect(state.resources.trust).toBeCloseTo(trustBefore + qteOutcome.fail.delta.trust, 5);
  });

  it('increments wave by 1', () => {
    const state = qteState();
    const waveBefore = state.wave;
    applyQteFail(state);
    expect(state.wave).toBe(waveBefore + 1);
  });

  it('sets mode to QTE_FAIL', () => {
    const state = qteState();
    applyQteFail(state);
    expect(state.currentMode).toBe('QTE_FAIL');
  });

  it('keepUnfinishedDangers: unfinished dangers remain after fail', () => {
    const state = qteState();
    setDanger(state, 'phone_lit');
    state.qteSteps = [
      { stepId: 'put_away_phone', targetObjectId: 'phone', clearsDanger: 'phone_lit' },
    ];
    state.qteStepIndex = 0;
    applyQteFail(state);
    expect(state.activeDangers.has('phone_lit')).toBe(true);
  });
});

describe('coworkerRescue buff – single-use fail override', () => {
  it('overrides trust delta on QTE fail and consumes buff', () => {
    const state = qteState();
    state.resources.trust = 80;
    state.resources.spirit = 80;
    state.activeBuffs.add('coworkerRescue');
    const trustBefore = state.resources.trust;
    const spiritBefore = state.resources.spirit;
    applyQteFail(state);
    // trust should be overridden to -5 (not -15)
    const overrideTrust = (coworkerRescueEffect.overrideFailDelta as { trust: number }).trust;
    expect(state.resources.trust).toBeCloseTo(trustBefore + overrideTrust, 5);
    // spirit penalty still applies
    expect(state.resources.spirit).toBeCloseTo(spiritBefore + qteOutcome.fail.delta.spirit, 5);
    // buff consumed
    expect(state.activeBuffs.has('coworkerRescue')).toBe(false);
  });

  it('second QTE fail without buff uses full penalty', () => {
    const state = qteState();
    state.resources.trust = 80;
    state.resources.spirit = 80;
    state.activeBuffs.add('coworkerRescue');
    applyQteFail(state); // buff consumed

    // Reset to normal QTE_ACTIVE for second fail
    state.currentMode = 'QTE_ACTIVE';
    state.wave = 1;
    state.resources.trust = 80;
    state.resources.spirit = 80;
    const trustBefore2 = state.resources.trust;
    applyQteFail(state);
    expect(state.resources.trust).toBeCloseTo(trustBefore2 + qteOutcome.fail.delta.trust, 5);
  });
});
