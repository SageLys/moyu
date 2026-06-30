import type { GameState, ActionId, DangerId, BuffId, ResourceId } from './types';
import { getAction } from './config';
import { applyDelta } from './resources';
import { setDanger, clearDanger, resetWorkTrace } from './dangers';
import { pickFeedback } from './text';

export interface ActionResult {
  ok: boolean;
  reason?: string;
  feedbackText: string;
}

export function applyAction(state: GameState, actionId: ActionId): ActionResult {
  const action = getAction(actionId);
  if (!action) {
    return { ok: false, reason: `unknown action: ${actionId}`, feedbackText: '' };
  }

  if (!action.allowedModes.includes(state.currentMode)) {
    return {
      ok: false,
      reason: `${actionId} not allowed in mode ${state.currentMode}`,
      feedbackText: '',
    };
  }

  applyDelta(state, action.delta as Partial<Record<ResourceId, number>>);

  for (const d of action.setDanger) {
    setDanger(state, d as DangerId);
  }
  for (const d of action.clearDanger) {
    clearDanger(state, d as DangerId);
  }

  for (const b of action.setBuff) {
    state.activeBuffs.add(b as BuffId);
  }
  for (const b of action.clearBuff) {
    state.activeBuffs.delete(b as BuffId);
  }

  if (actionId === 'switch_safe_work' || actionId === 'organize_work_trace') {
    resetWorkTrace(state);
  }

  const feedbackText = pickFeedback(action.feedbackTextKeys);
  return { ok: true, feedbackText };
}
