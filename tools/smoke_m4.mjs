#!/usr/bin/env node
/**
 * M4 冒烟测试（可选）：领导巡查与 QTE 表现层接通 core 的端到端断言。
 *
 * 依赖 puppeteer（未安装则跳过并退出 0，不阻塞 CI）。
 * 前置：先在另一个终端启动 dev server（npm run dev），默认 http://localhost:5173。
 * 可用环境变量 PREVIEW_URL 覆盖。
 *
 * 时序确定性：通过 window.__game.setManualTick(true) 关闭 rAF 自动 tick，
 * 改用 window.__game.advance(seconds) 手动按固定步长推进 core，逐条断言：
 *   a) 制造真实危险后巡查 → QTE 步骤按 dangers.priority 生成（截到本波步数）。
 *   b) 现场干净 → 生成 filler（sit_up / type_keyboard）凑齐步数。
 *   c) 顺序点对全部步骤 → trust 上升、wave+1、回 NORMAL_PLAY。
 *   d) 点错一次 → 不立即失败、倒计时减少 ~0.5s、序列不变。
 *   e) 倒计时耗尽留步未完成 → 失败结算、未完成危险标记仍在、wave+1。
 *   f) 先 coworker_watch 再巡查 → 预警时间更长且 coworkerWatch 被消费。
 *   g) coworker_rescue 后 QTE 失败 → trust 只 -5 且 coworkerRescue 被消费。
 *
 * 若本机无法运行无头 Chromium，请改用手动/Preview QA，并以 docs/QA_M4.md 为准。
 */

const URL = process.env.PREVIEW_URL || 'http://localhost:5173';

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.log('SKIP: puppeteer 未安装，跳过无头冒烟测试。改用 docs/QA_M4.md 记录的手动/Preview QA 结果。');
  process.exit(0);
}

