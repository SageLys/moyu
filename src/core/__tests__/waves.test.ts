import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../state';
import { getCurrentWaveConfig, computeWarningTime } from '../waves';
import { wavesData } from '../config';

describe('getCurrentWaveConfig – fixed waves 1–5', () => {
  it('wave 1 matches fixedWaves[0]', () => {
    const cfg = getCurrentWaveConfig(1);
    const fixed = wavesData.fixedWaves[0];
    expect(cfg.patrolInterval).toBe(fixed.patrolInterval);
    expect(cfg.warningTime).toBe(fixed.warningTime);
    expect(cfg.qteSteps).toBe(fixed.qteSteps);
  });

  it('wave 5 matches fixedWaves[4]', () => {
    const cfg = getCurrentWaveConfig(5);
    const fixed = wavesData.fixedWaves[4];
    expect(cfg.patrolInterval).toBe(fixed.patrolInterval);
    expect(cfg.warningTime).toBe(fixed.warningTime);
    expect(cfg.qteSteps).toBe(fixed.qteSteps);
  });
});

describe('getCurrentWaveConfig – wave 6+', () => {
  it('wave 6 uses wave6Plus range', () => {
    const cfg = getCurrentWaveConfig(6);
    const w6 = wavesData.wave6Plus;
    expect(cfg.patrolInterval).toBeGreaterThanOrEqual(w6.patrolIntervalMin);
    expect(cfg.patrolInterval).toBeLessThanOrEqual(w6.patrolIntervalMax);
    expect(cfg.warningTime).toBeGreaterThanOrEqual(w6.warningTimeMin);
    expect(cfg.warningTime).toBeLessThanOrEqual(w6.warningTimeMax);
    expect(cfg.qteSteps).toBeGreaterThanOrEqual(w6.qteStepsMin);
    expect(cfg.qteSteps).toBeLessThanOrEqual(w6.qteStepsMax);
  });

  it('wave 99 still within wave6Plus range', () => {
    const cfg = getCurrentWaveConfig(99);
    const w6 = wavesData.wave6Plus;
    expect(cfg.patrolInterval).toBeGreaterThanOrEqual(w6.patrolIntervalMin);
    expect(cfg.warningTime).toBeGreaterThanOrEqual(w6.warningTimeMin);
  });
});

describe('computeWarningTime', () => {
  it('returns base when no coworkerWatch buff', () => {
    const state = createInitialGameState();
    const result = computeWarningTime(state, 8);
    expect(result).toBe(8);
    expect(state.activeBuffs.has('coworkerWatch')).toBe(false);
  });

  it('adds bonus when coworkerWatch is active and consumes buff', () => {
    const state = createInitialGameState();
    state.activeBuffs.add('coworkerWatch');
    const bonus = wavesData.coworkerWatchEffect.warningTimeBonusMin;
    const result = computeWarningTime(state, 8);
    expect(result).toBeCloseTo(8 + bonus, 5);
    expect(state.activeBuffs.has('coworkerWatch')).toBe(false);
  });

  it('buff is consumed – second call gets no bonus', () => {
    const state = createInitialGameState();
    state.activeBuffs.add('coworkerWatch');
    computeWarningTime(state, 8);
    const result = computeWarningTime(state, 8);
    expect(result).toBe(8);
  });
});
