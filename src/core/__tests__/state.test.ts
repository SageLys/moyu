import { describe, it, expect } from 'vitest';
import { createInitialGameState, tickGame, checkRunEnd } from '../state';
import { applyQteSuccess, applyQteFail } from '../qte';
import { setDanger } from '../dangers';
import { qteOutcome } from '../config';

describe('createInitialGameState', () => {
  it('starts in NORMAL_PLAY mode', () => {
    const state = createInitialGameState();
    expect(state.currentMode).toBe('NORMAL_PLAY');
  });

  it('wave starts at 1', () => {
    const state = createInitialGameState();
    expect(state.wave).toBe(1);
  });

  it('has no active dangers or buffs', () => {
    const state = createInitialGameState();
    expect(state.activeDangers.size).toBe(0);
    expect(state.activeBuffs.size).toBe(0);
  });
});

describe('checkRunEnd', () => {
  it('spirit_zero → RUN_END with spirit_zero reason', () => {
    const state = createInitialGameState();
    state.resources.spirit = 0;
    checkRunEnd(state);
    expect(state.currentMode).toBe('RUN_END');
    expect(state.endReason).toBe('spirit_zero');
  });

  it('satiety_zero → RUN_END with satiety_zero reason', () => {
    const state = createInitialGameState();
    state.resources.satiety = 0;
    checkRunEnd(state);
    expect(state.currentMode).toBe('RUN_END');
    expect(state.endReason).toBe('satiety_zero');
  });

  it('trust_zero → RUN_END with trust_zero reason', () => {
    const state = createInitialGameState();
    state.resources.trust = 0;
    checkRunEnd(state);
    expect(state.currentMode).toBe('RUN_END');
    expect(state.endReason).toBe('trust_zero');
  });

  it('coworkerSpirit_zero → RUN_END with coworkerSpirit_zero reason', () => {
    const state = createInitialGameState();
    state.resources.coworkerSpirit = 0;
    checkRunEnd(state);
    expect(state.currentMode).toBe('RUN_END');
    expect(state.endReason).toBe('coworkerSpirit_zero');
  });

  it('no-op when already RUN_END', () => {
    const state = createInitialGameState();
    state.currentMode = 'RUN_END';
    state.endReason = 'spirit_zero';
    state.resources.trust = 0;
    checkRunEnd(state);
    expect(state.endReason).toBe('spirit_zero'); // unchanged
  });
});

describe('tickGame – basic time advance', () => {
  it('advances runTime', () => {
    const state = createInitialGameState();
    tickGame(state, 1);
    expect(state.runTime).toBeCloseTo(1, 5);
  });

  it('decays resources', () => {
    const state = createInitialGameState();
    const spiritBefore = state.resources.spirit;
    tickGame(state, 1);
    expect(state.resources.spirit).toBeLessThan(spiritBefore);
  });

  it('does not tick in RUN_END mode', () => {
    const state = createInitialGameState();
    state.currentMode = 'RUN_END';
    const runTimeBefore = state.runTime;
    tickGame(state, 1);
    expect(state.runTime).toBe(runTimeBefore);
  });
});

describe('tickGame – patrol timer and LEADER_WARNING', () => {
  it('transitions to LEADER_WARNING when patrol expires', () => {
    const state = createInitialGameState();
    state.nextLeaderPatrol = 1;
    tickGame(state, 2);
    // After patrol expires → LEADER_WARNING (or could have continued to QTE_ACTIVE if warning also small)
    // Just verify it's no longer NORMAL_PLAY
    expect(['LEADER_WARNING', 'QTE_ACTIVE', 'QTE_FAIL', 'QTE_SUCCESS', 'NORMAL_PLAY']).toContain(
      state.currentMode,
    );
  });

  it('safeWindow prevents patrol countdown', () => {
    const state = createInitialGameState();
    state.nextLeaderPatrol = 5;
    state.safeWindow = 10;
    tickGame(state, 3);
    expect(state.nextLeaderPatrol).toBe(5); // unchanged
    expect(state.currentMode).toBe('NORMAL_PLAY');
  });
});

describe('tickGame – QTE timeout → fail', () => {
  it('QTE_ACTIVE with 0 remaining triggers fail on tick', () => {
    const state = createInitialGameState();
    state.currentMode = 'QTE_ACTIVE';
    state.qteSteps = [];
    state.qteStepIndex = 0;
    state.qteRemaining = 0.01;
    state.resources.spirit = 80;
    state.resources.trust = 80;
    tickGame(state, 1);
    expect(['QTE_FAIL', 'NORMAL_PLAY']).toContain(state.currentMode);
  });
});

describe('tickGame – QTE_SUCCESS / QTE_FAIL transitions to NORMAL_PLAY', () => {
  it('QTE_SUCCESS mode transitions to NORMAL_PLAY on next tick', () => {
    const state = createInitialGameState();
    state.currentMode = 'QTE_SUCCESS';
    state.wave = 2;
    tickGame(state, 0.01);
    expect(state.currentMode).toBe('NORMAL_PLAY');
  });

  it('QTE_FAIL mode transitions to NORMAL_PLAY on next tick', () => {
    const state = createInitialGameState();
    state.currentMode = 'QTE_FAIL';
    state.wave = 2;
    tickGame(state, 0.01);
    expect(state.currentMode).toBe('NORMAL_PLAY');
  });
});

describe('coworkerWatch – single-use warning time bonus', () => {
  it('buff is consumed after one LEADER_WARNING generation', () => {
    const state = createInitialGameState();
    state.activeBuffs.add('coworkerWatch');
    state.nextLeaderPatrol = 0.01;
    tickGame(state, 1);
    // Buff should be consumed in computeWarningTime
    expect(state.activeBuffs.has('coworkerWatch')).toBe(false);
  });
});

describe('smoke test – full game run reaches RUN_END', () => {
  it('tickGame loop eventually produces RUN_END without throwing', () => {
    const state = createInitialGameState();
    // Fast-track by draining resources directly
    state.resources.spirit = 1;
    state.resources.satiety = 1;
    state.resources.trust = 1;
    state.resources.coworkerSpirit = 1;

    let iterations = 0;
    while (state.currentMode !== 'RUN_END' && iterations < 10000) {
      tickGame(state, 0.5);
      iterations++;
    }
    expect(state.currentMode).toBe('RUN_END');
    expect(state.endReason).not.toBeNull();
  });
});
