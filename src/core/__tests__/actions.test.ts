import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialGameState } from '../state';
import { applyAction } from '../actions';
import { getAction } from '../config';
import type { GameState } from '../types';

function freshState(): GameState {
  return createInitialGameState();
}

describe('applyAction – all 10 actions delta/danger/buff consistency', () => {
  it('switch_safe_work: delta matches, clears unsafe_screen', () => {
    const state = freshState();
    state.currentMode = 'COMPUTER_PANEL';
    state.activeDangers.add('unsafe_screen');
    const spiritBefore = state.resources.spirit;
    const trustBefore = state.resources.trust;
    const result = applyAction(state, 'switch_safe_work');
    expect(result.ok).toBe(true);
    const delta = getAction('switch_safe_work').delta as Record<string, number>;
    expect(state.resources.spirit).toBeCloseTo(spiritBefore + delta.spirit, 5);
    expect(state.resources.trust).toBeCloseTo(trustBefore + delta.trust, 5);
    expect(state.activeDangers.has('unsafe_screen')).toBe(false);
  });

  it('open_fishing_page: delta matches, sets unsafe_screen', () => {
    const state = freshState();
    state.currentMode = 'COMPUTER_PANEL';
    const spiritBefore = state.resources.spirit;
    const trustBefore = state.resources.trust;
    const result = applyAction(state, 'open_fishing_page');
    expect(result.ok).toBe(true);
    const delta = getAction('open_fishing_page').delta as Record<string, number>;
    expect(state.resources.spirit).toBeCloseTo(spiritBefore + delta.spirit, 5);
    expect(state.resources.trust).toBeCloseTo(trustBefore + delta.trust, 5);
    expect(state.activeDangers.has('unsafe_screen')).toBe(true);
  });

  it('check_phone: delta matches, sets phone_lit', () => {
    const state = freshState();
    state.currentMode = 'NORMAL_PLAY';
    const result = applyAction(state, 'check_phone');
    expect(result.ok).toBe(true);
    expect(state.activeDangers.has('phone_lit')).toBe(true);
  });

  it('eat_takeout: delta matches, sets takeout_open', () => {
    const state = freshState();
    state.currentMode = 'NORMAL_PLAY';
    const before = { ...state.resources };
    const result = applyAction(state, 'eat_takeout');
    expect(result.ok).toBe(true);
    expect(state.activeDangers.has('takeout_open')).toBe(true);
    const delta = getAction('eat_takeout').delta as Record<string, number>;
    expect(state.resources.satiety).toBeCloseTo(before.satiety + delta.satiety, 5);
  });

  it('drink_coffee: delta matches, no danger changes', () => {
    const state = freshState();
    state.currentMode = 'NORMAL_PLAY';
    const spiritBefore = state.resources.spirit;
    const result = applyAction(state, 'drink_coffee');
    expect(result.ok).toBe(true);
    const delta = getAction('drink_coffee').delta as Record<string, number>;
    expect(state.resources.spirit).toBeCloseTo(spiritBefore + delta.spirit, 5);
    expect(state.activeDangers.size).toBe(0);
  });

  it('organize_work_trace: clears desk_empty, resets workTrace timer', () => {
    const state = freshState();
    state.currentMode = 'NORMAL_PLAY';
    state.activeDangers.add('desk_empty');
    state.workTraceTimer = 15;
    const result = applyAction(state, 'organize_work_trace');
    expect(result.ok).toBe(true);
    expect(state.activeDangers.has('desk_empty')).toBe(false);
    expect(state.workTraceTimer).toBe(0);
  });

  it('coworker_watch: sets coworkerWatch buff, reduces coworkerSpirit', () => {
    const state = freshState();
    state.currentMode = 'COWORKER_MENU';
    const before = state.resources.coworkerSpirit;
    const result = applyAction(state, 'coworker_watch');
    expect(result.ok).toBe(true);
    expect(state.activeBuffs.has('coworkerWatch')).toBe(true);
    const delta = getAction('coworker_watch').delta as Record<string, number>;
    expect(state.resources.coworkerSpirit).toBeCloseTo(before + delta.coworkerSpirit, 5);
  });

  it('coworker_rescue: sets coworkerRescue buff', () => {
    const state = freshState();
    state.currentMode = 'COWORKER_MENU';
    const result = applyAction(state, 'coworker_rescue');
    expect(result.ok).toBe(true);
    expect(state.activeBuffs.has('coworkerRescue')).toBe(true);
  });

  it('coworker_complain: delta matches', () => {
    const state = freshState();
    state.currentMode = 'COWORKER_MENU';
    const spiritBefore = state.resources.spirit;
    const result = applyAction(state, 'coworker_complain');
    expect(result.ok).toBe(true);
    const delta = getAction('coworker_complain').delta as Record<string, number>;
    expect(state.resources.spirit).toBeCloseTo(spiritBefore + delta.spirit, 5);
  });

  it('coworker_comfort: delta matches', () => {
    const state = freshState();
    state.currentMode = 'COWORKER_MENU';
    const csBefore = state.resources.coworkerSpirit;
    const result = applyAction(state, 'coworker_comfort');
    expect(result.ok).toBe(true);
    const delta = getAction('coworker_comfort').delta as Record<string, number>;
    expect(state.resources.coworkerSpirit).toBeCloseTo(csBefore + delta.coworkerSpirit, 5);
  });
});

describe('applyAction – allowedModes guard', () => {
  it('COMPUTER_PANEL action rejected in NORMAL_PLAY', () => {
    const state = freshState();
    state.currentMode = 'NORMAL_PLAY';
    const result = applyAction(state, 'switch_safe_work');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not allowed/i);
  });

  it('NORMAL_PLAY action rejected in COMPUTER_PANEL', () => {
    const state = freshState();
    state.currentMode = 'COMPUTER_PANEL';
    const result = applyAction(state, 'check_phone');
    expect(result.ok).toBe(false);
  });

  it('COWORKER_MENU action rejected in NORMAL_PLAY', () => {
    const state = freshState();
    state.currentMode = 'NORMAL_PLAY';
    const result = applyAction(state, 'coworker_watch');
    expect(result.ok).toBe(false);
  });

  it('NORMAL_PLAY action allowed in NORMAL_PLAY', () => {
    const state = freshState();
    state.currentMode = 'NORMAL_PLAY';
    const result = applyAction(state, 'drink_coffee');
    expect(result.ok).toBe(true);
  });
});

describe('applyAction – feedbackText', () => {
  it('returns non-empty feedback on success', () => {
    const state = freshState();
    state.currentMode = 'NORMAL_PLAY';
    const result = applyAction(state, 'drink_coffee');
    expect(result.feedbackText.length).toBeGreaterThan(0);
  });
});
