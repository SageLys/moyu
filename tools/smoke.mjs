#!/usr/bin/env node
/**
 * M3 冒烟测试（可选）。
 *
 * 依赖 puppeteer（未安装则跳过并退出 0，不阻塞 CI）。
 * 前置：先在另一个终端启动 dev server（npm run dev），默认 http://localhost:5173。
 * 可用环境变量 PREVIEW_URL 覆盖。
 *
 * 断言：
 *   1. canvas 存在且为 1280x720
 *   2. 加载后控制台无 error
 *   3. 通过 window.__game 模拟点击若干对象后，调试浮层文本（getDebugText）发生变化
 *      且核心状态按 core 规则改变（fishing→spirit↑/trust↓/unsafe_screen；phone→phone_lit 等）
 *
 * 若本机无法运行无头 Chromium，请改用手动 QA，并以 docs/QA_M3.md 为准。
 */

const URL = process.env.PREVIEW_URL || 'http://localhost:5173';

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.log('SKIP: puppeteer 未安装，跳过无头冒烟测试。改用 docs/QA_M3.md 记录的手动/Preview QA 结果。');
  process.exit(0);
}

const errors = [];
function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

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

  // 1. canvas
  const canvas = await page.evaluate(() => {
    const c = document.querySelector('#game canvas');
    return c ? { w: c.width, h: c.height } : null;
  });
  assert(canvas, 'canvas 不存在');
  assert(canvas && canvas.w === 1280 && canvas.h === 720, `canvas 尺寸异常: ${JSON.stringify(canvas)}`);

  // 3. 点击对象 → 状态/调试文本变化
  const result = await page.evaluate(() => {
    const g = window.__game;
    // 当前版本启动后停在开始页（START）：先开始一局进入 NORMAL_PLAY，物件点击才生效。
    g.start();
    g.setManualTick(true); // 冻结自动 tick，保证逐步快照只反映点击产生的变化。

    // 注意：getState() 返回的是 live 引用，必须在每一步即时抽取标量/数组快照再比较。
    const snap = () => {
      const s = g.getState();
      return {
        spirit: s.resources.spirit,
        trust: s.resources.trust,
        dangers: [...s.activeDangers],
        mode: s.currentMode,
      };
    };

    const before = snap();
    const dbgBefore = g.getDebugText();
    g.clickObject('computer');
    g.selectComputerTab('open_fishing_page');
    const s1 = snap();
    const dbgAfter = g.getDebugText();
    g.selectComputerTab('switch_safe_work');
    const s2 = snap();
    g.closeModal();
    g.clickObject('phone');
    const s3 = snap();
    return {
      dbgChanged: dbgBefore !== dbgAfter,
      fishingSpiritUp: s1.spirit > before.spirit,
      fishingTrustDown: s1.trust < before.trust,
      unsafeSet: s1.dangers.includes('unsafe_screen'),
      unsafeCleared: !s2.dangers.includes('unsafe_screen'),
      phoneLit: s3.dangers.includes('phone_lit'),
      mode: s3.mode,
    };
  });

  assert(result.dbgChanged, '调试浮层文本未变化');
  assert(result.fishingSpiritUp, '摸鱼后精神值未上升');
  assert(result.fishingTrustDown, '摸鱼后信任值未下降');
  assert(result.unsafeSet, '摸鱼后未置位 unsafe_screen');
  assert(result.unsafeCleared, '切回安全页后未清除 unsafe_screen');
  assert(result.phoneLit, '看手机后未置位 phone_lit');

  assert(consoleErrors.length === 0, `控制台存在 error: ${consoleErrors.join(' | ')}`);
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(`SMOKE FAILED (${errors.length}):`);
  errors.forEach((e, i) => console.error(`  [${i + 1}] ${e}`));
  process.exit(1);
}
console.log('SMOKE PASSED');
