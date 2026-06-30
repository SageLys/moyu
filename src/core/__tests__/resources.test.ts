import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../state';
import { applyDecay, applyDelta, clamp } from '../resources';
import { getResource } from '../config';

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 100)).toBe(0));
  it('clamps above max', () => expect(clamp(150, 0, 100)).toBe(100));
  it('passes through middle value', () => expect(clamp(50, 0, 100)).toBe(50));
});

describe('createInitialGameState – resource initial values', () => {
  it('matches resources.json initial values', () => {
    const state = createInitialGameState();
    const ids = ['spirit', 'satiety', 'trust', 'coworkerSpirit'] as const;
    for (const id of ids) {
      const cfg = getResource(id);
      expect(state.resources[id]).toBe(cfg.initialValue);
    }
  });
});

describe('applyDecay', () => {
  it('decreases resources by baseDeltaPerSecond * dt', () => {
    const state = createInitialGameState();
    const before = { ...state.resources };
    applyDecay(state, 10);
    const ids = ['spirit', 'satiety', 'trust', 'coworkerSpirit'] as const;
    for (const id of ids) {
      const cfg = getResource(id);
      const expected = clamp(before[id] + cfg.baseDeltaPerSecond * 10, cfg.min, cfg.max);
      expect(state.resources[id]).toBeCloseTo(expected, 5);
    }
  });

  it('clamps at zero – large dt does not produce negative values', () => {
    const state = createInitialGameState();
    applyDecay(state, 10000);
    const ids = ['spirit', 'satiety', 'trust', 'coworkerSpirit'] as const;
    for (const id of ids) {
      expect(state.resources[id]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('applyDelta', () => {
  it('applies partial delta to specific resources', () => {
    const state = createInitialGameState();
    const before = state.resources.spirit;
    applyDelta(state, { spirit: 10 });
    const cfg = getResource('spirit');
    expect(state.resources.spirit).toBe(clamp(before + 10, cfg.min, cfg.max));
  });

  it('clamps above max', () => {
    const state = createInitialGameState();
    applyDelta(state, { spirit: 1000 });
    expect(state.resources.spirit).toBe(100);
  });

  it('clamps below min', () => {
    const state = createInitialGameState();
    applyDelta(state, { spirit: -1000 });
    expect(state.resources.spirit).toBe(0);
  });
});
