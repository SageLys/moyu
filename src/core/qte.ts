import type { GameState, QteStep, QteStepId, ObjectId, DangerId, ResourceId } from './types';
import { qteRules, qteOutcome, coworkerRescueEffect, getDanger, getQteStep } from './config';
import { applyDelta } from './resources';
import { clearDanger, listActiveDangersByPriority, canUseBodySlackFiller } from './dangers';
import { resolveCopyText } from './text';
import { getCurrentWaveConfig } from './waves';

export interface QteClickResult {
  hit: boolean;
  complete: boolean;
  feedbackText: string;
}

export function generateQteSteps(state: GameState, stepCount: number): QteStep[] {
  const steps: QteStep[] = [];
  const usedStepIds = new Set<QteStepId>();

  const activeDangers = listActiveDangersByPriority(state);

  for (const dangerId of activeDangers) {
    if (steps.length >= stepCount) break;
    const danger = getDanger(dangerId);
    if (!danger) continue;

    for (const rawStepId of danger.qteStepId) {
      if (steps.length >= stepCount) break;
      const stepId = rawStepId as QteStepId;
      if (usedStepIds.has(stepId)) continue;

      const stepCfg = getQteStep(stepId);
      if (!stepCfg) continue;

      usedStepIds.add(stepId);
      steps.push({
        stepId,
        targetObjectId: stepCfg.targetObjectId as ObjectId,
        clearsDanger: stepCfg.clearsDanger as DangerId,
      });
    }
  }

  if (steps.length < stepCount && canUseBodySlackFiller(state)) {
    const fillerIds = qteRules.fillerSteps as QteStepId[];
    for (const stepId of fillerIds) {
      if (steps.length >= stepCount) break;
      if (usedStepIds.has(stepId)) continue;
      const stepCfg = getQteStep(stepId);
      if (!stepCfg) continue;
      usedStepIds.add(stepId);
      steps.push({
        stepId,
        targetObjectId: stepCfg.targetObjectId as ObjectId,
        clearsDanger: stepCfg.clearsDanger as DangerId,
      });
    }
  }

  return steps;
}

export function applyQteStepClick(state: GameState, clickedObjectId: ObjectId): QteClickResult {
  // 收拾点击在"宽限窗口(LEADER_WARNING)"与"严格 QTE(QTE_ACTIVE)"两个阶段都受理。
  if (state.currentMode !== 'QTE_ACTIVE' && state.currentMode !== 'LEADER_WARNING') {
    return { hit: false, complete: false, feedbackText: '' };
  }

  const currentStep = state.qteSteps[state.qteStepIndex];
  if (!currentStep) return { hit: false, complete: false, feedbackText: '' };

  if (clickedObjectId === currentStep.targetObjectId) {
    if (currentStep.clearsDanger) {
      clearDanger(state, currentStep.clearsDanger);
    }
    state.qteStepIndex++;

    const stepCfg = getQteStep(currentStep.stepId);
    const resolved = resolveCopyText(stepCfg.successTextKey);
    const feedbackText = Array.isArray(resolved) ? resolved[0] : (resolved ?? '');

    const complete = state.qteStepIndex >= state.qteSteps.length;
    if (complete) {
      applyQteSuccess(state);
    }
    return { hit: true, complete, feedbackText };
  } else {
    // 错点扣减当前阶段的倒计时（宽限期扣 leaderWarningRemaining，严格期扣 qteRemaining）。
    const penalty = qteRules.wrongClickPenaltySeconds;
    if (state.currentMode === 'LEADER_WARNING') {
      state.leaderWarningRemaining = Math.max(0, state.leaderWarningRemaining - penalty);
    } else {
      state.qteRemaining = Math.max(0, state.qteRemaining - penalty);
    }
    const stepCfg = getQteStep(currentStep.stepId);
    const wrongKey = stepCfg.wrongTextKeys[0] ?? '';
    const resolved = resolveCopyText(wrongKey);
    const feedbackText = Array.isArray(resolved) ? resolved[0] : (resolved ?? '');
    return { hit: false, complete: false, feedbackText };
  }
}

export function applyQteSuccess(state: GameState): void {
  applyDelta(state, qteOutcome.success.delta as Partial<Record<ResourceId, number>>);
  state.safeWindow = qteOutcome.success.safeWindowSeconds;
  state.wave += 1;
  state.currentMode = 'QTE_SUCCESS';
  _resetPatrol(state);
}

export function applyQteFail(state: GameState): void {
  if (state.activeBuffs.has('coworkerRescue')) {
    const merged = {
      ...(qteOutcome.fail.delta as Record<string, number>),
      ...(coworkerRescueEffect.overrideFailDelta as Record<string, number>),
    } as Partial<Record<ResourceId, number>>;
    applyDelta(state, merged);
    state.activeBuffs.delete('coworkerRescue');
  } else {
    applyDelta(state, qteOutcome.fail.delta as Partial<Record<ResourceId, number>>);
  }
  state.wave += 1;
  state.currentMode = 'QTE_FAIL';
  _resetPatrol(state);
}

function _resetPatrol(state: GameState): void {
  const waveCfg = getCurrentWaveConfig(state.wave);
  state.nextLeaderPatrol = waveCfg.patrolInterval;
}
