# 后续开发任务规划 —— 交给 Claude Code 的完整 Prompt

> 依据：《假装正在工作》Demo 制作方案.md（基本方案）、ChatGPT 审阅建议（M1–M5 里程碑）、以及对仓库当前实际状态的复核。
> 目标：用尽量少的任务步骤（一次完成一类工作），把项目从"配置闭合"推进到"可连续游玩 3–5 分钟的完整 Demo"，且每个任务都有明确、可机器验收的标准。

---

## 0. 现状复核结论（M1 已完成）

复核了仓库实际文件，ChatGPT 在"2. 准备阶段的主要问题与漏洞"中列出的项已全部落实：

- **配置齐全且自洽**：`src/data/` 下已有 9 个配置 —— `resources.json` / `actions.json`（10 个平时动作）/ `dangers.json`（5 个危险状态）/ `waves.json`（1–5 波固定 + 6 波后区间 + 望风加成）/ `qte.json`（6 步 + qteRules + **qteOutcome** + **coworkerRescueEffect**）/ `gameRules.json`（**workTrace / bodySlack 阈值**）/ `visuals.json`（**objectId+state → assetId 映射层**）/ `sceneObjects.json`（坐标/hitbox/层级/高亮样式）/ `copyText.json`。
- **资产映射已闭合**：`src/assets.ts` 用扁平 `assetId → 路径`；`visuals.json` 负责 `objectId+state → assetId`；`sceneObjects.json` 不再承载素材路径。三者职责分离已落地，`placeholderAsset` 不再用于运行时。
- **文案结构修正**：`hoverTexts.*` 为 string，其余分类为 string[]；"新的一天"已改为"本次记录"。
- **配置校验已就位**：`tools/validate-config.mjs`（零依赖，9 大段校验）+ `package.json` 的 `validate`/`test` 脚本 + `.github/workflows/ci.yml`（validate + build）。
- **当前验证状态**：`npm run validate` ✅ 通过；`npx tsc --noEmit` ✅ 通过。

> ⚠️ **关于 `npm run build`**：在某些环境（如本次复核的 Linux 沙箱）会因 npm 的 rollup 可选依赖 bug 报 `Cannot find module @rollup/rollup-...` —— 这是 node_modules 跨平台安装问题，**不是项目问题**。在你（Claude Code）本机若遇到，删除 `node_modules` 与 `package-lock.json` 后重新 `npm install` 即可。CI 用 `npm ci` 全新安装不受影响。

### 0.1 开工前的零散清理（顺手做，不单列任务）

- 删除两个空的脏目录（疑似历史 Windows 路径误建，git 未跟踪）：`C:moyu.githubworkflows/`、`C:moyutools/`。
- Step 0 的产物有一部分尚未提交（`.github/`、`src/data/gameRules.json`、`src/data/visuals.json`、`tools/validate-config.mjs` 等显示为未跟踪）。先 `git add -A && git commit` 一次，把 M1 固化为基线，再开始 M2。

---

## 1. 总体路线：4 个任务（M2 → M5）

ChatGPT 的第 1–7 步在工程上可以收敛为 4 个"一类一交付"的任务。关键判断：**把全部玩法规则做成不依赖 Phaser 的纯逻辑内核（任务 A），并用无头单测锁死**。这样后面 3 个 Phaser 任务都只是"渲染 + 转发输入"，风险和返工大幅下降。

| 任务 | 对应里程碑 | 一句话目标 | 主验收方式 |
|---|---|---|---|
| **A** | M2 纯逻辑闭环 | 配置加载层 + 全部玩法规则（资源/动作/危险/波次/QTE/结束）做成纯 TS，无头跑通整局 | `vitest` 单测全过 + `tsc` + `validate` |
| **B** | M3 场景点击 | Phaser 主场景渲染 + 顶/底 UI + 电脑弹层 + 同事菜单 + 10 个平时动作点击闭环 | `tsc`/build + 无控制台报错 + 冒烟脚本/QA 清单 |
| **C** | M4 领导 QTE | 领导巡查 + 预警 + QTE 高亮/顺序点击/错点/成败结算/波次推进 表现层 | build + 冒烟脚本完成一次 QTE + QA 清单 |
| **D** | M5 完整 Demo | 开始页 + 结束面板（4 结局）+ 素材状态切换 + 重开 + 调参 + QA 表 | 16 项 QA 表全过 + 连续可玩 3–5 分钟 |

