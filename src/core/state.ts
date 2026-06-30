import type { GameState, ResourceId, EndReason } from './types';
import { getResource } from './config';
import { applyDecay } from './resources';
import { tickWorkTrace } from './dangers';
import { getCurrentWaveConfig, computeWarningTime } from './waves';
import { generateQteSteps, applyQteFail } from './qte';

export function createInitialGameState(): GameState {
  const wave = 1;
  const waveCfg = getCurrentWaveConfig(wave);
  return {
    currentMode: 'NORMAL_PLAY',
    wave,
    runTime: 0,
    resources: {
      spirit: getResource('spirit').initialValue,
      satiety: getResource('satiety').initialValue,
      trust: getResource('trust').initialValue,
      coworkerSpirit: getResource('coworkerSpirit').initialValue,
    },
    activeDangers: new Set(),
    activeBuffs: new Set(),
    qteSteps: [],
    qteStepIndex: 0,
    qteRemaining: 0,
    nextLeaderPatrol: waveCfg.patrolInterval,
    leaderWarningRemaining: 0,
    workTraceTimer: 0,
    safeWindow: 0,
    endReason: null,
  };
}

const END_CHECKS: [ResourceId, EndReason][] = [
  ['spirit', 'spirit_zero'],
  ['satiety', 'satiety_zero'],
  ['trust', 'trust_zero'],
  ['coworkerSpirit', 'coworkerSpirit_zero'],
];

export function checkRunEnd(state: GameState): void {
  if (state.currentMode === 'RUN_END') return;
  for (const [id, reason] of END_CHECKS) {
    if (state.resources[id] <= 0) {
      state.endReason = reason;
      state.currentMode = 'RUN_END';
      return;
    }
  }
}

export function tickGame(state: GameState, dt: number): void {
  if (state.currentMode === 'RUN_END' || state.currentMode === 'START') return;

  state.runTime += dt;
  applyDecay(state, dt);

  checkRunEnd(state);
  if (state.endReason !== null) return;

  if (state.safeWindow > 0) {
    state.safeWindow = Math.max(0, state.safeWindow - dt);
  }

  tickWorkTrace(state, dt);

  switch (state.currentMode) {
    case 'NORMAL_PLAY':
    case 'COMPUTER_PANEL':
    case 'COWORKER_MENU': {
      if (state.safeWindow <= 0) {
        state.nextLeaderPatrol = Math.max(0, state.nextLeaderPatrol - dt);
        if (state.nextLeaderPatrol <= 0) {
          const waveCfg = getCurrentWaveConfig(state.wave);
          const warningTime = computeWarningTime(state, waveCfg.warningTime);
          state.leaderWarningRemaining = warningTime;
          state.currentMode = 'LEADER_WARNING';
        }
      }
      break;
    }

    case 'LEADER_WARNING': {
      state.leaderWarningRemaining = Math.max(0, state.leaderWarningRemaining - dt);
      if (state.leaderWarningRemaining <= 0) {
        const waveCfg = getCurrentWaveConfig(state.wave);
        state.qteSteps = generateQteSteps(state, waveCfg.qteSteps);
        state.qteStepIndex = 0;
        state.qteRemaining = waveCfg.warningTime;
        state.currentMode = 'QTE_ACTIVE';
      }
      break;
    }

    case 'QTE_ACTIVE': {
      state.qteRemaining = Math.max(0, state.qteRemaining - dt);
      if (state.qteRemaining <= 0) {
        applyQteFail(state);
      }
      break;
    }

    case 'QTE_SUCCESS':
    case 'QTE_FAIL': {
      const waveCfg = getCurrentWaveConfig(state.wave);
      state.nextLeaderPatrol = waveCfg.patrolInterval;
      state.currentMode = 'NORMAL_PLAY';
      break;
    }
  }
}
