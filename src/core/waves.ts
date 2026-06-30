import type { GameState } from './types';
import { wavesData, coworkerWatchEffect } from './config';

export interface WaveConfig {
  patrolInterval: number;
  warningTime: number;
  qteSteps: number;
}

export function getCurrentWaveConfig(wave: number): WaveConfig {
  if (wave >= 1 && wave <= 5) {
    const fixed = wavesData.fixedWaves[wave - 1];
    return {
      patrolInterval: fixed.patrolInterval,
      warningTime: fixed.warningTime,
      qteSteps: fixed.qteSteps,
    };
  }
  const w6 = wavesData.wave6Plus;
  return {
    patrolInterval: w6.patrolIntervalMin,
    warningTime: w6.warningTimeMin,
    qteSteps: w6.qteStepsMin,
  };
}

export function computeWarningTime(state: GameState, base: number): number {
  if (state.activeBuffs.has('coworkerWatch')) {
    const bonus = coworkerWatchEffect.warningTimeBonusMin;
    state.activeBuffs.delete('coworkerWatch');
    return base + bonus;
  }
  return base;
}
