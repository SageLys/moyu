# 假装正在工作（Pretend Working）

一句话玩法：在办公室里**假装正在认真工作**——平时点击物件维持精神/饱腹/信任三条资源，领导巡查预警时按提示顺序点亮高亮物件完成 QTE 伪装，撑得越久越好。

可玩的横版办公室点击生存 Demo（当前里程碑：**M5 完整 Demo**）。纯前端，Vite + TypeScript + Phaser；玩法数值全部来自 `src/data/*.json`，资产路径只在 `src/assets.ts`。

## 安装与运行

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器（默认 http://localhost:5173）
npm run build      # 类型检查 + 生产构建到 dist/
npm run preview    # 预览已构建产物
```

## 操作说明

- **开始页**：点「开始」进入游戏。
- **电脑**：点电脑打开弹层，在「文档 / Excel / 聊天 / 摸鱼」页签间切换。
  - 切到摸鱼页：精神恢复，但屏幕变得不安全（被巡查抓到要在 QTE 里切回）。
  - 切回任一安全页：清除不安全屏幕、信任回升。
  - 注：只有在「安全页 ↔ 摸鱼页」之间真正切换时才结算，三个安全页之间来回切只换显示不刷资源。
- **手机 / 外卖 / 咖啡 / 文件**：点击触发各自的平时动作（看手机、吃外卖、喝咖啡、整理工作痕迹）。
- **同事**：点同事打开 4 个气泡动作（望风 / 求救 / 吐槽 / 安抚）。
- **领导预警 → QTE**：领导开始巡查后屏幕边缘变暗、弹出预警 HUD；进入 QTE 后按 HUD 提示**依次点击高亮物件**完成伪装。点错只扣倒计时、不立即失败；倒计时耗尽则本波失败。成功后领导离开、进入短暂安全窗口。
- **调试热键**（仅开发构建）：
  - `L`：立即触发一次领导巡查。
  - 反引号 `` ` `` 或 `D`：切换调试浮层。

## 校验与测试

```bash
npm run validate     # 配置引用完整性校验（src/data/*.json ↔ assets.ts ↔ copyText）
npm run test:unit    # core 纯逻辑内核的 vitest 单元测试
npm run test:smoke   # 端到端无头冒烟（自动起 dev server，跑 M3/M4/M5 三个冒烟）
```

`test:smoke` 依赖 `puppeteer`（已在 devDependencies）。它会在独立端口启动一个 dev server，依次运行：

- `tools/smoke.mjs`（M3）：画布、动作 → 核心状态联动。
- `tools/smoke_m4.mjs`（M4）：领导巡查与 QTE 时序、优先级、成败结算。
- `tools/smoke_m5.mjs`（M5）：QTE 成功表现层回归（领导离开 / 暗角消退 / HUD 收尾 / 连续多波）与电脑页签防刷。

调试 API `window.__game` 仅在开发构建（`import.meta.env.DEV`）下挂载，生产构建不暴露。

## 目录结构

- `src/core/` — 纯逻辑内核（资源、危险、QTE、波次、状态机），被 vitest 覆盖，不依赖 Phaser。
- `src/scenes/`、`src/render/`、`src/ui/` — Phaser 表现层。
- `src/data/*.json` — 玩法数值与文案配置（程序侧不硬编码）。
- `src/assets.ts`、`src/data/visuals.json` — 资产路径与「对象+状态 → assetId」映射。
- `public/assets/` — 由 Vite 静态提供的 SVG / AI 生成图等素材。
- `docs/` — 制作方案、交互流程（`INTERACTION_FLOW.md`）、场景布局（`SCENE_LAYOUT.md`）、QA 清单。
