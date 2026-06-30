# QA_M3 — Phaser 主场景渲染与平时动作接入验收记录

任务：M3（用 Phaser 渲染主场景并接上 10 个平时动作的真实点击，驱动 core 的 GameState；不实现领导预警与 QTE，领导静态显示在 patrol_far）。

## 验证方式

- `npm run validate`、`npm run test:unit`、`npm run build` 全部通过（见下）。
- 启动 dev server（`npm run dev`，http://localhost:5173），通过 Preview 工具（无头浏览器）加载页面，
  使用页面暴露的调试 API `window.__game`（`getState` / `getDebugText` / `clickObject` /
  `selectComputerTab` / `selectCoworker` / `closeModal` / `toggleDebug`）逐条断言核心状态变化，
  并截图核对画面层级与“无底部动作按钮栏”。
- 也提供可选无头脚本 `tools/smoke.mjs`（需本机已装 puppeteer；未装则自动 SKIP）。

> 说明：core.tickGame 被如实驱动。领导巡查计时器到达 `patrolInterval`（第 1 波 35s）后，
> core 会自行进入 `LEADER_WARNING → QTE_ACTIVE`。本任务不渲染这两态的专属 UI（预警 HUD / QTE 高亮），
> 场景在这两态下不接收物件点击（已验证 gating 生效），QTE 倒计时结束后 core 自动回到 `NORMAL_PLAY`。
> 领导对象在 midground 层静态显示于 `patrol_far`。

## 命令结果

| 命令 | 结果 |
|---|---|
| `npm run validate` | CONFIG VALIDATION PASSED |
| `npm run test:unit` | 6 files / 84 tests passed |
| `npm run build` | tsc + vite build 成功（仅 Phaser 包体超过 500kB 的提示，非错误） |
| dev server 控制台 | 无 warning、无 error（加载与全部交互后复检均为空） |
| canvas | 存在，尺寸 1280×720 |

## 逐条验收（a–f）

数值取自 `window.__game.getState()`，对同一动作前后立即取样（衰减在两次同步取样间≈0），增量与
`actions.json` 配置完全一致。

### a) 电脑弹层
- 点 `computer` → `currentMode` 由 `NORMAL_PLAY` → `COMPUTER_PANEL`。✓
- 切「摸鱼」（`open_fishing_page`）→ spirit **+14**（68.76→82.76）、trust **−12**（66.26→54.26），
  `activeDangers` 新增 `unsafe_screen`（computer 上出现 `danger_marker` 标记）。✓
- 切「文档」（`switch_safe_work`）→ spirit **−6**、trust **+8**，`unsafe_screen` 被清除（标记消失）。✓
- 点关闭 → 回 `NORMAL_PLAY`。✓

### b) 手机
- 点 `phone` → spirit **+8**、trust **−6**，新增 `phone_lit`（phone 整图替换为 `phone_lit`），
  仍停留在 `NORMAL_PLAY`。✓

### c) 外卖 / 咖啡 / 文件
- 点 `takeout_box` → satiety **+18**（70.01→88.01）、spirit **+3**、trust **−8**，新增 `takeout_open`（整图替换）。✓
- 点 `coffee` → spirit **+10**、satiety **−5**、trust **−3**，无新增持续危险标记。✓
- 点 `files` → 清除 `desk_empty`、trust **+12**、spirit **−5**（QA 时 `desk_empty` 已由 workTraceTimer 自然产生，点击后被清除）。✓

### d) 同事菜单（含隐藏 coworkerSpirit，经调试浮层读取）
- 点 `coworker` → `COWORKER_MENU`，右上方弹 4 气泡；点任一气泡执行后关闭回 `NORMAL_PLAY`。✓
- `coworker_watch` → coworkerSpirit **−10**，置位 buff `coworkerWatch`。✓
- `coworker_rescue` → trust **+15**、coworkerSpirit **−20**，置位 buff `coworkerRescue`。✓
- `coworker_complain` → spirit **+8**、coworkerSpirit **+8**、trust **−6**。✓
- `coworker_comfort` → coworkerSpirit **+16**、spirit **−6**、trust **+3**。✓

### e) 资源持续衰减
- 不操作取样 3 秒：spirit **−0.75**、satiety **−0.60**、trust **−0.45**、coworkerSpirit **−0.09**，
  分别对应 `resources.json` 的 `baseDeltaPerSecond` = −0.25 / −0.20 / −0.15 / −0.03。✓

### f) 无底部动作按钮栏
- 截图核对：底部 `bottom_message_bar` 仅显示文字（hover 说明 / 点击反馈），全画面无任何动作按钮栏；
  10 个平时动作全部挂在场景对象本体（电脑弹层页签 / 同事气泡 / 桌面物件）上。✓

## 画面层级核对（截图）

background（办公室背景图）< midground（领导静态于 patrol_far）< interactables（主角/同事/桌面物件）
< ui（顶部状态栏：精神/饱腹/信任三条图形条 + 存活时间 + 当前波次；底部提示栏）< effects（hover 描边、危险标记）。
调试浮层（` 或 D 键切换）显示 spirit/satiety/trust/coworkerSpirit 精确值、currentMode、当前危险集合、wave、各计时器。
