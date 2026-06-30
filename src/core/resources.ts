import type { GameState, ResourceId } from './types';
import { getResource } from './config';

const ALL_RESOURCE_IDS: ResourceId[] = ['spirit', 'satiety', 'trust', 'coworkerSpirit'];

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function applyDelta(
  state: GameState,
  delta: Partial<Record<ResourceId, number>>,
): void {
  for (const key of ALL_RESOURCE_IDS) {
    const d = delta[key];
    if (d === undefined) continue;
    const cfg = getResource(key);
    state.resources[key] = clamp(state.resources[key] + d, cfg.min, cfg.max);
  }
}

export function applyDecay(state: GameState, dt: number): void {
  for (const id of ALL_RESOURCE_IDS) {
    const cfg = getResource(id);
    state.resources[id] = clamp(
      state.resources[id] + cfg.baseDeltaPerSecond * dt,
      cfg.min,
      cfg.max,
    );
  }
}
