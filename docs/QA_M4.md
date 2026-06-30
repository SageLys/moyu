# QA_M4 — 领导巡查与 QTE 表现层验收记录

任务：M4（实现领导巡查与 QTE 的表现层，接通 core 中已实现并已测的波次/QTE 逻辑。
所有时序与数值均来自 core 与配置，本任务只做"呈现 + 输入转发"）。

## 验证方式

- `npm run validate`、`npm run test:unit`、`npm run build` 全部通过（见下）。
- 启动 dev server（`npm run dev`，http://localhost:5173），通过 Preview 工具（真实浏览器）加载页面，
  使用页面暴露的调试 API `window.__game` 逐条断言核心状态变化，并截图核对呈现层。
  - M4 新增调试 API：`triggerPatrol()`（= 按 L 键，把 `nextLeaderPatrol` 置 0 并清安全窗）、
    `setManualTick(on)`（关闭 rAF 自动 tick，改由 `advance` 确定性驱动时序）、
    `advance(seconds)`（按 1/60 步长手动推进 core）、`reset()`（单局重置并清理呈现层）。
- 可选无头脚本 `tools/smoke_m4.mjs`（需本机已装 puppeteer；未装则自动 SKIP）。
  本机未安装 puppeteer，故 SMOKE 自动 SKIP；改以下方 Preview QA 为准（断言逻辑与脚本一致）。

> 说明：core.tickGame 被如实驱动，时序/步数/结算/优先级全部来自 core
> （`getCurrentWaveConfig` / `generateQteSteps` / `applyQteStepClick` /
> `applyQteSuccess|Fail` / `computeWarningTime`）与配置，场景不重算。
> QTE 不新增交互对象：只对 computer/phone/takeout_box/files/protagonist/keyboard 应用
> `qteHighlightStyle`，不画任何额外按钮或目标图标。错点不立即判负，统一在倒计时结束判定。

## 命令结果

| 命令 | 结果 |
|---|---|
| `npm run validate` | CONFIG VALIDATION PASSED |
| `npm run test:unit` | 6 files / 84 tests passed |
| `npm run build` | tsc + vite build 成功（仅 Phaser 包体 >500kB 的提示，非错误） |
| `npx tsc --noEmit` | 无类型错误 |
| `node tools/smoke_m4.mjs` | SKIP（puppeteer 未安装），改用 Preview QA |
| dev server 控制台 | 全流程复检 0 error |
| canvas | 存在，尺寸 1280×720 |

## 呈现层目检（Preview 截图）

将场景手动推进到 QTE_ACTIVE（先制造 unsafe_screen + phone_lit，再触发巡查）后截图确认：

- 左上 `leader_warning_hud`（24,76,256×96）显示当前步骤提示「现在切回工作页。」+ 倒计时「7.4s」。✓
- 当前目标 `computer` 显示 `qteHighlightStyle` 高亮（描边 #FFB000 + 外发光 + 呼吸缩放），优先于 hover。✓
- `leader` 剪影移动到 checking 锚点（x700 y310，体型放大）停驻在主角工位正后方。✓
- 未完成危险视觉标记保留：computer 危险标记 + 手机亮屏。✓
- 画面边缘变暗（screen_edge_warning，位于 ui 之下，未遮挡 HUD/提示栏）。✓
- 底部提示栏显示预警文案「领导正在靠近你的工位。」✓
- `reset()` 回到 NORMAL_PLAY 后：HUD 隐藏、高亮清除、边缘变暗消退、leader 回到 patrol_far 巡逻、危险清空。✓

## 逐条验收（a–g，数值取自 `window.__game`）

确定性方式：`setManualTick(true)` 后用 `advance` 推进；每个场景前 `reset()`。

### a) 制造真实危险后触发巡查 → QTE 步骤按优先级生成
- 操作：摸鱼（unsafe_screen, priority 1）→ 看手机（phone_lit, p2）→ 吃外卖（takeout_open, p3）→ 触发巡查 → 推进至 QTE。
- 结果：`currentMode = QTE_ACTIVE`；第 1 波 `qteSteps = 2`，生成序列按优先级截取前 2 项：
  `steps = [switch_safe_work, put_away_phone]`，`targets = [computer, phone]`。✓（切回安全页 → 收手机，与 dangers.priority 一致）

### b) 现场干净时触发巡查 → 生成 filler 凑齐步数
- 操作：reset 后无任何危险 → 触发巡查 → 推进至 QTE。
- 结果：`steps = [sit_up, type_keyboard]`，`targets = [protagonist, keyboard]`（整理表演型 filler 凑齐第 1 波 2 步）。✓

### c) 顺序点对全部步骤 → trust 上升、wave+1、回 NORMAL_PLAY
- 操作：进入 QTE 后按 `qteSteps` 顺序点对每个目标对象。
- 结果：末步点对触发 `applyQteSuccess`，trust 增量 **+5.99 ≈ +6**（qteOutcome.success.delta.trust）；
  `wave` 1 → 2；再推进一帧后 `currentMode = NORMAL_PLAY`。✓

### d) 故意点错一次 → 不立即失败、倒计时减少、序列不变
- 操作：进入 QTE 后点击非当前目标对象（咖啡/主角）。
- 结果：`currentMode` 仍为 `QTE_ACTIVE`（`wrongClickImmediateFail=false`）；倒计时扣减 **0.5s**
  （qteRules.wrongClickPenaltySeconds）；`qteStepIndex` 不变、`qteSteps` 序列不变；
  被点对象播放 wrongClickFeedback 红闪、HUD 抖动（呈现层）。✓

### e) 倒计时耗尽留步未完成 → 失败结算、未完成危险标记仍在、wave+1
- 操作：制造 unsafe_screen + phone_lit，进入 QTE 后不点击，推进至倒计时耗尽。
- 结果：触发 `applyQteFail` → 短暂 QTE_FAIL 后回 `NORMAL_PLAY`；`wave` 1 → 2；
  未完成危险 `activeDangers = [unsafe_screen, phone_lit]` 仍保留（对应对象危险标记不消失）。✓

### f) 先 coworker_watch 再触发巡查 → 下次预警更长且 buff 被消费
- 操作：基线干净一波预警时长 **base ≈ 7.97s**（第 1 波 warningTime 8 − 推进取样）；
  reset 后请同事望风（置位 coworkerWatch）→ 触发巡查 → 取预警时长。
- 结果：`coworkerWatch` 置位成功；预警时长 **boosted ≈ 9.47s**（base + 1.5 加时，computeWarningTime）；
  预警进入后 `coworkerWatch` 已被消费（buff 清除）。✓

### g) coworker_rescue 后让一次 QTE 失败 → trust 只 -5 且 buff 被消费
- 操作：向同事求救（trust+15，置位 coworkerRescue）→ 进入 QTE → 推进到倒计时耗尽触发失败。
- 结果：`coworkerRescue` 置位成功；失败结算 trust 增量 **≈ -5.03**
  （fail.delta.trust -15 被 coworkerRescueEffect.overrideFailDelta 抵消为 -5，叠加约 0.03 衰减）；
  失败后 `coworkerRescue` 已被消费。✓

## 结论

7 条场景（a–g）全部通过，呈现层与 core 时序/数值完全一致；全流程 0 console error；
`validate / test:unit / build / tsc` 全过。M4 验收通过。
