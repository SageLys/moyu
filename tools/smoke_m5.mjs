#!/usr/bin/env node
/**
 * M5 冒烟测试：QTE 成功表现层回归（P0-1）+ 电脑页签防刷（P1-2）的端到端断言。
 *
 * 依赖 puppeteer（未安装则跳过并退出 0）。前置：dev server（window.__game 调试 API
 * 仅在 DEV 构建暴露），默认 http://localhost:5173，PREVIEW_URL 可覆盖。
 *
 * 断言：
 *   P0-1：制造危险 → triggerPatrol → 点对全部 QTE 步骤 → 命中末步即 QTE_SUCCESS；
 *         结算停留后 暗角 alpha≈0、领导回到 patrol（离开 checking）、预警 HUD 已隐藏；
 *         同一局内可连续完成第二次 QTE 成功（验证 approach 不再被卡住）。
 *   P1-2：开电脑弹层，连点「摸鱼」两次 → 精神只上升一次的量；
 *         在三个安全页之间多次切换 → 信任只上升一次的量。
 */

const URL = process.env.PREVIEW_URL || 'http://localhost:5173';

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.log('SKIP: puppeteer 未安装，跳过无头冒烟测试。');
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
  await page.waitForFunction('window.__game && window.__game.getState', { timeout: 15000 });

  // ── P0-1 第一波：点对全部步骤 → 命中末步即 QTE_SUCCESS ───────────────────────
  const wave1 = await page.evaluate(() => {
    const g = window.__game;
    g.setManualTick(true);
    g.reset();

    const toQte = () => {
      g.triggerPatrol();
      let guard = 0;
      while (g.getState().currentMode !== 'QTE_ACTIVE' && guard < 4000) {
        g.advance(0.1);
        guard++;
      }
    };
    const targets = () => g.getState().qteSteps.map((s) => s.targetObjectId);

    // 制造真实危险（unsafe_screen + phone_lit）。
    g.clickObject('computer');
    g.selectComputerTab('open_fishing_page');
    g.closeModal();
    g.clickObject('phone');

    toQte();
    const tgts = targets();
    for (let i = 0; i < tgts.length; i++) g.clickObject(tgts[i]);

    const afterClick = g.getState();
    // 命中末步瞬间（tickGame 尚未推进），表现层应已观察到 QTE_SUCCESS。
    const successObservable = {
      mode: afterClick.currentMode,
      leaderPhase: g.getLeaderPhase(),
      hudVisible: g.isHudVisible(),
    };
    g.advance(0.1); // QTE_SUCCESS -> NORMAL_PLAY
    return {
      stepCount: tgts.length,
      modeAtComplete: successObservable.mode,
      leaderPhaseAtComplete: successObservable.leaderPhase,
      hudVisibleAtComplete: successObservable.hudVisible,
      modeAfterAdvance: g.getState().currentMode,
    };
  });

  assert(wave1.stepCount >= 1, `P0-1: QTE 未生成步骤 (${wave1.stepCount})`);
  assert(wave1.modeAtComplete === 'QTE_SUCCESS', `P0-1: 末步命中未置 QTE_SUCCESS (${wave1.modeAtComplete})`);
  assert(wave1.hudVisibleAtComplete === true, 'P0-1: 成功瞬间预警 HUD 未显示结语');
  assert(wave1.modeAfterAdvance === 'NORMAL_PLAY', `P0-1: 成功后未回 NORMAL_PLAY (${wave1.modeAfterAdvance})`);

  // 等待结算表现收尾（leave 1.2s / edgeDarken 0.6s / HUD 结语 1.8s 均为真实时序）。
  await page.waitForFunction(
    () => {
      const g = window.__game;
      return (
        g.getEdgeDarkenAlpha() < 0.02 &&
        g.getLeaderPhase() === 'patrol' &&
        g.isHudVisible() === false
      );
    },
    { timeout: 8000 },
  ).catch(() => {});

  const settled = await page.evaluate(() => {
    const g = window.__game;
    return {
      edgeAlpha: g.getEdgeDarkenAlpha(),
      leaderPhase: g.getLeaderPhase(),
      hudVisible: g.isHudVisible(),
    };
  });
  assert(settled.edgeAlpha < 0.02, `P0-1: 成功后暗角未消退 (alpha=${settled.edgeAlpha})`);
  assert(settled.leaderPhase === 'patrol', `P0-1: 领导未离开 checking 回到 patrol (${settled.leaderPhase})`);
  assert(settled.hudVisible === false, 'P0-1: 结语停留后预警 HUD 未隐藏');

  // ── P0-1 第二波：同一局再完成一次成功（验证 approach 未被卡死） ───────────────
  const wave2 = await page.evaluate(() => {
    const g = window.__game;
    const toQte = () => {
      g.triggerPatrol();
      let guard = 0;
      while (g.getState().currentMode !== 'QTE_ACTIVE' && guard < 4000) {
        g.advance(0.1);
        guard++;
      }
    };
    const targets = () => g.getState().qteSteps.map((s) => s.targetObjectId);

    g.clickObject('computer');
    g.selectComputerTab('open_fishing_page');
    g.closeModal();

    toQte();
    const enteredQte = g.getState().currentMode === 'QTE_ACTIVE';
    const tgts = targets();
    for (let i = 0; i < tgts.length; i++) g.clickObject(tgts[i]);
    const modeAtComplete = g.getState().currentMode;
    g.advance(0.1);
    return {
      enteredQte,
      stepCount: tgts.length,
      modeAtComplete,
      modeAfterAdvance: g.getState().currentMode,
    };
  });
  assert(wave2.enteredQte, 'P0-1: 第二波未能进入 QTE_ACTIVE');
  assert(wave2.stepCount >= 1, `P0-1: 第二波未生成步骤 (${wave2.stepCount})`);
  assert(wave2.modeAtComplete === 'QTE_SUCCESS', `P0-1: 第二波末步命中未置 QTE_SUCCESS (${wave2.modeAtComplete})`);
  assert(wave2.modeAfterAdvance === 'NORMAL_PLAY', `P0-1: 第二波成功后未回 NORMAL_PLAY (${wave2.modeAfterAdvance})`);

  await page.waitForFunction(() => window.__game.getLeaderPhase() === 'patrol', { timeout: 8000 }).catch(() => {});
  const wave2Phase = await page.evaluate(() => window.__game.getLeaderPhase());
  assert(wave2Phase === 'patrol', `P0-1: 第二波领导未回到 patrol (${wave2Phase})`);

  // ── P1-2：电脑页签防刷 ────────────────────────────────────────────────────────
  const grind = await page.evaluate(() => {
    const g = window.__game;
    g.setManualTick(true);
    g.reset(); // 面板复位到安全页（doc）

    const spiritBefore = g.getState().resources.spirit;
    g.clickObject('computer'); // mode COMPUTER_PANEL, 类别 safe
    g.clickComputerTab('fishing'); // safe→fishing：结算 open_fishing_page（spirit +14）
    const spiritAfter1 = g.getState().resources.spirit;
    g.clickComputerTab('fishing'); // fishing→fishing：不结算
    const spiritAfter2 = g.getState().resources.spirit;

    // 现在停在 fishing。fishing→doc 合法结算一次 switch_safe_work（trust +8）。
    const trustBeforeSafe = g.getState().resources.trust;
    g.clickComputerTab('doc');
    const trustAfterFirstSafe = g.getState().resources.trust;
    // 三个安全页之间多次切换：均不结算。
    g.clickComputerTab('excel');
    g.clickComputerTab('chat');
    g.clickComputerTab('doc');
    g.clickComputerTab('excel');
    const trustAfterManySafe = g.getState().resources.trust;

    return {
      spiritGain: spiritAfter1 - spiritBefore,
      spiritSecondGain: spiritAfter2 - spiritAfter1,
      trustFirstSafeGain: trustAfterFirstSafe - trustBeforeSafe,
      trustManySafeGain: trustAfterManySafe - trustAfterFirstSafe,
    };
  });

  assert(near(grind.spiritGain, 14, 0.01), `P1-2: 首次摸鱼精神增量非 +14 (${grind.spiritGain})`);
  assert(near(grind.spiritSecondGain, 0, 0.01), `P1-2: 连点摸鱼第二次仍结算 (${grind.spiritSecondGain})`);
  assert(near(grind.trustFirstSafeGain, 8, 0.01), `P1-2: 摸鱼→安全页首次信任增量非 +8 (${grind.trustFirstSafeGain})`);
  assert(
    near(grind.trustManySafeGain, 0, 0.01),
    `P1-2: 安全页之间切换刷到了信任 (${grind.trustManySafeGain})`,
  );

  assert(consoleErrors.length === 0, `控制台存在 error: ${consoleErrors.join(' | ')}`);
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(`SMOKE M5 FAILED (${errors.length}):`);
  errors.forEach((e, i) => console.error(`  [${i + 1}] ${e}`));
  process.exit(1);
}
console.log('SMOKE M5 PASSED');
