import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../state';
import {
  setDanger,
  clearDanger,
  hasDanger,
  listActiveDangersByPriority,
  getWorkTraceThreshold,
  tickWorkTrace,
  resetWorkTrace,
} from '../dangers';
import { gameRules } from '../config';
import { applyAction } from '../actions';

describe('setDanger / clearDanger / hasDanger', () => {
  it('sets a danger', () => {
    const state = createInitialGameState();
    setDanger(state, 'unsafe_screen');
    expect(hasDanger(state, 'unsafe_screen')).toBe(true);
  });

  it('clears a danger', () => {
    const state = createInitialGameState();
    setDanger(state, 'phone_lit');
    clearDanger(state, 'phone_lit');
    expect(hasDanger(state, 'phone_lit')).toBe(false);
  });

  it('clearing a non-existent danger is safe', () => {
    const state = createInitialGameState();
    expect(() => clearDanger(state, 'desk_empty')).not.toThrow();
  });
});

describe('listActiveDangersByPriority', () => {
  it('sorts dangers by priority ascending', () => {
    const state = createInitialGameState();
    setDanger(state, 'desk_empty');      // priority 4
    setDanger(state, 'phone_lit');       // priority 2
    setDanger(state, 'unsafe_screen');   // priority 1
    const sorted = listActiveDangersByPriority(state);
    expect(sorted[0]).toBe('unsafe_screen');
    expect(sorted[1]).toBe('phone_lit');
    expect(sorted[2]).toBe('desk_empty');
  });

  it('returns empty array when no dangers active', () => {
    const state = createInitialGameState();
    expect(listActiveDangersByPriority(state)).toEqual([]);
  });
});

describe('workTrace threshold', () => {
  const { baseThresholdSeconds, minThresholdSeconds, reducePerWaveAfter, reduceSecondsPerWave } =
    gameRules.workTrace;

  it('is baseThresholdSeconds for waves <= reducePerWaveAfter', () => {
    expect(getWorkTraceThreshold(1)).toBe(baseThresholdSeconds);
    expect(getWorkTraceThreshold(reducePerWaveAfter)).toBe(baseThresholdSeconds);
  });

  it('decreases by reduceSecondsPerWave per wave after threshold', () => {
    const wave = reducePerWaveAfter + 1;
    const expected = baseThresholdSeconds - reduceSecondsPerWave;
    expect(getWorkTraceThreshold(wave)).toBe(expected);
  });

  it('never goes below minThresholdSeconds', () => {
    expect(getWorkTraceThreshold(999)).toBe(minThresholdSeconds);
  });

  it('threshold at wave 4 is baseThreshold - 1', () => {
    expect(getWorkTraceThreshold(4)).toBe(baseThresholdSeconds - reduceSecondsPerWave);
  });
});

describe('tickWorkTrace', () => {
  it('produces desk_empty after threshold seconds', () => {
    const state = createInitialGameState();
    const threshold = getWorkTraceThreshold(state.wave);
    tickWorkTrace(state, threshold);
    expect(hasDanger(state, 'desk_empty')).toBe(true);
  });

  it('does not produce desk_empty before threshold', () => {
    const state = createInitialGameState();
    const threshold = getWorkTraceThreshold(state.wave);
    tickWorkTrace(state, threshold - 1);
    expect(hasDanger(state, 'desk_empty')).toBe(false);
  });
});

describe('resetWorkTrace via actions', () => {
  it('switch_safe_work resets workTraceTimer', () => {
    const state = createInitialGameState();
    state.currentMode = 'COMPUTER_PANEL';
    state.workTraceTimer = 15;
    applyAction(state, 'switch_safe_work');
    expect(state.workTraceTimer).toBe(0);
  });

  it('organize_work_trace resets workTraceTimer', () => {
    const state = createInitialGameState();
    state.currentMode = 'NORMAL_PLAY';
    state.workTraceTimer = 18;
    applyAction(state, 'organize_work_trace');
    expect(state.workTraceTimer).toBe(0);
  });
});

describe('resetWorkTrace', () => {
  it('resets timer to 0', () => {
    const state = createInitialGameState();
    state.workTraceTimer = 99;
    resetWorkTrace(state);
    expect(state.workTraceTimer).toBe(0);
  });
});
