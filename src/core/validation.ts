import { actionsRaw, dangersRaw, resourcesRaw } from './config';
import { qteSteps, qteRules, qteOutcome, coworkerWatchEffect, coworkerRescueEffect, gameRules, wavesData } from './config';
import { resolveCopyText } from './text';

const VALID_BUFFS = new Set(['coworkerWatch', 'coworkerRescue']);
const VALID_MODES = new Set(['NORMAL_PLAY', 'COMPUTER_PANEL', 'COWORKER_MENU']);
const VALID_QTE_OBJS = new Set(['computer', 'phone', 'takeout_box', 'files', 'protagonist', 'keyboard']);
const SYSTEM_PRODUCERS = new Set(['workTraceTimer_timeout', 'qte_filler_generation']);

export function validateConfigReferences(): string[] {
  const errors: string[] = [];
  const check = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

  const resourceIds = new Set(Object.keys(resourcesRaw.resources));
  const actionIds = new Set(Object.keys(actionsRaw.actions));
  const dangerIds = new Set(Object.keys(dangersRaw.dangers));
  const qteStepIds = new Set(Object.keys(qteSteps));

  // Actions
  for (const [id, action] of Object.entries(actionsRaw.actions)) {
    for (const d of action.setDanger) {
      check(dangerIds.has(d), `actions.${id}.setDanger "${d}" not in dangers`);
    }
    for (const d of action.clearDanger) {
      check(dangerIds.has(d), `actions.${id}.clearDanger "${d}" not in dangers`);
    }
    for (const b of action.setBuff) {
      check(VALID_BUFFS.has(b), `actions.${id}.setBuff "${b}" not valid`);
    }
    for (const b of action.clearBuff) {
      check(VALID_BUFFS.has(b), `actions.${id}.clearBuff "${b}" not valid`);
    }
    for (const k of Object.keys(action.delta)) {
      check(resourceIds.has(k), `actions.${id}.delta key "${k}" not in resources`);
    }
    for (const m of action.allowedModes) {
      check(VALID_MODES.has(m), `actions.${id}.allowedModes "${m}" not valid`);
    }
    for (const key of action.feedbackTextKeys) {
      check(resolveCopyText(key) !== undefined, `actions.${id}.feedbackTextKeys "${key}" unresolvable`);
    }
  }

  // Dangers
  for (const [id, danger] of Object.entries(dangersRaw.dangers)) {
    for (const p of danger.producedBy) {
      check(actionIds.has(p) || SYSTEM_PRODUCERS.has(p), `dangers.${id}.producedBy "${p}" not valid`);
    }
    for (const c of danger.clearedBy) {
      check(actionIds.has(c), `dangers.${id}.clearedBy "${c}" not in actions`);
    }
    for (const s of danger.qteStepId) {
      check(qteStepIds.has(s), `dangers.${id}.qteStepId "${s}" not in qteSteps`);
    }
  }

  // QTE steps
  for (const [id, step] of Object.entries(qteSteps)) {
    check(VALID_QTE_OBJS.has(step.targetObjectId), `qteSteps.${id}.targetObjectId "${step.targetObjectId}" not valid`);
    check(dangerIds.has(step.clearsDanger), `qteSteps.${id}.clearsDanger "${step.clearsDanger}" not in dangers`);
    check(resolveCopyText(step.promptTextKey) !== undefined, `qteSteps.${id}.promptTextKey unresolvable`);
    check(resolveCopyText(step.successTextKey) !== undefined, `qteSteps.${id}.successTextKey unresolvable`);
    for (const key of step.wrongTextKeys) {
      check(resolveCopyText(key) !== undefined, `qteSteps.${id}.wrongTextKeys "${key}" unresolvable`);
    }
  }

  // Buffs
  check(VALID_BUFFS.has(coworkerWatchEffect.consumesBuff), `coworkerWatchEffect.consumesBuff "${coworkerWatchEffect.consumesBuff}" not valid`);
  check(VALID_BUFFS.has(coworkerRescueEffect.consumesBuff), `coworkerRescueEffect.consumesBuff "${coworkerRescueEffect.consumesBuff}" not valid`);

  // QTE outcome deltas
  for (const k of Object.keys(qteOutcome.success.delta)) {
    check(resourceIds.has(k), `qteOutcome.success.delta key "${k}" not in resources`);
  }
  for (const k of Object.keys(qteOutcome.fail.delta)) {
    check(resourceIds.has(k), `qteOutcome.fail.delta key "${k}" not in resources`);
  }

  // Game rules
  check(gameRules.workTrace !== undefined, 'gameRules.workTrace missing');
  check(gameRules.bodySlack !== undefined, 'gameRules.bodySlack missing');

  // QTE rules filler
  for (const f of qteRules.fillerSteps) {
    check(qteStepIds.has(f), `qteRules.fillerSteps "${f}" not in qteSteps`);
  }

  // Wave data
  check(Array.isArray(wavesData.fixedWaves) && wavesData.fixedWaves.length > 0, 'wavesData.fixedWaves missing or empty');

  return errors;
}
