# 第 0 步「准备阶段修补」执行计划与 Claude Code Prompt

> 生成日期：2026-06-29
> 适用仓库：`SageLys/moyu`（Vite + TypeScript + Phaser，分支 `main`）
> 约束：本阶段只做「闭合修补」，不写任何正式玩法逻辑，不新增方案外的资源/动作/对象/QTE。

---

## 一、对 ChatGPT 第 2 节问题的实地核对结论

我已逐项核对实际文件，结论如下（全部成立，另有 2 处补充发现）：

| 编号 | ChatGPT 指出的问题 | 实地核对 | 证据 |
|---|---|---|---|
| 2.1 | README 过时 | ✅ 属实 | `README.md` 仍写「pre-production scaffold…正式玩法代码需要等数据配置…再写」，但配置/布局/资产/`src/assets.ts` 均已存在 |
| 2.2 | `placeholderAsset` 指向不存在路径 | ✅ 属实 | `sceneObjects.json` 全部指向 `assets/placeholders/*.svg`；该目录只有 `.gitkeep`，真实素材在 `assets/svg/interactables/` 等 |
| 2.3 | `assetKey` 命名体系不闭合 | ✅ 属实 | `sceneObjects.assetKey` = `interactables.computer`（带点、单状态）；`src/assets.ts` 是扁平键 `computer`/`phone_idle`/`phone_lit`…；二者无法对应，且无「对象+状态→assetId」映射 |
| 2.4 | QTE 成功/失败结算未配置化 | ✅ 属实 | `DATA_SCHEMA.md` 第 4 节明确「尚未写入任何配置文件」；`INTERACTION_FLOW.md` 第 16/17 节却直接写死 精神-4/信任+6/安全窗口4s 与 精神-8/信任-15 |
| 2.5 | `coworkerRescue` 无消费规则 | ✅ 属实 | `actions.coworker_rescue` 置位 `coworkerRescue`；`waves.json` 只定义 `coworkerWatchEffect` 的消费，`coworkerRescue` 全仓无任何消费方 |
| 2.6 | `workTraceTimer` / `body_slack` 只停留在说明文字 | ✅ 属实 | `dangers.json` 中 `desk_empty` 阈值只写在 description；`body_slack` 生成逻辑只在 description |
| 2.7 | `body_slack` 同时被 `sit_up` 与 `type_keyboard` 清除，语义混乱 | ✅ 属实 | `qte.json` 两步 `clearsDanger` 都是 `body_slack` |
| 2.8 | `copyText` 结构说明与实际不符 | ✅ 属实 | `DATA_SCHEMA.md` 第 6 节称「所有分类下的值统一为字符串数组」；实际 `hoverTexts.objects`/`hoverTexts.actions` 是字符串 |
| 2.9 | 遗留旧设计文案「新的一天」 | ✅ 属实 | `copyText.json` 的 `systemMessages.run_start` / `run_restart_available` |
| 2.10 | 无测试/CI/配置校验 | ✅ 属实 | `package.json` 只有 dev/build/preview；无 `.github`；无校验脚本 |

补充发现（同属第 0 步应一并修掉）：

- **A.** `src/assets.ts` 头注释写「所有 assetKey 与 docs/ASSET_LIST.md 中的 assetId 一一对应」——但 `sceneObjects.assetKey` 是带点键、并不与之对应，注释本身在制造误导。
- **B.** `docs/ASSET_PLAN.md` 第 4.3 节仍写「`src/assets.ts` 当前尚未创建」——该文件已存在。

---

## 二、归并后的步骤设计（3 个一次性任务）

把 ChatGPT 第 0 步的 8 个子项 + 2 处补充，按「一类任务一次做完」归并为 3 个步骤，依赖顺序为 1 → 2 → 3：

