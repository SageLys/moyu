# 初版原型体检报告 + 修复任务 Prompt（可直接复制给 Claude Code）

> 复核范围：M2–M5 已写入的全部源码（`src/core`、`src/scenes`、`src/render`、`src/ui`）、配置、文档、工具脚本与 git 状态。
> 目的：先记录所有发现的漏洞与问题，再给出一段可直接交给 Claude Code 的任务 Prompt：修复问题 → 确保原型可正常运转 → 提交一次 Git。

---

## 一、体检结论（先说好的部分）

工程链路是健康的，核心逻辑质量高：

- `npm run validate` ✅；`npx tsc --noEmit` ✅（全工程类型无错）；`npm run test:unit`（vitest）**84/84 ✅**；`vite build` ✅（在可写目录下能完整打包，40 模块）。
- `src/core` 纯逻辑层完整、零 Phaser 依赖、数值全部来自 `src/data/*.json`，单测覆盖资源/动作/危险/波次/QTE/结束判定，质量很好。
- Phaser 层结构清晰：Preload→GameScene，对象渲染走 `visuals.json`→`assets.ts` 映射，UI/HUD/弹层/结束面板/开始页齐全，`gameRules.feedback`（M5 新增档位阈值）与代码读取一致。

> 说明：本沙箱里 `npm run build`、`vitest` 曾因两个**环境问题**（npm 的 rollup 可选依赖缺失、`dist/` 目录 EPERM）报错，与代码无关。补装原生依赖、改输出目录后均通过。你（Claude Code）在用户本机正常 `npm install` 后不会遇到，若遇到 rollup 报错就删 `node_modules`+`package-lock.json` 重装。

**但是**：M2–M5 的全部代码尚未提交（`git log` 只有 2 个提交），且下面有一个会破坏核心循环可见性的 P0 缺陷。

---

## 二、问题清单（按严重度）

### 🔴 P0-1　QTE「成功」表现层失效——成功后画面卡死（核心缺陷）

**现象（点击完成 QTE 这一最常见路径）**：领导停在工位不再离开、屏幕边缘持续变暗不消退、没有"领导离开/安全窗口"反馈、左上预警 HUD 卡住显示上一条 QTE 提示与倒计时。**而且**第一次成功后领导停在 `checking` 阶段，之后每次预警 `LeaderView.approach()` 都会因 `phase` 已是 `checking` 而提前 return，领导动画彻底失效。

**根因**：`applyQteStepClick` 在最后一步命中时**同步**调用 `applyQteSuccess` 把 `currentMode` 置为 `QTE_SUCCESS`（发生在 Phaser 输入回调里）。随后每帧 `update()` 先跑 `tickGame`——`tickGame` 的 `QTE_SUCCESS` 分支会**无条件**把模式推进到 `NORMAL_PLAY`，这一切发生在 `GameScene.stepPresentation` 观察到 `QTE_SUCCESS` 之前。于是 `handleModeChange('QTE_SUCCESS')` 分支（负责 `leaderView.leave()`、`edgeDarken.fadeTo(0)`、安全窗口柔光、HUD 收尾）在点击成功路径上**永远不会执行**。
失败路径正常，是因为 `applyQteFail` 在 `tickGame` 内部触发，`stepPresentation` 当帧就能看到 `QTE_FAIL`。

**要求的修复结果**：点击完成一次成功 QTE 后，必须——领导沿 `leaving` 返回巡逻、`edgeDarken` 归 0、显示成功/安全窗口反馈、HUD 显示结语后自动隐藏、随后回到 `NORMAL_PLAY`；与失败路径对称。并新增回归断言（见修复 Prompt）。

**两种可选实现**（任选其一，保持 core 单测一致）：
- (a)【低风险，推荐】在 `onQteClick` 中当 `result.complete` 时直接驱动成功表现（此刻 `currentMode` 已是 `QTE_SUCCESS`），不改 core，`src/core/__tests__/state.test.ts` 保持绿；
- (b) 给 `QTE_SUCCESS`/`QTE_FAIL` 增加一个可配置的结算停留时长（`resultDwellSeconds` 写入 `qte.json` 并纳入校验），让两态持续到表现层能观察到，再回 `NORMAL_PLAY`——此法需同步更新 `state.test.ts` 中"下一 tick 即回 NORMAL_PLAY"的两个用例。

