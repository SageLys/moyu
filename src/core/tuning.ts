/**
 * 调参 schema：把所有"游戏性相关数值"以统一的 get/set 访问器暴露出来，供内置调参面板
 * （src/ui/TuningPanel.ts）实时读写。所有 set 直接改动 config 的原始 JSON 对象（模块单例），
 * 因此 applyDecay / getCurrentWaveConfig / gameRules 等在下一 tick 就会读到新值（无需重启）。
 * 仅 initialValue 之类"开局才读"的字段需要点"重开一局"生效。
 *
 * 本文件不含任何玩法判定逻辑，只是数值的读写桥。数值本身仍归属各 data/*.json。
 */
import { resourcesRaw, wavesData, gameRules } from './config';

export interface TunableField {
  label: string;
  get: () => number;
  set: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  /** 该字段是否需要"重开一局"才生效（如开局初始值）。 */
  restart?: boolean;
}

export interface TunableSection {
  title: string;
  note?: string;
  fields: TunableField[];
}

// 以 any 视图操作原始 JSON 对象，避免 JSON 字面量类型对赋值造成的 TS 摩擦。
const R = (resourcesRaw as unknown as { resources: Record<string, Record<string, number>> })
  .resources;
const W = wavesData as unknown as {
  fixedWaves: Array<Record<string, number>>;
  wave6Plus: Record<string, number>;
};
const G = gameRules as unknown as {
  workTrace: Record<string, number>;
  feedback: { resourceBands: Record<string, number>; coworkerBands: Record<string, number> };
};

/** 模块加载时深拷贝一份默认值，用于"恢复默认"。 */
const DEFAULTS = JSON.stringify({ R, W, G });

function f(
  label: string,
  obj: Record<string, number>,
  prop: string,
  step: number,
  opts: Partial<Pick<TunableField, 'min' | 'max' | 'restart'>> = {},
): TunableField {
  return {
    label,
    get: () => obj[prop],
    set: (v: number) => {
      obj[prop] = v;
    },
    step,
    ...opts,
  };
}

const RES_IDS: Array<[string, string]> = [
  ['spirit', '精神'],
  ['satiety', '饱腹'],
  ['trust', '信任'],
  ['coworkerSpirit', '同事精神(隐藏)'],
];

export function buildTuningSections(): TunableSection[] {
  const sections: TunableSection[] = [];

  // ── 资源 ────────────────────────────────────────────────────────────────
  const resFields: TunableField[] = [];
  for (const [id, name] of RES_IDS) {
    resFields.push(
      f(`${name} 每秒衰减`, R[id], 'baseDeltaPerSecond', 0.05, { min: -5, max: 0 }),
    );
    resFields.push(
      f(`${name} 开局值`, R[id], 'initialValue', 1, { min: 0, max: 100, restart: true }),
    );
  }
  sections.push({
    title: '资源衰减 / 开局值',
    note: '衰减率即时生效；开局值需"重开一局"生效。',
    fields: resFields,
  });

  // ── 波次时序 ──────────────────────────────────────────────────────────────
  const waveFields: TunableField[] = [];
  W.fixedWaves.forEach((wv, i) => {
    const n = i + 1;
    waveFields.push(f(`第${n}波 巡查间隔s`, wv, 'patrolInterval', 1, { min: 1, max: 120 }));
    waveFields.push(f(`第${n}波 预警/宽限s`, wv, 'warningTime', 0.5, { min: 1, max: 30 }));
    waveFields.push(f(`第${n}波 QTE步数`, wv, 'qteSteps', 1, { min: 1, max: 6 }));
  });
  waveFields.push(f('第6波+ 巡查min', W.wave6Plus, 'patrolIntervalMin', 1, { min: 1, max: 120 }));
  waveFields.push(f('第6波+ 巡查max', W.wave6Plus, 'patrolIntervalMax', 1, { min: 1, max: 120 }));
  waveFields.push(f('第6波+ 预警min', W.wave6Plus, 'warningTimeMin', 0.5, { min: 1, max: 30 }));
  waveFields.push(f('第6波+ 预警max', W.wave6Plus, 'warningTimeMax', 0.5, { min: 1, max: 30 }));
  sections.push({ title: '领导波次时序', fields: waveFields });

  // ── gameRules ────────────────────────────────────────────────────────────
  const ruleFields: TunableField[] = [
    f('工位太空 阈值s', G.workTrace, 'baseThresholdSeconds', 1, { min: 3, max: 120 }),
    f('工位太空 最低阈值s', G.workTrace, 'minThresholdSeconds', 1, { min: 3, max: 120 }),
    f('资源"下降"档 阈值', G.feedback.resourceBands, 'droppingBelow', 1, { min: 0, max: 100 }),
    f('资源"危险"档 阈值', G.feedback.resourceBands, 'criticalBelow', 1, { min: 0, max: 100 }),
    f('同事"中"档 阈值', G.feedback.coworkerBands, 'mediumAtOrAbove', 1, { min: 0, max: 100 }),
    f('同事"高"档 阈值', G.feedback.coworkerBands, 'highAtOrAbove', 1, { min: 0, max: 100 }),
  ];
  sections.push({ title: '规则阈值 (gameRules)', fields: ruleFields });

  return sections;
}

/** 把当前数值恢复为模块加载时的默认（本次会话内的原始 data/*.json 值）。 */
export function resetTuningToDefaults(): void {
  const def = JSON.parse(DEFAULTS) as { R: typeof R; W: typeof W; G: typeof G };
  Object.assign(R.spirit, def.R.spirit);
  Object.assign(R.satiety, def.R.satiety);
  Object.assign(R.trust, def.R.trust);
  Object.assign(R.coworkerSpirit, def.R.coworkerSpirit);
  def.W.fixedWaves.forEach((wv, i) => Object.assign(W.fixedWaves[i], wv));
  Object.assign(W.wave6Plus, def.W.wave6Plus);
  Object.assign(G.workTrace, def.G.workTrace);
  Object.assign(G.feedback.resourceBands, def.G.feedback.resourceBands);
  Object.assign(G.feedback.coworkerBands, def.G.feedback.coworkerBands);
}

/** 导出当前已调数值，便于回填到 data/*.json。 */
export function exportTunedJson(): string {
  return JSON.stringify(
    {
      'resources.json': resourcesRaw,
      'waves.json': wavesData,
      'gameRules.json': gameRules,
    },
    null,
    2,
  );
}