const errors = [];
const assert = (cond, msg) => {
  if (!cond) errors.push(msg);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const browser = await puppeteer.launch({ headless: 'new' });
try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.waitForFunction('window.__game && window.__game.getState', { timeout: 10000 });

  const r = await page.evaluate(() => {
    const g = window.__game;
    const out = {};

    // 推进到 QTE_ACTIVE（不依赖具体 warningTime）。
    const toQte = () => {
      g.triggerPatrol();
      let guard = 0;
      while (g.getState().currentMode !== 'QTE_ACTIVE' && guard < 4000) {
        g.advance(0.1);
        guard++;
      }
    };
    const targets = () => g.getState().qteSteps.map((s) => s.targetObjectId);
    const stepIds = () => g.getState().qteSteps.map((s) => s.stepId);
    const dangers = () => [...g.getState().activeDangers];
    const buffs = () => [...g.getState().activeBuffs];

    g.setManualTick(true);

    // a) 真实危险 → 优先级顺序
    g.reset();
    g.clickObject('computer');
    g.selectComputerTab('open_fishing_page'); // unsafe_screen (priority 1)
    g.closeModal();
    g.clickObject('phone'); // phone_lit (priority 2)
    g.clickObject('takeout_box'); // takeout_open (priority 3)
    toQte();
    out.a = { mode: g.getState().currentMode, steps: stepIds(), targets: targets() };

    // b) 干净现场 → filler
    g.reset();
    toQte();
    out.b = { mode: g.getState().currentMode, steps: stepIds(), targets: targets() };

    // c) 全部点对 → trust↑ / wave+1 / NORMAL_PLAY
    g.reset();
    toQte();
    {
      const tgts = targets();
      let trustBeforeLast = null;
      const waveBefore = g.getState().wave;
      for (let i = 0; i < tgts.length; i++) {
        if (i === tgts.length - 1) trustBeforeLast = g.getState().resources.trust;
        g.clickObject(tgts[i]);
      }
      const afterClick = g.getState();
      g.advance(0.1); // QTE_SUCCESS -> NORMAL_PLAY
      out.c = {
        trustBeforeLast,
        trustAfter: afterClick.resources.trust,
        waveBefore,
        waveAfter: afterClick.wave,
        modeAfterAdvance: g.getState().currentMode,
      };
    }

    // d) 点错一次 → 不失败 / 倒计时 -0.5 / 序列不变
    g.reset();
    toQte();
    {
      const before = g.getState();
      const wrong = before.qteSteps[0].targetObjectId === 'protagonist' ? 'coffee' : 'protagonist';
      const qrBefore = before.qteRemaining;
      const idxBefore = before.qteStepIndex;
      const stepsBefore = stepIds().join(',');
      g.clickObject(wrong);
      const after = g.getState();
      out.d = {
        mode: after.currentMode,
        qrBefore,
        qrAfter: after.qteRemaining,
        idxBefore,
        idxAfter: after.qteStepIndex,
        stepsBefore,
        stepsAfter: stepIds().join(','),
      };
    }

    // e) 倒计时耗尽 → 失败 / 未完成危险保留 / wave+1
    g.reset();
    g.clickObject('computer');
    g.selectComputerTab('open_fishing_page'); // unsafe_screen
    g.closeModal();
    g.clickObject('phone'); // phone_lit
    toQte();
    {
      const waveBefore = g.getState().wave;
      const qr = g.getState().qteRemaining;
      g.advance(qr + 0.3); // 耗尽 → QTE_FAIL → NORMAL_PLAY
      const s = g.getState();
      out.e = {
        mode: s.currentMode,
        waveBefore,
        waveAfter: s.wave,
        dangers: dangers(),
      };
    }

    // f) coworker_watch → 下次预警更长 + buff 消费
    g.reset();
    // 基线：干净一波预警时长
    g.triggerPatrol();
    g.advance(0.05);
    const baseWarning = g.getState().leaderWarningRemaining;
    g.reset();
    g.clickObject('coworker');
    g.selectCoworker('coworker_watch'); // 置位 coworkerWatch
    const buffSet = buffs().includes('coworkerWatch');
    g.triggerPatrol();
    g.advance(0.05);
    out.f = {
      baseWarning,
      boostedWarning: g.getState().leaderWarningRemaining,
      buffSet,
      buffAfter: buffs().includes('coworkerWatch'),
    };

    // g) coworker_rescue 后 QTE 失败 → trust 只 -5 + buff 消费
    g.reset();
    g.clickObject('coworker');
    g.selectCoworker('coworker_rescue'); // trust+15, 置位 coworkerRescue
    const rescueSet = buffs().includes('coworkerRescue');
    toQte();
    {
      const qr = g.getState().qteRemaining;
      g.advance(qr - 0.1); // 推进到将近耗尽，未触发失败
      const trustBefore = g.getState().resources.trust;
      g.advance(0.2); // 触发失败
      const after = g.getState();
      out.g = {
        rescueSet,
        trustBefore,
        trustAfter: after.resources.trust,
        buffAfter: buffs().includes('coworkerRescue'),
        mode: after.currentMode,
      };
    }

    return out;
  });

  // ── a ──
  assert(r.a.mode === 'QTE_ACTIVE', `a: 未进入 QTE (${r.a.mode})`);
  assert(
    JSON.stringify(r.a.targets) === JSON.stringify(['computer', 'phone']),
    `a: QTE 目标未按优先级生成: ${JSON.stringify(r.a.targets)}`,
  );
  assert(
    JSON.stringify(r.a.steps) === JSON.stringify(['switch_safe_work', 'put_away_phone']),
    `a: QTE 步骤序列异常: ${JSON.stringify(r.a.steps)}`,
  );

  // ── b ──
  assert(r.b.mode === 'QTE_ACTIVE', `b: 未进入 QTE (${r.b.mode})`);
  assert(
    JSON.stringify(r.b.steps) === JSON.stringify(['sit_up', 'type_keyboard']),
    `b: 干净现场未生成 filler: ${JSON.stringify(r.b.steps)}`,
  );
  assert(
    JSON.stringify(r.b.targets) === JSON.stringify(['protagonist', 'keyboard']),
    `b: filler 目标异常: ${JSON.stringify(r.b.targets)}`,
  );

  // ── c ──
  assert(near(r.c.trustAfter - r.c.trustBeforeLast, 6, 0.3), `c: 成功 trust 增量非 +6: ${r.c.trustAfter - r.c.trustBeforeLast}`);
  assert(r.c.waveAfter === r.c.waveBefore + 1, `c: wave 未 +1 (${r.c.waveBefore}->${r.c.waveAfter})`);
  assert(r.c.modeAfterAdvance === 'NORMAL_PLAY', `c: 成功后未回 NORMAL_PLAY (${r.c.modeAfterAdvance})`);

  // ── d ──
  assert(r.d.mode === 'QTE_ACTIVE', `d: 点错后不应离开 QTE (${r.d.mode})`);
  assert(r.d.idxAfter === r.d.idxBefore, `d: 点错后步骤索引变化 (${r.d.idxBefore}->${r.d.idxAfter})`);
  assert(r.d.stepsAfter === r.d.stepsBefore, 'd: 点错后序列变化');
  assert(near(r.d.qrBefore - r.d.qrAfter, 0.5, 0.05), `d: 点错倒计时扣减非 ~0.5s: ${r.d.qrBefore - r.d.qrAfter}`);

  // ── e ──
  assert(r.e.mode === 'NORMAL_PLAY', `e: 失败结算后未回 NORMAL_PLAY (${r.e.mode})`);
  assert(r.e.waveAfter === r.e.waveBefore + 1, `e: 失败后 wave 未 +1 (${r.e.waveBefore}->${r.e.waveAfter})`);
  assert(r.e.dangers.includes('unsafe_screen'), 'e: 未完成危险 unsafe_screen 标记丢失');
  assert(r.e.dangers.includes('phone_lit'), 'e: 未完成危险 phone_lit 标记丢失');

  // ── f ──
  assert(r.f.buffSet, 'f: coworker_watch 未置位 coworkerWatch');
  assert(r.f.boostedWarning > r.f.baseWarning + 1, `f: 预警时长未变长 (base ${r.f.baseWarning} vs boosted ${r.f.boostedWarning})`);
  assert(!r.f.buffAfter, 'f: coworkerWatch 预警后未被消费');

  // ── g ──
  assert(r.g.rescueSet, 'g: coworker_rescue 未置位 coworkerRescue');
  assert(near(r.g.trustAfter - r.g.trustBefore, -5, 0.4), `g: 失败 trust 抵消后非 ~-5: ${r.g.trustAfter - r.g.trustBefore}`);
  assert(!r.g.buffAfter, 'g: coworkerRescue 失败后未被消费');

  assert(consoleErrors.length === 0, `控制台存在 error: ${consoleErrors.join(' | ')}`);
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(`SMOKE M4 FAILED (${errors.length}):`);
  errors.forEach((e, i) => console.error(`  [${i + 1}] ${e}`));
  process.exit(1);
}
console.log('SMOKE M4 PASSED');