- **步骤 1｜数据配置闭合（src/data 全部修完）**：覆盖 2.2 / 2.3 / 2.4 / 2.5 / 2.6 / 2.7 / 2.9。新增 `visuals.json`，移除失效的 `assetKey`/`placeholderAsset`，补 `qteOutcome`、`coworkerRescueEffect`、`gameRules.json`，明确 filler 语义，修文案。
- **步骤 2｜配置引用校验脚本 + CI（验证步骤 1 并守护未来改动）**：覆盖 2.10、并把 2.8 的「字符串/数组」规则做成强校验。产出 `tools/validate-config.mjs` + npm `validate` + GitHub Actions。
- **步骤 3｜文档与注释对齐**：覆盖 2.1、2.8（文档侧）、补充发现 A/B，并把步骤 1/2 新增的结构写进 `DATA_SCHEMA.md`。

为什么不再压缩成 2 步：数据、工具、文档是三种不同性质的产物，混在一个 prompt 会让 diff 噪声大、难以单独验收。三步各自对应一条 `npm` 或 `grep` 级别的明确验收命令。

---

## 三、可直接交付的 Claude Code Prompt

> 用法：把下面每个代码块整段复制给 Claude Code，按 1→2→3 顺序执行。每步结尾都给了「验收命令」，跑通再进入下一步。**三步全部完成前，不要开始任何正式玩法（M2 之后）的代码。**

---

### 步骤 1 — 数据配置闭合