### 🟠 P1-2　电脑页签可重复刷资源（平衡漏洞）

**现象**：`ComputerPanel.selectTab` 每次点击都调用 `onAction`。因此连点同一页签、或在 文档/Excel/聊天 之间来回点（三者都映射 `switch_safe_work`）会**反复结算**：连点「摸鱼」每次 +14 精神，连点任一安全页每次 +8 信任。资源可被刷满，破坏平衡，并正中方案明令禁止的"最优解变成一直点同一个物件"。

**修复方向**：页签点击只在**真正发生页面切换**时才触发动作——仅当从摸鱼/不安全页切到安全页时触发 `switch_safe_work`，仅当从安全页切到摸鱼页时触发 `open_fishing_page`；在三个安全页之间切换、或重复点当前页，只切换显示内容、不结算。（在面板内记录当前页类别，或令 core 对"无状态变化"幂等不结算。）

### 🟠 P1-3　冒烟测试从未真正运行——Phaser 层零运行时验证

**现象**：`puppeteer` 不在 `devDependencies`，`tools/smoke.mjs` 与 `tools/smoke_m4.mjs` 检测不到 puppeteer 时直接 SKIP 退出 0。也就是说整个 Phaser 层从来只过了类型检查、**从未被真正运行/断言过**——这正是 P0-1 一直没被发现的原因。M4 冒烟的成功用例也只断言了 core 状态（trust/wave/mode），没断言领导离开/暗角消退等表现层。

**修复方向**：把 `puppeteer` 加入 `devDependencies`；提供能"起服务 + 跑两个冒烟"的脚本并实际跑通；为 P0-1、P1-2 增补表现层/防刷断言（见修复 Prompt 验收项）。

### 🟡 P2-4　README 严重过时

仍写着启动后只显示 `Pretend Working Demo - Preproduction Shell`、"M2 起才实现资源衰减/动作/QTE…"。与现状完全不符，会误导后续协作者。需重写。

### 🟡 P2-5　全部 M2–M5 未提交 + 资产迁移 + 脏目录

`git log` 仅 2 个提交，M2–M5 代码全在工作区未提交；素材已从 `assets/` 迁到 `public/assets/`（`assets.ts` 用 `/assets/...`，需由 Vite 的 `public/` 提供，这一步是对的，以暂存的 rename 形式存在）；另有两个未跟踪空目录 `C:moyu.githubworkflows/`、`C:moyutools/`（历史误建）。需清理脏目录、确认 `.gitignore` 覆盖 `node_modules/`、`dist/`，最后做一次完整提交。

### ⚪ P2-6　可选硬化（快则做，不阻塞）

- `window.__game` 调试 API 与 `manualTick` 在生产构建里也暴露——可用 `import.meta.env.DEV` 收口。
- `validateConfigReferences()` 已在 `src/core/validation.ts` 实现，但运行时启动从未调用——可在 dev 启动时跑一次，发现问题 `console.error`。
- `tickWorkTrace` 在 `LEADER_WARNING`/`QTE_ACTIVE` 期间仍累加，可能在 QTE 中途凭空生成 `desk_empty` 并遗留——可考虑这两态暂停累加。

---

## 三、可直接复制给 Claude Code 的修复任务 Prompt

> 直接整段复制下面代码块内的内容交给 Claude Code 执行。

````text
工作目录为本仓库根目录（C:\moyu）。这是一个 Vite + TypeScript + Phaser 的横版办公室点击生存小游戏《假装正在工作》。
M2–M5 玩法代码已写好：src/core 是纯逻辑内核（已被 vitest 覆盖），src/scenes、src/render、src/ui 是 Phaser 表现层。
基本方案见《假装正在工作》Demo 制作方案.md；交互流程见 docs/INTERACTION_FLOW.md；布局见 docs/SCENE_LAYOUT.md。

