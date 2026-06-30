import actionsRaw from '../data/actions.json';
import dangersRaw from '../data/dangers.json';
import resourcesRaw from '../data/resources.json';
import wavesRaw from '../data/waves.json';
import qteRaw from '../data/qte.json';
import gameRulesRaw from '../data/gameRules.json';
import copyTextRaw from '../data/copyText.json';
import sceneObjectsRaw from '../data/sceneObjects.json';
import visualsRaw from '../data/visuals.json';

import type { ActionId, DangerId, ResourceId, QteStepId } from './types';

// Direct data exports
export const wavesData = wavesRaw;
export const qteSteps = qteRaw.qteSteps;
export const qteRules = qteRaw.qteRules;
export const qteOutcome = qteRaw.qteOutcome;
export const gameRules = gameRulesRaw;
export const coworkerWatchEffect = wavesRaw.coworkerWatchEffect;
export const coworkerRescueEffect = qteRaw.coworkerRescueEffect;
export const copyText = copyTextRaw;
export const sceneObjects = sceneObjectsRaw.sceneObjects;
export const visuals = visualsRaw;

// Typed accessors
type ActionsMap = typeof actionsRaw.actions;
type ActionConfig = ActionsMap[keyof ActionsMap];

export function getAction(id: ActionId): ActionConfig {
  return (actionsRaw.actions as Record<string, ActionConfig>)[id];
}

type DangersMap = typeof dangersRaw.dangers;
type DangerConfig = DangersMap[keyof DangersMap];

export function getDanger(id: DangerId): DangerConfig {
  return (dangersRaw.dangers as Record<string, DangerConfig>)[id];
}

type ResourcesMap = typeof resourcesRaw.resources;
type ResourceConfig = ResourcesMap[keyof ResourcesMap];

export function getResource(id: ResourceId): ResourceConfig {
  return (resourcesRaw.resources as Record<string, ResourceConfig>)[id];
}

type QteStepsMap = typeof qteRaw.qteSteps;
type QteStepConfig = QteStepsMap[keyof QteStepsMap];

export function getQteStep(id: QteStepId): QteStepConfig {
  return (qteRaw.qteSteps as Record<string, QteStepConfig>)[id];
}

export { actionsRaw, dangersRaw, resourcesRaw };