**依赖关系**：A → B → C → D 顺序执行。每个任务结束都必须保证 `npm run validate` 与 `npm run build` 通过，且不破坏前一任务的验收项。

---

## 2. 全局铁律（每个 Prompt 都已内嵌，这里集中说明）

1. **数值零硬编码**：资源增减、衰减速率、计时器秒数、QTE 步数、阈值、结算 —— 一律从 `src/data/*.json` 读取，禁止在 TS 里重新声明。
2. **不改已定稿的数据**：`sceneObjects.json` 的坐标/hitbox/层级、`SCENE_LAYOUT.md` 的布局、各 JSON 的字段结构均已定稿；除非任务明确要求，不得改动。需要新增运行时数据时新建文件或在 core 内派生，不污染配置。
3. **资产只走映射层**：渲染时 `objectId + state → visuals.json → assetId → src/assets.ts(getAssetPath)`。不在场景类里写死素材路径。
4. **QTE 不新增交互对象**：QTE 只高亮 `computer/phone/takeout_box/files/protagonist/keyboard` 这 6 个已有对象，绝不绘制额外按钮/图标。
5. **没有底部动作按钮栏**：`bottom_message_bar` 只显示文字反馈；10 个平时动作 + 6 个 QTE 动作全部挂在场景对象本体上。
6. **状态机以文档为准**：`currentMode` 流转严格按《制作方案》§17 与 `docs/INTERACTION_FLOW.md` 的 18 类交互。
7. **每步收口**：任务完成前跑 `npm run validate`、`npm run build`、相关测试，全绿才算交付。

---

## 任务 A（M2）—— 纯逻辑内核 + 配置加载层 + 无头测试

**交付目标**：把整局游戏做成一个**完全不依赖 Phaser** 的可推进状态机，全部规则由配置驱动，并用 `vitest` 写无头单测把行为锁死。这是后续所有渲染任务的地基。

**范围内**：配置加载、类型、文案解析、资源衰减、动作执行、危险状态、波次参数、QTE 生成/点击/成败结算、buff 消费、结束判定、`tickGame` 主循环、单测。
**范围外**：任何 Phaser / 渲染 / DOM / 美术。`BootScene` 保持现状不动。

**验收标准**：`npm run validate` ✅；`npx tsc --noEmit` ✅；`npm run test:unit`（vitest）✅ 且覆盖下方所有断言；`src/core/**` 中 **没有任何** `import ... phaser`；core 中没有玩法数值字面量（增减/阈值/秒数都来自 config）。

### 【可直接交给 Claude Code 的 Prompt —— 任务 A】

````text
项目：横版办公室点击生存小游戏《假装正在工作》（Vite + TypeScript + Phaser）。
基本方案见仓库根目录《假装正在工作》Demo 制作方案.md（重点：§8 资源、§10 动作、§12 危险、§13 波次、§14 QTE、§17 状态机、§18.1 GameState）。
当前 M1 已完成：src/data/ 下 9 个 JSON 配置齐全且自洽，tools/validate-config.mjs 校验通过，tsc 通过。

本次任务（M2）：实现"完全不依赖 Phaser"的纯逻辑游戏内核，并用 vitest 无头单测锁死行为。不要碰任何渲染/Phaser 代码，BootScene 保持原样。