```text
你在仓库 SageLys/moyu（Vite + TypeScript + Phaser）工作。这是《假装正在工作》Demo 的「准备阶段修补」第 1 步：只动 src/data 下的数据配置与 src/assets.ts，绝对不要写任何正式玩法逻辑、不新增方案外的资源/动作/对象/QTE 步骤。所有数值都必须来自现有文档，不得自行发明。

先通读这些文件再动手：src/assets.ts、src/data/sceneObjects.json、src/data/actions.json、src/data/dangers.json、src/data/qte.json、src/data/waves.json、src/data/copyText.json、docs/DATA_SCHEMA.md、docs/INTERACTION_FLOW.md、docs/ASSET_LIST.md。

请完成以下 6 项改动：

【1. 新增 src/data/visuals.json —— 唯一的「对象+状态 → 素材」映射层】
- 目标：闭合 assetKey 命名混乱问题。今后渲染层只从这里查「某对象某状态用哪个 assetId」。
- 顶层结构：
  {
    "_comment": "对象+状态 → src/assets.ts 中 AssetPaths 的扁平 assetId 映射。sceneObjects.json 只管 id/坐标/hitbox/交互；src/assets.ts 只管 assetId→文件路径；本文件负责 objectId+state→assetId。渲染层只读本文件，不再从 sceneObjects 读素材键。",
    "objectVisuals": { ... },
    "dangerOverlays": { ... }
  }
- objectVisuals：为 sceneObjects.json 里 9 个对象，把它们 normalStates / dangerStates 中出现的每个状态字符串，映射到 src/assets.ts AssetPaths 里真实存在的扁平 key。另需补上不在 normalStates 但确实有专属素材且会用到的状态：protagonist 的 "sit_up"（QTE 坐直，→ protagonist_sit_up）、coworker 的 "watch"（→ coworker_watch）与 "unstable"（→ coworker_unstable）、files 的 "organized"（整理后，→ files_organized）。
- 映射规则：
  · 有专属精灵图就做整图替换（如 phone: idle_off→phone_idle, phone_lit→phone_lit；takeout_box: idle_closed→takeout_closed, takeout_open→takeout_open；files: idle_tidy→files_normal, organized→files_organized；protagonist: idle_seated→protagonist_idle, body_slack→protagonist_slack, sit_up→protagonist_sit_up；coworker: idle→coworker_idle, watch→coworker_watch, unstable→coworker_unstable）。
  · 没有专属精灵图的对象（computer 只有 computer.svg；keyboard、coffee 单图；leader 只有 leader_silhouette），该对象所有状态都映射到同一张基础图；其「危险态」靠叠加层表现，不靠换图。
- dangerOverlays：把 dangers.json 里 5 个 visualState 值（screen_fishing_glow / phone_screen_lit / takeout_box_open_icon / desk_clutter_warning_icon / posture_slack_overlay）各映射到一个真实 AssetPaths key。能换专属精灵图表现的（phone_lit、takeout_open、body_slack→protagonist_slack）在 objectVisuals 已处理，这里给「无专属图、需叠加标记」的危险态指定 danger_marker；具体每个 visualState 用 danger_marker 还是已有精灵图，由你按上面规则判断后在 _comment 里一句话说明。
- 硬性要求：visuals.json 里出现的每个 assetId 值，都必须是 src/assets.ts AssetPaths 的真实 key（逐一核对，别写 ASSET_LIST 里没有的名字）。

【2. 清理 sceneObjects.json 里失效的素材字段】
- 删除全部 9 个对象的 "placeholderAsset" 字段（它指向不存在的 assets/placeholders/*.svg）。
- 删除全部 9 个对象的 "assetKey" 字段（带点旧键与 src/assets.ts 不对应，素材映射已由 visuals.json 接管）。
- 更新文件顶部 _comment：去掉关于 placeholderAsset / assetKey 的描述，改为一句「素材映射见 src/data/visuals.json；本文件只负责 id/坐标/hitbox/交互/视觉状态枚举」。
- 不要改动任何坐标、hitbox、clickable 字段。

【3. qte.json 补 QTE 成功/失败结算（来源：制作方案 14.9/14.10，与 INTERACTION_FLOW.md 第16/17节一致）】
- 在 qte.json 顶层（与 qteSteps、qteRules 平级）新增：
  "qteOutcome": {
    "success": { "delta": { "spirit": -4, "trust": 6 }, "safeWindowSeconds": 4 },
    "fail": { "delta": { "spirit": -8, "trust": -15 }, "keepUnfinishedDangers": true }
  }

【4. qte.json 补 coworkerRescue 消费规则（来源：ChatGPT 建议的简化规则）】
- 在 qte.json 顶层新增：
  "coworkerRescueEffect": {
    "consumesBuff": "coworkerRescue",
    "appliesToNextQteFailOnly": true,
    "overrideFailDelta": { "trust": -5 },
    "description": "持有 coworkerRescue 时，下一次 QTE 失败的信任值结算从 -15 抵消为 -5（其余结算不变），结算后立即清除该 buff。只抵消一次 QTE 失败，不抵消单次点错。"
  }

【5. 新增 src/data/gameRules.json + 明确 filler 语义（来源：制作方案 12.2/12.3）】
- 新建 src/data/gameRules.json：
  {
    "_comment": "工位太空计时器与人体不像工作 filler 的规则。程序侧读取本文件，不再把阈值写死在系统类里。",
    "workTrace": { "baseThresholdSeconds": 20, "minThresholdSeconds": 14, "reducePerWaveAfter": 3, "reduceSecondsPerWave": 1 },
    "bodySlack": { "enableAsQteFiller": true, "minWave": 1, "preferAlternatingSteps": true }
  }
- 在 qte.json 的 qteRules 内新增一个字段：`"fillerClearIsCosmetic": true`。
- 更新 dangers.json 中 body_slack 的 description，追加一句：「sit_up 与 type_keyboard 作为表演型 filler 步骤，其 clearsDanger 可幂等执行：第一步已清除 body_slack 后，第二步仍可作为表演补步正常完成。」
- 不要改动这两步的 clearsDanger 值本身。

【6. copyText.json 去掉旧设计「新的一天」遗留文案】
- systemMessages.run_start：["新的一天开始了，工位的计时器重新归零。"] → ["本次记录开始，工位计时器归零。"]
- systemMessages.run_restart_available：["可以重新开始这一天。"] → ["可以重新开始本次记录。"]
- 保持数组形式与冷静陈述句风格（不加感叹号、不加热梗）。

【不要做的事】
- 不要改 hoverTexts.objects / hoverTexts.actions 的「字符串」形态（保持字符串，这是期望终态，文档侧会在第 3 步对齐）。
- 不要新建 src/core/* 任何代码，不要改 BootScene/main.ts，不要实现 resolveCopyText 或任何系统类。

【验收命令（请逐条执行并贴出结果，全部通过才算完成）】
1) JSON 合法：`for f in src/data/*.json; do python3 -m json.tool "$f" > /dev/null && echo "OK $f"; done`
2) 字段已删除：`grep -Rn "placeholderAsset\|assetKey" src/data/sceneObjects.json` 必须无输出。
3) 新结构存在：`grep -l "qteOutcome" src/data/qte.json && grep -l "coworkerRescueEffect" src/data/qte.json && test -f src/data/visuals.json && test -f src/data/gameRules.json && echo ALL_PRESENT`
4) 旧文案已清除：`grep -Rn "新的一天\|这一天" src/data/copyText.json` 必须无输出。
5) visuals 引用都真实：用 node 写一段临时校验（可写进 /tmp 后删除），加载 visuals.json 与 src/assets.ts 的 AssetPaths key 集合，断言 objectVisuals/dangerOverlays 里每个 assetId 都在 AssetPaths 中；打印 "VISUALS_OK" 或列出非法 key。
6) 类型构建不破：`npm run build` 通过。
完成后用一句话总结改了哪些文件。
```

---

### 步骤 2 — 配置引用校验脚本 + CI

```text
你在仓库 SageLys/moyu 工作。这是「准备阶段修补」第 2 步：建立一个零依赖的配置引用校验脚本，并接入 CI。本步骤的目的是「让步骤 1 的所有配置自动可验收，并守护今后所有 JSON 改动」。不写任何玩法逻辑。

前提：步骤 1 已完成（src/data 下有 resources/actions/dangers/waves/qte/copyText/sceneObjects/visuals/gameRules.json，sceneObjects 已无 placeholderAsset/assetKey，qte.json 含 qteOutcome 与 coworkerRescueEffect）。先读这些文件确认现状再写脚本。

【1. 新建 tools/validate-config.mjs（Node ESM，纯 Node 内置模块，不装任何依赖）】
脚本需加载 src/assets.ts（用正则提取 AssetPaths 的 key 集合即可，不必编译 TS）与 src/data/*.json，内部实现一个 dot-path 解析器 resolveCopyText(path)（按 "." 逐层取值），然后做以下断言；每条失败都收集成一条可读错误信息，最后统一打印并以非零退出码结束，全部通过则打印 "CONFIG VALIDATION PASSED" 并以 0 退出：

引用完整性：
- actions.*.targetObjectId ∈ sceneObjects 的对象 id。
- actions.*.setDanger / clearDanger 每个值 ∈ dangers 的 id。
- actions.*.setBuff / clearBuff 每个值 ∈ 已知 buff 集合 { coworkerWatch, coworkerRescue }。
- actions.*.delta 的每个 key ∈ resources 的 id（spirit/satiety/trust/coworkerSpirit）。
- actions.*.hoverTextKey、feedbackTextKeys、allowedModes：前两者能在 copyText 解析到值；allowedModes ∈ { NORMAL_PLAY, COMPUTER_PANEL, COWORKER_MENU }。
- dangers.*.producedBy 每个值 ∈ (actions 的 id) ∪ { workTraceTimer_timeout, qte_filler_generation }（这两个是约定符号）。
- dangers.*.clearedBy 每个值 ∈ actions 的 id（允许空数组）。
- dangers.*.qteStepId 每个值 ∈ qteSteps 的 id。
- qteSteps.*.targetObjectId ∈ { computer, phone, takeout_box, files, protagonist, keyboard }（QTE 只许这 6 个对象）。
- qteSteps.*.clearsDanger ∈ dangers 的 id。
- qteSteps.*.promptTextKey、successTextKey、wrongTextKeys 都能在 copyText 解析到值。
- sceneObjects.*.hoverTextKey 能在 copyText 解析到值。
- visuals.objectVisuals 每个对象 id ∈ sceneObjects 的 id；其每个 state→assetId 的 assetId ∈ AssetPaths key。
- visuals.dangerOverlays 每个 key ∈ dangers 的 visualState 值集合；每个 value ∈ AssetPaths key。
- waves.coworkerWatchEffect.consumesBuff ∈ buff 集合；qte.coworkerRescueEffect.consumesBuff ∈ buff 集合。

结构/闭合性：
- 每个被 actions 置位的 buff（setBuff 收集到的集合）都必须有消费方：coworkerWatch 由 waves.coworkerWatchEffect.consumesBuff 消费，coworkerRescue 由 qte.coworkerRescueEffect.consumesBuff 消费。缺一报错。
- qte.qteOutcome.success/fail 存在，且 delta 的 key ∈ resources id；gameRules.workTrace / gameRules.bodySlack 存在。
- copyText 末端类型规则（对齐 2.8）：hoverTexts.objects.* 与 hoverTexts.actions.* 必须是 string；actionFeedbacks/qtePrompts/qteSuccess/qteWrong/resourceWarnings/coworkerHints/endTexts/systemMessages 的末端必须是 string[]。违反报错。
- sceneObjects 中 leader 的 clickableInNormal 与 clickableInQte 必须均为 false（方案硬约束）。

【2. package.json 接入脚本】
- scripts 增加 "validate": "node tools/validate-config.mjs"，并增加 "test": "npm run validate"。

【3. 新建 .github/workflows/ci.yml】
- 触发：push 与 pull_request。
- 步骤：actions/checkout → actions/setup-node（node 20）→ npm ci → npm run validate → npm run build。

【验收命令（逐条执行并贴结果）】
1) `npm run validate` 退出码 0，输出 "CONFIG VALIDATION PASSED"。
2) 负向自检：临时把 src/data/actions.json 里任意一个 targetObjectId 改成一个不存在的 id，跑 `npm run validate` 必须非零退出并打印对应错误；随后用 git 还原该改动，再次 `npm run validate` 回到通过。请把两次输出都贴出来。
3) `npm run build` 通过。
4) `node -e "require('js-yaml')" ` 不可用也没关系——只需确认 .github/workflows/ci.yml 存在且 YAML 缩进正确（可贴出文件内容供人工核对）。
完成后用一句话说明脚本覆盖了哪些断言类别。
```

---

### 步骤 3 — 文档与注释对齐

```text
你在仓库 SageLys/moyu 工作。这是「准备阶段修补」第 3 步：只更新文档与代码注释，使其与步骤 1/2 后的真实状态一致。不改任何 .json 数据、不改校验脚本、不写玩法逻辑。

前提：步骤 1/2 已完成（新增 visuals.json、gameRules.json；qte.json 含 qteOutcome 与 coworkerRescueEffect；sceneObjects 已无 placeholderAsset/assetKey；已有 tools/validate-config.mjs 与 npm run validate）。

请完成以下 4 处文档/注释修订：

【1. README.md（对齐 2.1）】
把当前「pre-production scaffold…正式玩法代码需要等…再写」相关描述，替换为反映真实阶段的说明，核心句采用：
「当前阶段：正式开发前准备已完成。工程空壳可运行，数据配置、场景布局、文案配置、资产清单与素材路径索引已建立，并提供配置引用校验（npm run validate）。下一阶段实现正式玩法闭环。」
保留安装/启动命令；删除「不包含资源衰减/动作系统/QTE…」这段已不再准确的否定式清单，或改写为「下一阶段（M2 起）才实现」。

【2. docs/ASSET_PLAN.md（对齐补充发现 B）】
第 4.3 节「src/assets.ts 当前尚未创建，将在…创建」——改为陈述它已存在并在维护。并补充「三层素材职责」一段：
- src/data/sceneObjects.json：只管对象 id / 坐标 / hitbox / 交互属性 / 视觉状态枚举；
- src/assets.ts：只管 assetId → 文件路径；
- src/data/visuals.json：负责 objectId + state → assetId 映射，渲染层只读它。
并注明 placeholderAsset 字段已从 sceneObjects.json 移除。

【3. docs/DATA_SCHEMA.md（对齐 2.8 文档侧，并补全新结构）】
- 把第 6 节「所有分类下的值统一为字符串数组」改为 CopyLeaf 规则：
  「copyText 末端类型为 CopyLeaf = string | string[]。hoverTexts.objects / hoverTexts.actions 为 string（hover 返回单条）；actionFeedbacks / qtePrompts / qteSuccess / qteWrong / resourceWarnings / coworkerHints / endTexts / systemMessages 为 string[]（运行时随机或取第一条）。resolveCopyText 需同时接受两种末端。」
- 把「七个配置文件」相关表述更新为「九个配置文件」，并新增 visuals.json 与 gameRules.json 的字段说明小节。
- 在 qte.json 小节补充 qteOutcome 与 coworkerRescueEffect 的字段说明；删除第 4 节末尾「QTE 成功/失败结算…尚未写入任何配置文件」那段过时声明，改为「已写入 qte.json 的 qteOutcome」。
- 更新第 7 节 sceneObjects 字段表：删除 placeholderAsset / assetKey 两行，新增一句指明素材映射改由 visuals.json 承载。
- 更新第 8 节引用关系图与第 9 节验收对照表，纳入 visuals.json、gameRules.json、qteOutcome、coworkerRescueEffect、以及「npm run validate 通过」这一验收项。

【4. src/assets.ts 头注释（对齐补充发现 A）】
把「所有 assetKey 与 docs/ASSET_LIST.md 中的 assetId 一一对应」这句，改为准确描述：
「本文件的 key 即 assetId（扁平命名），与 docs/ASSET_LIST.md 的 assetId 对应。对象+状态到 assetId 的映射在 src/data/visuals.json，不在本文件，也不在 sceneObjects.json。」

【验收命令（逐条执行并贴结果）】
1) `grep -Rn "尚未创建" docs/ASSET_PLAN.md` 应无输出（确认旧说法已清除）。
2) `grep -Rin "visuals.json\|gameRules.json\|qteOutcome\|coworkerRescueEffect\|CopyLeaf" docs/DATA_SCHEMA.md` 应能命中（确认新结构已写入文档）。
3) `grep -n "正式开发前准备已完成" README.md` 应命中。
4) `grep -n "一一对应" src/assets.ts` 命中的应是新表述（不再声称与 sceneObjects 的 assetKey 对应）。
5) `npm run validate && npm run build` 仍通过（确认文档步骤没误改数据/代码）。
完成后用一句话总结改了哪些文档。
```

---

## 四、完成后的状态与下一步

三步跑通后，可视为 ChatGPT 所说的 **M1：配置闭合版** 达成：

- 文档与配置不再互相打架；
- 素材映射体系（sceneObjects / assets.ts / visuals.json 三层）闭合；
- QTE 结算、coworkerRescue、workTrace/bodySlack 全部配置化；
- `npm run validate` 成为今后任何 JSON 改动的回归闸门。

**在三步全部验收通过前，不要进入 M2（纯逻辑闭环）及之后的玩法实现。** M1 完成后再按 ChatGPT 的「第 1 步：运行时类型与配置加载层 / 第 2 步：GameState 与纯逻辑系统」推进。
