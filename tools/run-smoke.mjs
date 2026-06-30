#!/usr/bin/env node
/**
 * 端到端冒烟编排（零额外依赖）。
 *
 * 流程：
 *   1. 启动一个独立端口上的 Vite dev server（调试 API window.__game 仅在 DEV 构建暴露，
 *      故冒烟跑 dev 而非 preview）。
 *   2. 轮询直到服务可用，设置 PREVIEW_URL。
 *   3. 依次运行 smoke.mjs（M3）、smoke_m4.mjs（M4）、smoke_m5.mjs（M5：QTE 成功表现回归 + 页签防刷）。
 *   4. 无论成败都关闭 dev server，按各步退出码汇总（任一失败则整体失败）。
 *
 * 用法：npm run test:smoke
 */

import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';

const PORT = Number(process.env.SMOKE_PORT || 5180);
const URL = `http://localhost:${PORT}`;

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

function log(msg) {
  console.log(`[run-smoke] ${msg}`);
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error(`dev server 未在 ${timeoutMs}ms 内就绪`));
        else setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

function killTree(child) {
  if (!child || child.killed) return;
  if (isWin) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

function runSmoke(file) {
  return new Promise((resolve) => {
    log(`运行 ${file} …`);
    const child = spawn(process.execPath, [path.join(__dirname, file)], {
      cwd: root,
      env: { ...process.env, PREVIEW_URL: URL },
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

let server;
let overall = 0;
try {
  // 预打包依赖，避免 dev server 首次访问时因 re-optimize 触发整页 reload（会重置 window.__game）。
  log('预优化依赖（vite optimize）…');
  spawnSync(process.execPath, [viteBin, 'optimize', '--force'], {
    cwd: root,
    env: { ...process.env },
    stdio: 'ignore',
  });

  log(`启动 dev server :${PORT} …`);
  server = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], {
    cwd: root,
    env: { ...process.env },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  server.on('exit', (code) => {
    if (code && code !== 0 && code !== null) log(`dev server 退出码 ${code}`);
  });

  await waitForServer(URL, 30000);
  log('dev server 就绪。');

  for (const file of ['smoke.mjs', 'smoke_m4.mjs', 'smoke_m5.mjs']) {
    const code = await runSmoke(file);
    if (code !== 0) {
      overall = 1;
      log(`${file} 失败（退出码 ${code}）。`);
    } else {
      log(`${file} 通过。`);
    }
  }
} catch (err) {
  console.error(`[run-smoke] 错误：${err.message}`);
  overall = 1;
} finally {
  killTree(server);
}

if (overall === 0) log('全部冒烟通过。');
else log('存在失败冒烟。');
process.exit(overall);
