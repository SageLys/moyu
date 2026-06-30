import type { GameState, DangerId } from './types';
import { getDanger, gameRules } from './config';

export function setDanger(state: GameState, id: DangerId): void {
  state.activeDangers.add(id);
}

export function clearDanger(state: GameState, id: DangerId): void {
  state.activeDangers.delete(id);
}

export function hasDanger(state: GameState, id: DangerId): boolean {
  return state.activeDangers.has(id);
}

export function listActiveDangersByPriority(state: GameState): DangerId[] {
  return [...state.activeDangers].sort((a, b) => {
    const pa = getDanger(a)?.priority ?? 999;
    const pb = getDanger(b)?.priority ?? 999;
    return pa - pb;
  });
}

export function getWorkTraceThreshold(wave: number): number {
  const { baseThresholdSeconds, minThresholdSeconds, reducePerWaveAfter, reduceSecondsPerWave } =
    gameRules.workTrace;
  const reduction = Math.max(0, wave - reducePerWaveAfter) * reduceSecondsPerWave;
  return Math.max(minThresholdSeconds, baseThresholdSeconds - reduction);
}

export function tickWorkTrace(state: GameState, dt: number): void {
  if (state.currentMode === 'RUN_END' || state.currentMode === 'START') return;
  // 预警 / QTE 期间冻结工作痕迹计时：避免 QTE 进行中凭空生成 desk_empty
  // （步骤已在进入 QTE 时一次性生成，中途新增危险只会留下无步骤的标记）。
  if (state.currentMode === 'LEADER_WARNING' || state.currentMode === 'QTE_ACTIVE') return;
  state.workTraceTimer += dt;
  const threshold = getWorkTraceThreshold(state.wave);
  if (state.workTraceTimer >= threshold) {
    setDanger(state, 'desk_empty');
  }
}

export function resetWorkTrace(state: GameState): void {
  state.workTraceTimer = 0;
}

export function canUseBodySlackFiller(state: GameState): boolean {
  const { enableAsQteFiller, minWave } = gameRules.bodySlack;
  return enableAsQteFiller && state.wave >= minWave;
}