本次任务：修复下列已定位的问题，确保初版原型能真正跑起来并通过端到端冒烟，更新 README，最后提交一次 git。全程遵守铁律：玩法数值零硬编码（从 src/data/*.json 读取）、资产只走 visuals.json→assets.ts 映射、QTE 不新增交互对象、无底部动作按钮栏。

== 必须修复 ==

[P0-1] QTE「成功」表现层失效（最高优先）。
根因：applyQteStepClick 在最后一步命中时同步调用 applyQteSuccess 把 currentMode 置为 'QTE_SUCCESS'（在输入回调里）；随后每帧 update() 先跑 tickGame，会无条件把 QTE_SUCCESS 推进到 NORMAL_PLAY，发生在 GameScene.stepPresentation 观察到 QTE_SUCCESS 之前——因此 handleModeChange('QTE_SUCCESS') 分支（leaderView.leave / edgeDarken.fadeTo(0) / 安全窗口柔光 / HUD 收尾）在点击成功路径上永远不执行。失败路径正常（applyQteFail 在 tickGame 内触发）。
后果：成功后领导卡在工位不离开、屏幕边缘持续变暗、无"领导离开/安全窗口"反馈、预警 HUD 卡住；且第一次成功后 LeaderView.phase 停在 'checking'，之后 approach() 提前 return，领导动画彻底失效。
要求修复结果：点击完成一次成功 QTE 后，领导必须沿 leaving 返回巡逻、edgeDarken 归 0、显示成功/安全窗口反馈、HUD 显示结语后自动隐藏、随后回到 NORMAL_PLAY；与失败路径对称，且能连续多波正常循环。
实现可任选其一，但必须保持 core 单测一致：
  (a)【推荐，低风险】在 GameScene.onQteClick 中当 result.complete 为真时直接驱动成功表现（此刻 currentMode 已是 QTE_SUCCESS），不改 core 时序，src/core/__tests__/state.test.ts 保持不变；注意避免与随后 tickGame 自动转 NORMAL_PLAY 重复触发或互相覆盖。
  (b) 给 QTE_SUCCESS/QTE_FAIL 增加可配置结算停留时长 resultDwellSeconds（写入 src/data/qte.json，并在 tools/validate-config.mjs 与 src/core/validation.ts 中校验），让两态持续到表现层可观察，再回 NORMAL_PLAY；若用此法，必须同步更新 state.test.ts 中"下一 tick 即回 NORMAL_PLAY"的两个用例与相关断言。

[P1-2] 电脑页签可重复刷资源（平衡漏洞）。
现象：ComputerPanel.selectTab 每次点击都调用 onAction，连点同一页签或在 文档/Excel/聊天（都映射 switch_safe_work）之间来回点会反复结算；连点「摸鱼」每次 +14 精神、连点安全页每次 +8 信任，可刷满资源。
要求修复：页签点击只在真正发生页面切换时才触发动作——仅当从摸鱼/不安全页切到安全页时触发 switch_safe_work；仅当从安全页切到摸鱼页时触发 open_fishing_page；在三个安全页之间切换或重复点当前页，只切换显示内容、不结算。实现可在面板内记录当前页类别（safe/fishing）来判定，或令 core 对无状态变化的动作幂等不结算（二选一，保持数值仍来自配置）。

[P1-3] 让冒烟测试真正可运行并通过。
现象：puppeteer 不在 devDependencies，tools/smoke.mjs 与 tools/smoke_m4.mjs 检测不到 puppeteer 即 SKIP；Phaser 层从未真正运行过。
要求：
  - 把 puppeteer 加入 devDependencies 并安装。
  - 在 package.json 增加脚本，能"构建/起本地服务 + 依次跑两个冒烟"，例如：
      "test:smoke": "node tools/run-smoke.mjs"
    （可自行实现 run-smoke.mjs：用 vite preview 或 dev 起服务、设 PREVIEW_URL、依次运行 smoke.mjs 与 smoke_m4.mjs、结束后关服务并按退出码汇总。或用 start-server-and-test 类方案，但优先零额外依赖。）
  - 必须实际跑通两个冒烟（不是 SKIP）。
  - 为本次修复补充端到端断言：
      * P0-1 回归：制造危险→triggerPatrol→点对全部 QTE 步骤→advance 一小段后，断言 edgeDarken 已消退（暗角 alpha≈0）、领导已离开 checking（回到 patrol 阶段/接近 patrol_far）、预警 HUD 在结语停留后已隐藏，且能在同一局内连续完成第二次 QTE 成功（验证 approach 不再被卡住）。为支持断言，可在 window.__game 调试 API 上暴露只读的表现层状态（如 leaderPhase、edgeDarkenAlpha、hudVisible），仅供测试使用。
      * P1-2 防刷：打开电脑弹层，连点「摸鱼」两次，断言精神值只上升一次的量；在三个安全页之间切换多次，断言信任值只上升一次的量。

== 必须完成（文档与提交）==

[P2-4] 重写 README.md，反映现状：可玩的横版办公室点击生存 Demo。包含：一句话玩法；安装与运行（npm install / npm run dev / npm run build / npm run preview）；操作说明（开始页点"开始"；点电脑开弹层切页签；点手机/外卖/咖啡/文件触发平时动作；点同事开 4 气泡；领导预警后按顺序点高亮物件完成 QTE；调试：L 键立即触发巡查、反引号/D 键切换调试浮层）；如何校验与测试（npm run validate / npm run test:unit / npm run test:smoke）；当前里程碑（M5 完整 Demo）。不得再出现 "Preproduction Shell" 等过时表述。

[P2-5] 清理与提交：
  - 删除两个未跟踪空目录：C:moyu.githubworkflows、C:moyutools（确认为空且未被 git 跟踪后删除）。
  - 确认 .gitignore 覆盖 node_modules/ 与 dist/（已覆盖则不动）。
  - 确认素材迁移到 public/assets 后路径仍正确（assets.ts 用 /assets/...，由 Vite public/ 提供；dev 与 preview 下资源都能 200 加载）。
  - 最后用一次提交收口（暂存全部改动）。建议信息：
      feat: 完成《假装正在工作》可玩 Demo（M2–M5）并修复 QTE 成功表现/页签刷资源/冒烟可运行
    若改动较大，可拆成 fix(qte) / fix(computer-panel) / test(smoke) / docs(readme) 多个提交，但最终工作区必须干净。

== 可选硬化（快则做，不阻塞验收；做了请在提交说明里注明）==
  - 用 import.meta.env.DEV 收口 window.__game 调试 API 与 manualTick，避免生产构建暴露内部。
  - dev 启动时调用一次 validateConfigReferences()，有问题 console.error。
  - LEADER_WARNING / QTE_ACTIVE 期间暂停 tickWorkTrace 累加，避免 QTE 中途凭空生成 desk_empty。

== 验收（全部为硬门，必须全绿后才提交）==
  1. npm run validate 通过。
  2. npx tsc --noEmit 通过。
  3. npm run test:unit 全过（若选 P0-1 方案 b，已同步更新相关用例）。
  4. npm run build 通过。
  5. npm run test:smoke 真正运行（非 SKIP）且两个冒烟全过，含本次新增的 P0-1 回归与 P1-2 防刷断言。
  6. 手动确认（或在冒烟中覆盖）：连续完成至少两波 QTE 成功，领导每次都正常离开、暗角每次都消退、HUD 正常收尾；电脑页签不能刷资源。
完成后简要列出：改了哪些文件、P0-1 采用了 (a) 还是 (b)、新增/调整了哪些断言、最终 git 提交哈希与一句话说明。
````

---

## 四、给你的提醒

- P0-1 是这次最关键的修复：它决定"平时留危险→领导来整理→领导离开"这个核心循环在第二波之后还能不能正常呈现。务必让 Claude Code 先修它并用冒烟回归锁死。
- P1-3（让冒烟真正跑起来）和 P0-1 是一体的：没有可运行的端到端测试，类似的表现层缺陷以后还会再漏。建议从此把 `npm run test:smoke` 纳入交付前的固定步骤。
- 提交前的硬门顺序：`validate → tsc → test:unit → build → test:smoke` 全绿，再 commit。
