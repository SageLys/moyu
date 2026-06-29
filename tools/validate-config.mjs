#!/usr/bin/env node
/**
 * Zero-dependency config reference validator.
 * Loads src/assets.ts (regex key extraction) and src/data/*.json,
 * then asserts referential integrity and structural rules.
 * Exits 0 on full pass; exits 1 with collected error list on any failure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'src', 'data');
const assetsTsPath = path.join(__dirname, '..', 'src', 'assets.ts');

// ── Load data ────────────────────────────────────────────────────────────────

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf-8'));
}

const resources    = loadJson('resources.json').resources;
const actionsData  = loadJson('actions.json').actions;
const dangersData  = loadJson('dangers.json').dangers;
const qteData      = loadJson('qte.json');
const qteSteps     = qteData.qteSteps;
const wavesData    = loadJson('waves.json');
const copyText     = loadJson('copyText.json');
const sceneObjects = loadJson('sceneObjects.json').sceneObjects;
const visuals      = loadJson('visuals.json');
const gameRules    = loadJson('gameRules.json');

// ── Extract AssetPaths keys from .ts via regex (no TS compiler needed) ───────

const assetsTsContent = fs.readFileSync(assetsTsPath, 'utf-8');
const blockMatch = assetsTsContent.match(
  /export\s+const\s+AssetPaths\s*=\s*\{([\s\S]*?)\}\s*as\s+const/
);
if (!blockMatch) {
  console.error('FATAL: could not locate AssetPaths object in src/assets.ts');
  process.exit(1);
}
const assetKeys = new Set();
const keyLineRe = /^\s+([A-Za-z_]\w*)\s*:/gm;
let km;
while ((km = keyLineRe.exec(blockMatch[1])) !== null) {
  assetKeys.add(km[1]);
}

// ── Build id sets ────────────────────────────────────────────────────────────

const resourceIds   = new Set(Object.keys(resources));
const actionIds     = new Set(Object.keys(actionsData));
const dangerIds     = new Set(Object.keys(dangersData));
const sceneObjIds   = new Set(Object.keys(sceneObjects));
const qteStepIds    = new Set(Object.keys(qteSteps));
const validBuffs    = new Set(['coworkerWatch', 'coworkerRescue']);
const validModes    = new Set(['NORMAL_PLAY', 'COMPUTER_PANEL', 'COWORKER_MENU']);
const validQteObjs  = new Set(['computer', 'phone', 'takeout_box', 'files', 'protagonist', 'keyboard']);
const systemProducers = new Set(['workTraceTimer_timeout', 'qte_filler_generation']);

// ── Dot-path resolver for copyText ───────────────────────────────────────────

function resolveCopyText(dotPath) {
  const parts = dotPath.split('.');
  let cur = copyText;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      cur = cur[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

// ── Error collection ─────────────────────────────────────────────────────────

const errors = [];
function check(condition, message) {
  if (!condition) errors.push(message);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Referential integrity: actions
// ════════════════════════════════════════════════════════════════════════════

for (const [id, action] of Object.entries(actionsData)) {
  // 1-a  targetObjectId ∈ sceneObjects
  check(
    sceneObjIds.has(action.targetObjectId),
    `actions.${id}.targetObjectId="${action.targetObjectId}" not found in sceneObjects`
  );

  // 1-b  setDanger / clearDanger ∈ dangers
  for (const d of action.setDanger ?? []) {
    check(dangerIds.has(d), `actions.${id}.setDanger includes "${d}" which is not in dangers`);
  }
  for (const d of action.clearDanger ?? []) {
    check(dangerIds.has(d), `actions.${id}.clearDanger includes "${d}" which is not in dangers`);
  }

  // 1-c  setBuff / clearBuff ∈ validBuffs
  for (const b of action.setBuff ?? []) {
    check(validBuffs.has(b), `actions.${id}.setBuff includes "${b}" not in {coworkerWatch, coworkerRescue}`);
  }
  for (const b of action.clearBuff ?? []) {
    check(validBuffs.has(b), `actions.${id}.clearBuff includes "${b}" not in {coworkerWatch, coworkerRescue}`);
  }

  // 1-d  delta keys ∈ resources
  for (const key of Object.keys(action.delta ?? {})) {
    check(resourceIds.has(key), `actions.${id}.delta key "${key}" not in resources`);
  }

  // 1-e  hoverTextKey resolves
  if (action.hoverTextKey !== undefined) {
    check(
      resolveCopyText(action.hoverTextKey) !== undefined,
      `actions.${id}.hoverTextKey="${action.hoverTextKey}" unresolvable in copyText`
    );
  }

  // 1-f  feedbackTextKeys each resolve
  for (const key of action.feedbackTextKeys ?? []) {
    check(
      resolveCopyText(key) !== undefined,
      `actions.${id}.feedbackTextKeys includes "${key}" unresolvable in copyText`
    );
  }

  // 1-g  allowedModes ∈ validModes
  for (const mode of action.allowedModes ?? []) {
    check(validModes.has(mode), `actions.${id}.allowedModes includes "${mode}" not in valid mode set`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Referential integrity: dangers
// ════════════════════════════════════════════════════════════════════════════

for (const [id, danger] of Object.entries(dangersData)) {
  // 2-a  producedBy ∈ actions ∪ system symbols
  for (const p of danger.producedBy ?? []) {
    check(
      actionIds.has(p) || systemProducers.has(p),
      `dangers.${id}.producedBy includes "${p}" not in actions or system symbols {workTraceTimer_timeout, qte_filler_generation}`
    );
  }

  // 2-b  clearedBy ∈ actions
  for (const c of danger.clearedBy ?? []) {
    check(actionIds.has(c), `dangers.${id}.clearedBy includes "${c}" not in actions`);
  }

  // 2-c  qteStepId ∈ qteSteps
  for (const s of danger.qteStepId ?? []) {
    check(qteStepIds.has(s), `dangers.${id}.qteStepId includes "${s}" not in qteSteps`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Referential integrity: qteSteps
// ════════════════════════════════════════════════════════════════════════════

for (const [id, step] of Object.entries(qteSteps)) {
  // 3-a  targetObjectId ∈ valid QTE objects
  check(
    validQteObjs.has(step.targetObjectId),
    `qteSteps.${id}.targetObjectId="${step.targetObjectId}" not in {computer, phone, takeout_box, files, protagonist, keyboard}`
  );

  // 3-b  clearsDanger ∈ dangers
  check(
    dangerIds.has(step.clearsDanger),
    `qteSteps.${id}.clearsDanger="${step.clearsDanger}" not in dangers`
  );

  // 3-c  promptTextKey, successTextKey, wrongTextKeys each resolve
  check(
    resolveCopyText(step.promptTextKey) !== undefined,
    `qteSteps.${id}.promptTextKey="${step.promptTextKey}" unresolvable in copyText`
  );
  check(
    resolveCopyText(step.successTextKey) !== undefined,
    `qteSteps.${id}.successTextKey="${step.successTextKey}" unresolvable in copyText`
  );
  for (const key of step.wrongTextKeys ?? []) {
    check(
      resolveCopyText(key) !== undefined,
      `qteSteps.${id}.wrongTextKeys includes "${key}" unresolvable in copyText`
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Referential integrity: sceneObjects hoverTextKey
// ════════════════════════════════════════════════════════════════════════════

for (const [id, obj] of Object.entries(sceneObjects)) {
  if (obj.hoverTextKey !== undefined) {
    check(
      resolveCopyText(obj.hoverTextKey) !== undefined,
      `sceneObjects.${id}.hoverTextKey="${obj.hoverTextKey}" unresolvable in copyText`
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Referential integrity: visuals
// ════════════════════════════════════════════════════════════════════════════

// 5-a  objectVisuals: objId ∈ sceneObjects; each assetId ∈ AssetPaths
for (const [objId, states] of Object.entries(visuals.objectVisuals ?? {})) {
  check(
    sceneObjIds.has(objId),
    `visuals.objectVisuals["${objId}"] id not in sceneObjects`
  );
  for (const [state, assetId] of Object.entries(states)) {
    check(
      assetKeys.has(assetId),
      `visuals.objectVisuals["${objId}"]["${state}"]="${assetId}" not in AssetPaths keys`
    );
  }
}

// 5-b  dangerOverlays: key ∈ dangers.visualState values; value ∈ AssetPaths
const dangerVisualStates = new Set(Object.values(dangersData).map(d => d.visualState));
for (const [key, assetId] of Object.entries(visuals.dangerOverlays ?? {})) {
  check(
    dangerVisualStates.has(key),
    `visuals.dangerOverlays key "${key}" not found in any danger's visualState`
  );
  check(
    assetKeys.has(assetId),
    `visuals.dangerOverlays["${key}"]="${assetId}" not in AssetPaths keys`
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Buff consumesBuff references
// ════════════════════════════════════════════════════════════════════════════

check(
  validBuffs.has(wavesData.coworkerWatchEffect?.consumesBuff),
  `waves.coworkerWatchEffect.consumesBuff="${wavesData.coworkerWatchEffect?.consumesBuff}" not in buff set`
);
check(
  validBuffs.has(qteData.coworkerRescueEffect?.consumesBuff),
  `qte.coworkerRescueEffect.consumesBuff="${qteData.coworkerRescueEffect?.consumesBuff}" not in buff set`
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7 — Structural closure
// ════════════════════════════════════════════════════════════════════════════

// 7-a  Every buff set by actions must have a consumer
const allSetBuffs = new Set();
for (const action of Object.values(actionsData)) {
  for (const b of action.setBuff ?? []) allSetBuffs.add(b);
}
const buffConsumerMap = {
  coworkerWatch:   wavesData.coworkerWatchEffect?.consumesBuff,
  coworkerRescue:  qteData.coworkerRescueEffect?.consumesBuff,
};
for (const buff of allSetBuffs) {
  check(
    buffConsumerMap[buff] === buff,
    `Buff "${buff}" is set by actions but has no matching consumer`
  );
}

// 7-b  qte.qteOutcome.success / fail exist; delta keys ∈ resources
check(qteData.qteOutcome?.success !== undefined, 'qte.qteOutcome.success is missing');
check(qteData.qteOutcome?.fail    !== undefined, 'qte.qteOutcome.fail is missing');
for (const key of Object.keys(qteData.qteOutcome?.success?.delta ?? {})) {
  check(resourceIds.has(key), `qte.qteOutcome.success.delta key "${key}" not in resources`);
}
for (const key of Object.keys(qteData.qteOutcome?.fail?.delta ?? {})) {
  check(resourceIds.has(key), `qte.qteOutcome.fail.delta key "${key}" not in resources`);
}

// 7-c  gameRules.workTrace / gameRules.bodySlack exist
check(gameRules.workTrace  !== undefined, 'gameRules.workTrace is missing');
check(gameRules.bodySlack  !== undefined, 'gameRules.bodySlack is missing');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8 — copyText leaf type rules
// ════════════════════════════════════════════════════════════════════════════

// 8-a  hoverTexts.objects.* and hoverTexts.actions.* must be string at leaf
function checkLeafStrings(obj, prefix) {
  for (const [key, val] of Object.entries(obj)) {
    const loc = `${prefix}.${key}`;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      checkLeafStrings(val, loc);
    } else {
      check(
        typeof val === 'string',
        `copyText ${loc} must be string, got ${Array.isArray(val) ? 'array' : typeof val}`
      );
    }
  }
}

// 8-b  Other sections: leaf nodes must be string[]
function checkLeafStringArrays(obj, prefix) {
  for (const [key, val] of Object.entries(obj)) {
    const loc = `${prefix}.${key}`;
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        check(
          typeof item === 'string',
          `copyText ${loc}[${i}] must be string, got ${typeof item}`
        );
      });
    } else if (val !== null && typeof val === 'object') {
      checkLeafStringArrays(val, loc);
    } else {
      check(false, `copyText ${loc} must be string[], got ${typeof val}`);
    }
  }
}

checkLeafStrings(copyText.hoverTexts?.objects ?? {}, 'hoverTexts.objects');
checkLeafStrings(copyText.hoverTexts?.actions ?? {}, 'hoverTexts.actions');

const stringArraySections = [
  'actionFeedbacks', 'qtePrompts', 'qteSuccess', 'qteWrong',
  'resourceWarnings', 'coworkerHints', 'endTexts', 'systemMessages',
];
for (const section of stringArraySections) {
  if (copyText[section] !== undefined) {
    checkLeafStringArrays(copyText[section], section);
  } else {
    errors.push(`copyText.${section} section is missing`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9 — Hard constraints
// ════════════════════════════════════════════════════════════════════════════

// 9-a  leader must not be clickable in normal or QTE
const leader = sceneObjects.leader;
if (leader === undefined) {
  errors.push('sceneObjects.leader is missing');
} else {
  check(
    leader.clickableInNormal === false,
    `sceneObjects.leader.clickableInNormal must be false, got ${leader.clickableInNormal}`
  );
  check(
    leader.clickableInQte === false,
    `sceneObjects.leader.clickableInQte must be false, got ${leader.clickableInQte}`
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Result
// ════════════════════════════════════════════════════════════════════════════

if (errors.length > 0) {
  console.error(`CONFIG VALIDATION FAILED (${errors.length} error${errors.length > 1 ? 's' : ''}):`);
  errors.forEach((e, i) => console.error(`  [${i + 1}] ${e}`));
  process.exit(1);
} else {
  console.log('CONFIG VALIDATION PASSED');
  process.exit(0);
}