== 必须遵守的铁律 ==
1. 数值零硬编码：所有资源增减、衰减速率(baseDeltaPerSecond)、计时器秒数、QTE 步数、阈值、QTE 成败结算，一律从 src/data/*.json 读取，禁止在 TS 里重写字面量。
2. src/core/** 内禁止 import phaser。
3. 危险状态以 dangers.json 的 id（snake_case，如 unsafe_screen）为唯一键，用 Set<DangerId> 表示当前危险集合；不要再造 §18.1 里 unsafeScreen 这套 camelCase 平行命名（§18.1 仅作示意）。
4. 文案只通过点路径解析，不在 core 里写中文。

== 要创建的文件 ==
src/core/types.ts      —— GameMode 联合类型(START/NORMAL_PLAY/COMPUTER_PANEL/COWORKER_MENU/LEADER_WARNING/QTE_ACTIVE/QTE_SUCCESS/QTE_FAIL/RUN_END)、ResourceId、ActionId、DangerId、ObjectId、QteStepId、BuffId、EndReason、QteStep、GameState。ID 联合类型尽量从配置 key 派生或与之严格对齐。
src/core/config.ts     —— 用 resolveJsonModule import 全部 9 个 JSON，导出带类型的访问器（如 getAction(id)、getDanger(id)、getResource(id)、getWaveConfig(wave)、qteSteps、qteRules、qteOutcome、gameRules、coworkerWatchEffect、coworkerRescueEffect）。
src/core/text.ts       —— resolveCopyText(path: string): string | string[]（按 "." 分割逐层取值，支持数组数字索引）；pickFeedback(keys): string（多条时随机或取第一条）。规则：hoverTexts.* 返回 string，其余分类返回 string[]。
src/core/validation.ts —— validateConfigReferences(): string[]，复刻 tools/validate-config.mjs 的核心引用校验；导出供开发期调用（暂不强制在 core 里自动跑，但要可被调用）。
src/core/resources.ts  —— clamp 到 [min,max]；applyDelta(state, delta)；applyDecay(state, dt)（按各资源 baseDeltaPerSecond）。
src/core/dangers.ts    —— setDanger/clearDanger/hasDanger；listActiveDangersByPriority(state)（按 dangers.json.priority 升序）；workTrace 计时逻辑（阈值读 gameRules.workTrace：baseThresholdSeconds，超过 reducePerWaveAfter 波后每波 -reduceSecondsPerWave，不低于 minThresholdSeconds；超时则 setDanger('desk_empty')）；bodySlack filler 资格判定（读 gameRules.bodySlack）。
src/core/actions.ts    —— applyAction(state, actionId)：校验 allowedModes 是否匹配当前 currentMode（不匹配则拒绝并返回原因）；应用 delta、setDanger/clearDanger、setBuff/clearBuff；执行 switch_safe_work / organize_work_trace 时复位 workTraceTimer；返回 { ok, feedbackText }（feedback 来自 feedbackTextKeys）。
src/core/waves.ts      —— getCurrentWaveConfig(wave)：1–5 读 fixedWaves，≥6 在 wave6Plus 区间内取值（patrolInterval/warningTime/qteSteps）；computeWarningTime(state, base)：若持有 coworkerWatch buff，加 warningTimeBonus(1.5~2) 并消费该 buff（只作用一次）。
src/core/qte.ts        —— generateQteSteps(state, stepCount)：按 §14.4 优先级，先用真实危险状态对应的 qteStepId 生成（unsafe_screen→switch_safe_work, phone_lit→put_away_phone, takeout_open→put_away_takeout, desk_empty→organize_work_trace, body_slack→sit_up/type_keyboard）；步数不足截断低优先级；真实危险少于 stepCount 时用 filler(sit_up/type_keyboard，交替优先) 补齐；已清除的不重复。applyQteStepClick(state, clickedObjectId)：命中当前目标→清 clearsDanger、index+1、返回 success 文案；点错→剩余时间 - wrongClickPenaltySeconds(0.5)、不切步、不立即判负，返回 wrong 文案。applyQteSuccess(state) / applyQteFail(state)：读 qteOutcome 应用 delta；成功设 safeWindow=safeWindowSeconds；失败保留未完成危险(keepUnfinishedDangers)；失败时若持有 coworkerRescue，按 coworkerRescueEffect 把 trust 结算覆盖为 -5 并消费该 buff（只抵消一次 QTE 失败）。两者结束后 wave += 1。
src/core/state.ts      —— createInitialGameState()（资源初值读 resources.json，currentMode='NORMAL_PLAY' 或按需 'START'）；tickGame(state, dt)：推进 runTime、资源衰减、各计时器(nextLeaderPatrol/leaderWarning/qteRemaining/workTraceTimer/safeWindow)、触发 LEADER_WARNING→QTE_ACTIVE→成败→NORMAL_PLAY 的时间驱动转移、checkRunEnd()。checkRunEnd(state)：任一资源(含隐藏 coworkerSpirit)触底时设对应 endReason 并切 RUN_END。

== 测试与脚本 ==
- 添加 devDependency: vitest。package.json scripts 增加 "test:unit": "vitest run"；把 "test" 改为 "npm run validate && npm run test:unit"；保留 "validate"。
- .github/workflows/ci.yml 在 build 前增加一步运行 npm run test:unit。
- 在 src/core/__tests__/ 写单测，至少覆盖：
  1) createInitialGameState 的资源初值等于 resources.json。
  2) applyDecay：tick N 秒后各资源按 baseDeltaPerSecond 下降，且被 clamp。
  3) 10 个动作逐一：delta、setDanger/clearDanger、setBuff 与 actions.json 完全一致。
  4) allowedModes 门禁：COMPUTER_PANEL 专属动作在 NORMAL_PLAY 下被拒绝，反之亦然。
  5) workTrace：阈值随波次按 gameRules 递减且不低于下限；超时产生 desk_empty；organize_work_trace / switch_safe_work 复位计时器。
  6) generateQteSteps：单一危险、多危险按优先级、步数截断、现场干净时 filler 补齐、已清除不重复 —— 各一例（可参考 §14.8 组合示例）。
  7) 错点：剩余时间 -0.5s 且不判负、不切步。
  8) applyQteSuccess/Fail：结算等于 qteOutcome；成功 safeWindow=4；失败保留未完成危险；两者 wave+1。
  9) coworkerWatch 只给下一次预警加时一次然后消费；coworkerRescue 只把下一次 QTE 失败的 trust 抵消为 -5 然后消费。
  10) checkRunEnd：spirit/satiety/trust/coworkerSpirit 分别归零 → 正确 endReason 与 RUN_END。
  11) 整局冒烟：循环 tickGame 跑若干模拟秒不抛异常，最终能进入 RUN_END。

== 完成前自检（全绿才算交付）==
- npm run validate 通过
- npx tsc --noEmit 通过
- npm run test:unit 全过
- grep 确认 src/core 下无 phaser import；无玩法数值字面量（结算/阈值/秒数均来自 config）
完成后简要列出新增文件、测试用例数、以及任何与文档不一致而做出的判断。
````

---

## 任务 B（M3）—— Phaser 主场景渲染 + 普通玩法点击闭环

**交付目标**：把任务 A 的 `GameState` 渲染出来并接上真实点击。完成场景对象、顶部资源条、底部提示栏、电脑弹层、同事菜单，跑通 10 个平时动作。**领导/QTE 不在本任务**（领导先静态待在远处巡逻位即可）。

**范围内**：Preload 资源加载、GameScene 渲染（背景/8 个交互对象/领导静态）、顶/底 UI、hover 文案、点击 → `core.applyAction`、电脑弹层 4 页签、同事 4 气泡、危险视觉标记、`update()` 里调 `tickGame`、调试浮层。
**范围外**：领导预警、QTE、结束面板、开始页、平衡调参。

**验收标准**：build 通过；dev server 启动且浏览器控制台无报错；10 个平时动作全部能通过点击场景对象触发（无底部按钮栏）；资源条随状态变化且与调试浮层数值一致；危险标记按 `visuals.json` 出现在对应对象上；冒烟脚本（推荐）或带截图的 QA 清单逐条通过。

### 【可直接交给 Claude Code 的 Prompt —— 任务 B】

````text
项目同上。任务 A（src/core 纯逻辑内核 + vitest 单测）已完成并通过。
本次任务（M3）：用 Phaser 渲染主场景并接上 10 个平时动作的真实点击，驱动 core 的 GameState。不实现领导预警与 QTE（领导本任务只静态显示在远处巡逻位）。

== 必读 ==
docs/SCENE_LAYOUT.md（画布 1280x720、层级、UI 区域坐标、对象坐标/hitbox）、docs/INTERACTION_FLOW.md（第 1–11 节交互）、src/data/sceneObjects.json、src/data/visuals.json、src/assets.ts、docs/STYLE_GUIDE.md。

== 必须遵守的铁律 ==
1. 数值零硬编码：动作效果走 core.applyAction，不在场景里重算 delta；坐标/hitbox 从 sceneObjects.json 读，不写死。
2. 资产只走映射：渲染某对象的某状态时，objectId+state → visuals.json.objectVisuals → assetId → src/assets.ts 的 getAssetPath。禁止在场景类里写素材路径字符串。
3. 没有底部动作按钮栏：bottom_message_bar 只显示文字（hover 说明 / 点击反馈）。10 个动作全部挂在场景对象本体上。
4. 不改 core 的规则，也不改 sceneObjects.json 坐标。

== 要实现 ==
1) src/scenes/PreloadScene.ts：遍历 src/assets.ts 的 AssetPaths 全量预加载（SVG 用 load.svg 或 load.image，PNG 用 load.image）。main.ts 改为 scene: [PreloadScene, GameScene]，PreloadScene 完成后 start GameScene。BootScene 可保留或移除。
2) src/scenes/GameScene.ts：
   - 渲染层级严格按 SCENE_LAYOUT §2：background(办公室背景图) < midground(领导静态在 patrol_far) < interactables(8 对象) < ui < effects。
   - 用一个通用渲染助手 src/render/objectView.ts 按 sceneObjects.json 的 position/size 放置每个对象，并按 visuals.json 取初始 state 的图。
   - 为 clickableInNormal=true 的对象按其 hitbox 建矩形交互区（setInteractive + Geom.Rectangle）；hover 时 bottom_message_bar 显示该对象 hoverTextKey 文案；点击时调对应动作。
   - update(time, delta) 中调用 core.tickGame(state, delta/1000)，并把最新状态同步到 UI（资源条、危险标记、提示栏）。
3) 顶部状态栏 src/ui/StatusBar.ts：精神/饱腹/信任 三条图形资源条（按 0–100 比例）+ 存活时间 + 当前波次，不显示具体数字。
4) 底部提示栏 src/ui/MessageBar.ts：显示 hover 说明、点击反馈（core.applyAction 返回的 feedbackText）、资源低档暗示（可后置到任务 D，本任务先支持 hover+点击反馈）。
5) 电脑弹层 src/ui/ComputerPanel.ts：点击 computer → currentMode=COMPUTER_PANEL，居中弹出（坐标见 SCENE_LAYOUT computer_panel）。4 页签：文档/Excel/聊天/摸鱼。点文档/Excel/聊天 → applyAction('switch_safe_work')；点摸鱼 → applyAction('open_fishing_page')。点关闭或弹层外 → 回 NORMAL_PLAY。
6) 同事菜单 src/ui/CoworkerMenu.ts：点击 coworker → COWORKER_MENU，在其右上方弹 4 气泡（望风/求救/吐槽/安抚）→ 分别 applyAction('coworker_watch'/'coworker_rescue'/'coworker_complain'/'coworker_comfort')，执行后关闭回 NORMAL_PLAY。
7) 危险视觉标记：当 core 中某危险存在时，按 visuals.json 表现：phone_lit/takeout_open 用整图替换(phone_lit/takeout_open)；unsafe_screen/desk_empty 在对象上叠加 danger_marker（screen_fishing_glow / desk_clutter_warning_icon）。
8) 调试浮层 src/ui/DebugOverlay.ts：按 ` 键（或 D 键）切换，显示 spirit/satiety/trust/coworkerSpirit 精确值、currentMode、当前危险集合、wave、各计时器。用于 QA 验证。

== 验收与自检 ==
- npm run validate、npm run build 通过；npm run test:unit 仍全过。
- 启动 dev server，浏览器控制台无报错。
- 逐条验证（建议写 tools/smoke.mjs 用 puppeteer 无头加载页面：断言 canvas 存在、控制台无 error、对若干 hitbox 坐标模拟点击后调试浮层文本发生变化。若本机无法跑无头 Chromium，则改为手动 QA 并在 docs/QA_M3.md 记录每条结果+截图）：
  a) 点电脑 → 弹层；切摸鱼 → spirit↑ trust↓ 且 computer 出现 unsafe_screen 标记；切文档 → 标记消失、trust↑。
  b) 点手机 → phone_lit 标记出现、spirit↑ trust↓，仍在 NORMAL_PLAY。
  c) 点外卖 → takeout_open、satiety↑。点咖啡 → spirit↑ satiety↓，无持续标记。点文件 → 清 desk_empty（若有）、trust↑。
  d) 点同事 → 4 气泡 → 各动作生效（含隐藏 coworkerSpirit，看调试浮层）。
  e) 30 秒不操作，三条资源条持续下降。
  f) 全程没有底部动作按钮栏。
完成后列出新增文件与 QA 结果。
````

---

## 任务 C（M4）—— 领导巡查 + QTE 闭环表现层

**交付目标**：在已测通的 core 之上，做出领导巡查 + 预警 + QTE 的表现层，让"平时留下危险 → 领导来时整理现场"的核心循环成立。

**范围内**：领导沿 patrolAnchors 移动；预警 HUD + 倒计时；预警时强制关闭电脑弹层/同事菜单；QTE 高亮（仅 6 个对象）；顺序点击 → `core.applyQteStepClick`；错点红闪 + 倒计时抖动 + -0.5s；成功/失败结算与文案；安全窗口；波次推进；画面边缘变暗；望风/求救反馈。
**范围外**：开始页、结束面板、最终素材状态全切、调参（留给任务 D）。

**验收标准**：build + 单测通过；完整循环可玩（危险 → 预警 → 按优先级生成 QTE → 仅高亮 6 对象 → 顺序点清 → 成败结算反映到资源 → 波次+1 → 回 NORMAL_PLAY）；QTE 无额外按钮；现场干净也能用 filler 补成表演 QTE；错点不立即失败；望风延长下一次预警一次、求救软化下一次失败一次；冒烟脚本能在调试热键驱动下完整跑完一次 QTE。

### 【可直接交给 Claude Code 的 Prompt —— 任务 C】

````text
项目同上。任务 A（core 逻辑+单测）、任务 B（主场景+10 平时动作点击）已完成并通过。
本次任务（M4）：实现领导巡查与 QTE 的表现层，接通 core 中已实现并已测的波次/QTE 逻辑。所有时序与数值都来自 core 与配置，本任务只做"呈现 + 输入转发"。

== 必读 ==
docs/INTERACTION_FLOW.md（第 12–17 节）、《制作方案》§13 波次/§14 QTE、src/data/waves.json、qte.json、dangers.json、sceneObjects.json（leader.patrolAnchors、各对象 qteHighlightStyle/wrongClickFeedback）。

== 必须遵守的铁律 ==
1. QTE 不新增交互对象：只对 computer/phone/takeout_box/files/protagonist/keyboard 应用 qteHighlightStyle，不画任何额外按钮或目标图标。
2. 时序/步数/结算/优先级全部来自 core（getCurrentWaveConfig、generateQteSteps、applyQteStepClick、applyQteSuccess/Fail、computeWarningTime）与配置，不在场景里重算。
3. 错点不立即判负（qteRules.wrongClickImmediateFail=false），统一在倒计时结束判定。

== 要实现 ==
1) 领导对象表现：在 GameScene 中让 leader 按 sceneObjects.leader.patrolAnchors 在 NORMAL_PLAY 时于 patrol_far 区间巡逻；core 触发 LEADER_WARNING 时沿 approaching→checking 插值移动，QTE 结束沿 leaving 返回。leader 不可点击、无 hitbox。
2) 预警：core 进入 LEADER_WARNING 时——强制关闭 ComputerPanel/CoworkerMenu（回收其 UI）；显示 leader_warning_hud（坐标见 SCENE_LAYOUT，x24 y76 256x96）含倒计时（剩余时间来自 core.timers.leaderWarning）；effects 层画面边缘变暗渐入（位于 ui 之下，不遮挡 HUD/提示栏）。预警时长由 core.computeWarningTime 给出（已含 coworkerWatch 加时与消费）。
3) 进入 QTE：core 切 QTE_ACTIVE 后，从 core.qte.steps 取序列；对 steps[currentIndex].targetObjectId 应用该对象的 qteHighlightStyle（描边 #FFB000、发光、呼吸缩放），且该高亮常驻、优先于 hover；leader_warning_hud 同步显示当前步骤 promptTextKey 文案 + 剩余倒计时(core.timers.qteRemaining)。
4) 点击判定：QTE 期间点击任意对象 hitbox → 调 core.applyQteStepClick(objectId)。命中→该对象成功闪一下 + 提示栏显示 successText + 清除 clearsDanger 的视觉标记 + 高亮转移到下一步；点错→该对象播放 wrongClickFeedback 红闪(0.18s) + HUD 倒计时轻微抖动（core 已扣 0.5s）+ 提示栏显示 wrong 文案，序列不变。
5) 成败：core 判定 QTE_SUCCESS→HUD 显示巡查结束(systemMessages.qte_wave_success)、leader 离开、边缘变暗消退、应用结算（core 已做）、进入 safeWindow（提示 safe_window_start）、wave+1、回 NORMAL_PLAY。QTE_FAIL→HUD 显示发现异常(qte_wave_fail)、短暂停顿、未完成危险的视觉标记保留、应用结算、wave+1、leader 离开、回 NORMAL_PLAY。
6) 调试热键（便于确定性 QA）：按 L 立即触发一次领导巡查（把 nextLeaderPatrol 置 0）；调试浮层显示当前 QTE 序列与 currentIndex。

== 验收与自检 ==
- npm run validate / build / test:unit 全过。
- 冒烟脚本 tools/smoke.mjs（puppeteer，沿用任务 B 方式，无法跑则手动 QA 记入 docs/QA_M4.md）：
  a) 先点摸鱼+手机+外卖制造危险 → 按 L 触发巡查 → 断言生成的 QTE 步骤与危险按优先级一致（切回安全页→收手机→收外卖→…）。
  b) 现场干净时按 L → 断言生成 filler（整理工作痕迹/敲键盘/坐直）凑齐本波步数。
  c) 顺序点对全部步骤 → 断言 trust 上升、wave+1、回 NORMAL_PLAY。
  d) 故意点错一次 → 断言不立即失败、倒计时减少、序列不变。
  e) 倒计时耗尽留步未完成 → 断言失败结算、未完成危险标记仍在、wave+1。
  f) 先 coworker_watch 再触发巡查 → 断言下一次预警时间更长且 buff 被消费。
  g) coworker_rescue 后让一次 QTE 失败 → 断言 trust 只 -5 且 buff 被消费。
完成后列出新增文件与 QA 结果。
````

---

## 任务 D（M5）—— 开始/结束面板 + 素材状态切换 + 重开 + 调参 + QA 表

**交付目标**：补齐首尾流程与所有状态视觉切换，做第一轮平衡，落地完整 QA 表，交付可连续游玩 3–5 分钟的 Demo。

**范围内**：开始页（START）；结束面板（RUN_END，4 类 endReason 配对结局插画 + 存活时间 + 最高波次 + 随机结束陈述 + 重开按钮）；全部素材状态切换（手机/外卖/文件/电脑/主角/同事/领导/背景）；重开完全重置；资源低档提示 + 同事精神暗示 + 安全窗口反馈；第一轮调参；QA 表与文档。

**验收标准**：下方 16 项 QA 表全过 + 《制作方案》§21 验收；重开后状态完全重置；连续游玩 3–5 分钟成立；build + 全部测试通过；QA 结果写入 `docs/QA_CHECKLIST.md`。

### 【可直接交给 Claude Code 的 Prompt —— 任务 D】

````text
项目同上。任务 A/B/C 已完成并通过：core 逻辑、主场景+平时动作、领导+QTE 闭环都已就绪。
本次任务（M5）：补齐开始页与结束面板、全部状态素材切换、重开、首尾反馈与第一轮平衡，并落地完整 QA 表。

== 必读 ==
《制作方案》§9 单局流程、§11.3 同事归零、§15 UI 反馈、§16.3 归零文案、§21 验收标准；docs/INTERACTION_FLOW.md 第 18 节；src/data/copyText.json（endTexts/resourceWarnings/coworkerHints/systemMessages）、visuals.json、src/assets.ts（开始页/结局插画/背景 warning variant）。

== 必须遵守的铁律 ==
数值零硬编码（结束陈述、阈值、提示都从配置读）；资产只走 visuals.json/assets.ts 映射；不改 core 规则与 sceneObjects 坐标；调参只动 src/data/*.json，不动逻辑代码。

== 要实现 ==
1) 开始页（START）：用 start_screen_background，提供"开始"入口 → 进入 NORMAL_PLAY（core.createInitialGameState）。
2) 结束面板（RUN_END）src/ui/EndPanel.ts：core 检测任一资源归零进入 RUN_END 时——强制关闭所有子层（弹层/菜单/QTE 高亮）；按 end_panel 坐标居中弹出；显示存活时间(runTime)、最高波次、按 endReason 从 copyText.endTexts 随机取一条结束陈述、对应结局插画（SPIRIT_ZERO→end_spirit_alien、SATIETY_ZERO→end_satiety_shutdown、TRUST_ZERO→end_trust_desk_cleared、COWORKER_SPIRIT_ZERO→end_coworker_broadcast）、重新开始按钮；背后场景变暗作衬底。面板不出现"死亡/崩溃/Game Over"。
3) 重新开始：点击重开 → 用 core.createInitialGameState 完全重置所有状态/计时器/危险/buff/波次，回到 NORMAL_PLAY（或开始页），无残留。
4) 全部素材状态切换（按 visuals.json）：phone idle_off/phone_lit；takeout idle_closed/takeout_open；files idle_tidy/organized/desk_empty；computer 安全页/摸鱼页（弹层内容区切换）；protagonist idle_seated/body_slack/sit_up；coworker idle/watch/unstable（watch 在 coworkerWatch 生效期间，unstable 在 coworkerSpirit 低档）；leader patrol_far/approaching/checking/leaving；背景 base/warning variant（预警/QTE 期间切 warning）。
5) 首尾反馈：资源进入低档时 bottom_message_bar 出现 resourceWarnings 对应档位提示（healthy/dropping/critical，阈值自定一组并写入新建配置项或在 gameRules 增补，仍走配置读取）；coworkerSpirit 高/中/低档触发 coworkerHints 暗示（只通过提示栏，不显示数值）；QTE 成功后的安全窗口给出 safe_window_start 提示与可感知的视觉（如短暂柔光/HUD 提示）。
6) 第一轮平衡（只改 src/data/*.json 数值）：使新手能撑过第 1–2 波；第 3–4 波出现组合压力；第 5 波后明显紧张；避免"一直点同一个物件"成为最优解；咖啡不能完全替代摸鱼；文件整理不能无限保命；吃外卖要有时机风险；同事动作有价值但滥用推高隐藏风险（coworkerSpirit）。每次调参后跑 validate + 单测。

== 验收：16 项 QA 表（写入 docs/QA_CHECKLIST.md，逐条记录通过情况）==
1. 开局 30 秒不点击，三资源持续下降。
2. 点摸鱼页：spirit↑、trust↓、出现 unsafe_screen。
3. 点手机：出现 phone_lit。
4. 点外卖：satiety↑、出现 takeout_open。
5. 点文件：清除 desk_empty 且 workTraceTimer 复位。
6. 领导来时强制关闭电脑弹层与同事菜单。
7. QTE 优先用真实危险状态生成。
8. QTE 点错不立即失败，只扣时间。
9. QTE 成功后 trust↑、波次+1。
10. QTE 失败后未完成危险状态保留。
11. 同事望风只影响下一次预警。
12. 同事求救只抵消一次 QTE 失败结算。
13. 任一明示资源归零进入对应结束面板（含正确结局插画）。
14. 同事精神值归零进入同事异常结局。
15. 重开后所有状态完全重置。
16. 连续游玩 3–5 分钟，核心循环（平时摸鱼留下危险、领导来时整理现场）成立且可理解。

== 自检 ==
npm run validate / build / test:unit 全过；docs/QA_CHECKLIST.md 16 项全绿；列出本轮调参改了哪些 JSON 字段及理由。
````

---

## 3. 给你的执行建议

- **严格按 A→B→C→D 顺序**，一个任务一个 commit（或一个 PR），跑完该任务的验收再开下一个。任务 A 的无头单测是最大的安全垫，务必先把它做扎实。
- 每个 Prompt 都是自包含的，可直接整段贴给 Claude Code。可在每段开头补一句"工作目录是本仓库根目录"。
- 若某任务范围太大导致单次产出过长，可让 Claude Code"先列实现计划再写代码"，但**不要把一个里程碑拆成多个互相依赖的小会话**——会丢上下文、易写歪。
- 验收脚本（puppeteer 冒烟）是可选增强；若环境不便，退化为手动 QA + 截图并写入对应 `docs/QA_*.md` 即可，核心硬门仍是 `validate` + `build` + `test:unit`。
