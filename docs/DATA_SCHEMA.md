# 数据配置说明（DATA_SCHEMA）

本文档解释 `src/data/*.json` 九个配置文件的字段含义、可调范围和引用方式。

来源文档：

- 《假装正在工作》Demo 制作方案.md（玩法数值与系统设计）
- 假装正在工作_文案风格定稿说明.md（文案语气规则）
- docs/TECH_DECISION.md（工程约束）

本阶段只产出配置文件和本说明文档，不实现正式玩法逻辑、不接入场景坐标。

## 0. 通用规则

1. **ID 使用英文 snake_case**：例如 `switch_safe_work`、`unsafe_screen`、`takeout_box`。唯一例外是四个资源 id（`spirit`/`satiety`/`trust`/`coworkerSpirit`），它们直接对应制作方案 18.1 节 `GameState` 类型里的字段名（`coworkerSpirit` 是 camelCase），保持和未来 TypeScript 状态对象字段一致，便于直接映射，不再额外转换命名风格。
2. **中文显示文本只放在 `displayName` 或 `copyText.json` 里**，不出现在其他字段（如 `id`、`role`、`actionType`）中。
3. **后续代码不得硬编码动作数值**（资源增减、计时器秒数、QTE 步数等），必须从对应 JSON 读取。
4. **后续代码应优先读取 `src/data/*.json`**，而不是在场景类、系统类里重新声明一份数值。
5. 本步骤不写正式玩法逻辑，因此部分在制作方案里出现、但缺乏明确归属字段的动态判定（例如工位太空计时器的具体阈值、人体不像工作的填充判定逻辑）**没有**固化成数值字段，只在对应配置的 `description` 里说明触发条件，留给后续实现步骤决定承载方式。这不是遗漏，是有意保留给系统实现阶段。

### copyText 引用约定

`actions.json`、`qte.json`、`sceneObjects.json` 中所有指向文案的字段（`hoverTextKey`、`feedbackTextKeys`、`promptTextKey`、`successTextKey`、`wrongTextKeys`）统一使用「点路径字符串」定位 `copyText.json` 内的值，格式为 `分类.子分类.id` 或 `分类.id.索引`。

例如：

- `"hoverTexts.actions.switch_safe_work"` → `copyText.json.hoverTexts.actions.switch_safe_work`
- `"actionFeedbacks.switch_safe_work.0"` → `copyText.json.actionFeedbacks.switch_safe_work` 数组的第 0 项
- `"qteWrong.generic.1"` → `copyText.json.qteWrong.generic` 数组的第 1 项

程序侧建议实现一个通用的 `resolveCopyText(path: string)` 工具函数（按 `.` 分割逐层取值），而不是为每个分类单独写一套读取逻辑。这个工具函数本身属于「程序内部使用」的实现细节，不在本次配置文件范围内。

---

## 1. resources.json

对应制作方案第 8 节。描述精神值、饱腹值、信任值、同事精神值四项资源。

顶层结构：`{ resources: { <resourceId>: {...} } }`

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `id` | string | 程序内部（标识符，改动需同步检查所有引用） | 资源标识，对应 GameState 字段名 |
| `displayName` | string | 策划可调 | 中文显示名，用于顶部资源条等 UI |
| `initialValue` | number | 策划可调 | 单局开始时的初始值 |
| `min` | number | 策划可调 | 数值下限，触底即视为该资源归零 |
| `max` | number | 策划可调 | 数值上限 |
| `baseDeltaPerSecond` | number | 策划可调 | 不触发任何动作时的每秒自然变化（衰减为负数） |
| `visible` | boolean | 策划可调 | 是否在顶部资源条显示；`coworkerSpirit` 为 `false`，只通过 `copyText.json` 的 `coworkerHints` 在底部提示栏暗示 |
| `description` | string | 策划可调（说明性，不参与计算） | 资源含义与归零方向的简述，便于后续实现时核对设计意图 |

程序侧约束：UI 只能渲染图形条，不得显示具体数值或百分比（制作方案 8.1、15.1）。

---

## 2. actions.json

对应制作方案第 10、11 节。描述 10 个平时动作。

顶层结构：`{ actions: { <actionId>: {...} } }`

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `id` | string | 程序内部 | 动作标识，snake_case |
| `displayName` | string | 策划可调 | 中文动作名 |
| `targetObjectId` | string | 程序内部 | 对应 `sceneObjects.json` 中的对象 id，点击该对象触发本动作 |
| `actionType` | string | 程序内部（枚举） | 动作分类，取值：`computer_toggle`（电脑页签切换）/ `device_danger`（产生桌面危险状态的物件动作）/ `resource_trade`（资源互换，不产生危险状态）/ `tidy_action`（清理危险状态）/ `coworker_interaction`（同事菜单动作）。程序按 `actionType` 决定要不要联动 `computerState` 或同事气泡菜单，而不是逐个动作写分支判断 |
| `delta` | object | 策划可调 | 对 `spirit`/`satiety`/`trust`/`coworkerSpirit` 的增减量，缺省字段视为 0 |
| `setDanger` | string[] | 策划可调 | 执行后置位的危险状态 id 列表（对应 `dangers.json`） |
| `clearDanger` | string[] | 策划可调 | 执行后清除的危险状态 id 列表 |
| `setBuff` | string[] | 策划可调 | 执行后置位的 buff（目前只有 `coworkerWatch`、`coworkerRescue`，对应 GameState 18.1 节 `buffs`） |
| `clearBuff` | string[] | 策划可调 | 执行后清除的 buff。本版动作均不在自身清除 buff，`coworkerWatch` 由领导波次系统在消耗后清除（见 `waves.json` 的 `coworkerWatchEffect`） |
| `hoverTextKey` | string | 程序内部（指向 copyText） | 鼠标悬停该动作对应对象时显示的说明文案 |
| `feedbackTextKeys` | string[] | 程序内部（指向 copyText） | 点击后随机或轮换显示的结果文案，可有多条变体 |
| `allowedModes` | string[] | 策划可调 | 该动作允许在哪些 `currentMode` 下触发。电脑两个动作只在 `COMPUTER_PANEL` 下可点；四个同事动作只在 `COWORKER_MENU` 下可点；其余四个桌面动作在 `NORMAL_PLAY` 下直接可点 |

数值来源：制作方案 10.2 节调参表。

---

## 3. dangers.json

对应制作方案第 12 节。描述 5 个现场危险状态。

顶层结构：`{ dangers: { <dangerId>: {...} } }`

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `id` | string | 程序内部 | 危险状态标识 |
| `displayName` | string | 策划可调 | 中文名 |
| `producedBy` | string[] | 程序内部（引用 actions.json 或特殊符号 id） | 触发该危险状态的来源。多数指向 `actions.json` 里的动作 id；`desk_empty` 由计时器产生，`body_slack` 由 QTE 填充判定产生，两者使用特殊符号 id（`workTraceTimer_timeout`、`qte_filler_generation`），不是真实存在的动作，仅作语义标记，程序需要单独识别这两个符号 |
| `clearedBy` | string[] | 程序内部（引用 actions.json） | 平时动作中可以直接清除该危险状态的动作 id；`phone_lit`、`takeout_open`、`body_slack` 没有对应的平时清除动作，只能在 QTE 中清除，因此为空数组 |
| `qteStepId` | string[] | 程序内部（引用 qte.json） | 能清除该危险状态的 QTE 步骤 id。统一使用数组，即使只对应一个步骤；`body_slack` 对应两个步骤（`sit_up`、`type_keyboard`） |
| `priority` | number | 策划可调 | QTE 生成时的优先级，数字越小越先纳入 QTE（对应制作方案 14.4 节） |
| `visualState` | string | 程序内部（视觉状态标记 key） | 物件需要叠加的危险视觉标记标识，供渲染层使用，不是具体的美术资源路径 |
| `description` | string | 策划可调（说明性） | 产生 / 清除条件的文字说明，尤其用于解释 `desk_empty`、`body_slack` 的非动作触发机制 |

---

## 4. waves.json

对应制作方案第 13 节。描述领导巡查波次参数。

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `fixedWaves` | array | 策划可调 | 第 1～5 波的固定参数表，每项含 `wave`（波次号）、`patrolInterval`（巡查间隔，秒）、`warningTime`（预警时间，秒）、`qteSteps`（QTE 步数） |
| `wave6Plus` | object | 策划可调 | 第 6 波及以后取值区间：`patrolIntervalMin/Max`、`warningTimeMin/Max`、`qteStepsMin/Max`，程序在区间内循环或随机取值 |
| `progressionRules` | object | 策划可调（标志位）+ 说明 | `increaseWaveOnSuccess`、`increaseWaveOnFail` 控制波次推进时机；`description` 字段补充文字说明，不参与计算 |
| `coworkerWatchEffect` | object | 策划可调 | 「请同事望风」动作对下一次预警时间的加成：`consumesBuff` 指明消耗的 buff id（`coworkerWatch`），`warningTimeBonusMin/Max` 是加成秒数区间，`appliesToNextWarningOnly` 标记只生效一次 |

QTE 成功 / 失败的资源结算数值已写入 `qte.json` 的 `qteOutcome`（见第 5 节）。

---

## 5. qte.json

对应制作方案第 14 节。描述 6 个 QTE 步骤与生成规则。

顶层结构：`{ qteSteps: { <stepId>: {...} }, qteRules: {...} }`

`qteSteps` 字段：

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `id` | string | 程序内部 | QTE 步骤标识 |
| `displayName` | string | 策划可调 | 中文名 |
| `targetObjectId` | string | 程序内部 | 对应 `sceneObjects.json` 对象 id，只能是 `computer`/`phone`/`takeout_box`/`files`/`protagonist`/`keyboard` 之一 |
| `clearsDanger` | string | 程序内部（引用 dangers.json） | 该步骤完成后清除的危险状态 id |
| `layer` | string（枚举：`screen`/`desk`/`body`） | 策划可调 | 对应制作方案 14.2 节三个伪装层级：屏幕像在工作 / 桌面像在工作 / 人像在工作 |
| `promptTextKey` | string | 程序内部（指向 copyText） | 该步骤成为当前目标时显示的提示文案 |
| `successTextKey` | string | 程序内部（指向 copyText） | 该步骤点击成功时显示的文案 |
| `wrongTextKeys` | string[] | 程序内部（指向 copyText） | 点错目标时随机显示的文案池，当前 6 个步骤共用 `qteWrong.generic` 三条通用文案 |

`qteRules` 字段：

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `qteMaxSteps` | number | 策划可调 | 单次 QTE 步数上限（制作方案 14.5：最高 5 步） |
| `wrongClickPenaltySeconds` | number | 策划可调 | 点错一次扣减的倒计时秒数 |
| `wrongClickImmediateFail` | boolean | 策划可调 | 是否点错立即判负；当前为 `false`，统一在倒计时结束后判定 |
| `generateFromRealDangersFirst` | boolean | 策划可调 | QTE 生成时是否优先使用真实存在的危险状态 |
| `fillerSteps` | string[] | 策划可调 | 当真实危险状态数量不足时用于补齐步数的步骤 id（`sit_up`、`type_keyboard`） |
| `priorityBasedOnDangers` | boolean | 策划可调 | 是否按 `dangers.json` 里的 `priority` 排序生成 QTE 步骤顺序 |

`qteOutcome` 字段（顶层，与 `qteSteps`/`qteRules` 并列）：

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `success.delta` | object | 策划可调 | QTE 全程通过后的资源增减（当前：`spirit: -4, trust: +6`） |
| `success.safeWindowSeconds` | number | 策划可调 | QTE 通过后的安全窗口时长（秒，领导不触发新预警） |
| `fail.delta` | object | 策划可调 | QTE 失败（倒计时归零）后的资源增减（当前：`spirit: -8, trust: -15`） |
| `fail.keepUnfinishedDangers` | boolean | 策划可调 | QTE 失败后未清除的危险状态是否保留 |

`coworkerRescueEffect` 字段（顶层）：

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `consumesBuff` | string | 程序内部 | 触发救援效果需要消耗的 buff id（`coworkerRescue`） |
| `appliesToNextQteFailOnly` | boolean | 策划可调 | 只对紧接的下一次 QTE 失败生效，结算后立即清除 buff |
| `overrideFailDelta` | object | 策划可调 | 持有 buff 时 QTE 失败的替换结算（当前只覆盖 `trust: -5`，其余字段不变） |

---

## 6. copyText.json

对应制作方案第 16 节与《假装正在工作_文案风格定稿说明.md》全文。第一版文案 key，按九大类组织：

| 分类 | 内容 | 引用来源 |
|---|---|---|
| `hoverTexts.objects` / `hoverTexts.actions` | 悬停说明，前者是对象通用说明，后者是动作专属说明 | `sceneObjects.json.hoverTextKey`、`actions.json.hoverTextKey` |
| `actionFeedbacks` | 点击动作后的结果反馈，每个动作一个字符串数组 | `actions.json.feedbackTextKeys` |
| `qtePrompts` | QTE 当前步骤提示 | `qte.json.promptTextKey` |
| `qteSuccess` | QTE 单步成功反馈 | `qte.json.successTextKey` |
| `qteWrong` | QTE 点错反馈，当前只有 `generic` 一组三条通用文案 | `qte.json.wrongTextKeys` |
| `resourceWarnings` | 精神值 / 饱腹值 / 信任值三档（`healthy`/`dropping`/`critical`）提示。`coworkerSpirit` 不在此处，走 `coworkerHints` | 资源系统按当前数值档位读取 |
| `coworkerHints` | 同事精神值三档模糊暗示（`high`/`medium`/`low`），不显示具体数值 | 同事系统按隐藏数值档位读取 |
| `endTexts` | 四种归零结束陈述：`spirit_zero`（可出现外星人）、`satiety_zero`（不出现外星人）、`trust_zero`（职场委婉表达）、`coworker_spirit_zero`（同事异常事件） | 结束系统按 `endReason` 读取 |
| `systemMessages` | 状态机层面的通用提示（领导出现、预警开始、QTE 整体成功/失败、安全窗口开始、波次提高、单局开始/可重开），本版为首批原创短句，后续可扩充变体 | 领导波次系统、状态机 |

copyText 末端类型为 `CopyLeaf = string | string[]`。`hoverTexts.objects` / `hoverTexts.actions` 为 `string`（hover 返回单条）；`actionFeedbacks` / `qtePrompts` / `qteSuccess` / `qteWrong` / `resourceWarnings` / `coworkerHints` / `endTexts` / `systemMessages` 为 `string[]`（运行时随机或取第一条）。`resolveCopyText` 需同时接受两种末端。

文案风格强制规则（违反即视为不合规）：

1. 冷静陈述句，不使用感叹号。
2. 不使用网络热梗。
3. 不直接写主角心理活动。
4. 精神值归零可以出现外星人；饱腹值归零不出现外星人；信任值归零使用职场委婉表达；同事精神值归零表现同事异常事件。
5. 底部提示栏（`hoverTexts`、`actionFeedbacks`、`resourceWarnings`、`coworkerHints`）文案尽量短句，控制在一行内。

---

## 7. sceneObjects.json

对应制作方案第 7 节。描述 9 个场景对象。坐标 / 摆放位置不在本步骤写入，留给后续步骤补充（届时建议新增 `position` 或类似字段，不改变现有字段含义）。

顶层结构：`{ sceneObjects: { <objectId>: {...} } }`

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `id` | string | 程序内部 | 对象标识 |
| `displayName` | string | 策划可调 | 中文名 |
| `role` | string（枚举） | 程序内部 | 对象在系统里的功能分类：`screen_disguise`（电脑，屏幕伪装层）、`qte_body_prop`（键盘、主角本体，仅 QTE 人像层使用）、`desk_item`（手机、外卖盒、咖啡杯、文件堆，桌面物件）、`coworker_menu_trigger`（同事，打开气泡菜单）、`visual_pressure_source`（领导，视觉压力源，不可点击） |
| `clickableInNormal` | boolean | 策划可调 | 是否在 `NORMAL_PLAY` 下可直接点击 |
| `clickableInQte` | boolean | 策划可调 | 是否可作为 QTE 目标。只有 `computer`/`phone`/`takeout_box`/`files`/`protagonist`/`keyboard` 为 `true`，`coffee`/`coworker`/`leader` 为 `false` |
| `hoverTextKey` | string | 程序内部（指向 copyText） | 指向 `hoverTexts.objects.<id>` 的通用悬停说明。当某个对象同时绑定多个动作（如 `computer` 绑定两个电脑动作，`coworker` 绑定四个同事动作）时，具体动作的悬停文案以 `actions.json.hoverTextKey` 为准，本字段作为兜底通用说明 |

`assetKey` 与 `placeholderAsset` 字段已从 `sceneObjects.json` 移除。对象+状态到 assetId 的映射现由 `src/data/visuals.json` 承载（见第 8 节）。

约束（来自任务要求，验收时需要核对）：

1. `leader` 是视觉压力源，`clickableInNormal` 与 `clickableInQte` 均为 `false`。
2. QTE 只允许使用 `computer`、`phone`、`takeout_box`、`files`、`protagonist`、`keyboard` 六个对象，不新增可交互对象。
3. 没有底部动作按钮栏：所有动作都挂在场景对象上，`sceneObjects.json` 之外不应再出现独立的 UI 按钮配置。
4. 不新增方案外动作或对象。

---

## 8. visuals.json

对应「三层素材分工」中的渲染层索引。顶层结构：`{ objectVisuals: {...}, dangerOverlays: {...} }`

`objectVisuals` 字段：`{ <objectId>: { <stateName>: assetId } }` —— 每个对象下列出所有视觉状态，值为 `src/assets.ts` 中 `AssetPaths` 的扁平 key（即 assetId）。渲染层根据当前 objectId + state 查此表取 assetId，再通过 `src/assets.ts` 解析文件路径，不从 `sceneObjects.json` 读素材信息。

`dangerOverlays` 字段：`{ <dangerVisualStateKey>: assetId }` —— 危险状态叠加精灵图索引，key 对应 `dangers.json` 中各条目的 `visualState`。

---

## 9. gameRules.json

集中存放程序级阈值与生成规则，避免将数值写死在系统类里。顶层结构：`{ workTrace: {...}, bodySlack: {...} }`

| 字段 | 类型 | 策划可调 / 程序内部 | 说明 |
|---|---|---|---|
| `workTrace.baseThresholdSeconds` | number | 策划可调 | 工位太空计时器基础触发阈值（秒） |
| `workTrace.minThresholdSeconds` | number | 策划可调 | 阈值随波次缩减的下限（秒） |
| `workTrace.reducePerWaveAfter` | number | 策划可调 | 从第几波开始每波缩减阈值 |
| `workTrace.reduceSecondsPerWave` | number | 策划可调 | 每波缩减的秒数 |
| `bodySlack.enableAsQteFiller` | boolean | 策划可调 | 是否允许 body_slack 类步骤作为 QTE filler |
| `bodySlack.minWave` | number | 策划可调 | 最低在第几波才启用 filler 生成 |
| `bodySlack.preferAlternatingSteps` | boolean | 策划可调 | filler 步骤是否交替选取（sit_up / type_keyboard） |

---

## 10. 文件间引用关系一览

```text
sceneObjects.json (对象 id / 坐标 / hitbox / 交互属性)
  ← targetObjectId ← actions.json (平时动作)
  ← targetObjectId ← qte.json.qteSteps (QTE 步骤)

visuals.json (objectId + state → assetId)
  → assetId → src/assets.ts (assetId → 文件路径)
  → dangerOverlays.visualState ← dangers.json.visualState

actions.json
  → setDanger / clearDanger → dangers.json
  → setBuff / clearBuff → waves.json.coworkerWatchEffect（消耗方）
  → hoverTextKey / feedbackTextKeys → copyText.json

dangers.json
  → qteStepId → qte.json.qteSteps
  → producedBy / clearedBy → actions.json（或特殊符号 id）

qte.json.qteSteps
  → clearsDanger → dangers.json
  → promptTextKey / successTextKey / wrongTextKeys → copyText.json

qte.json.qteOutcome
  独立结算块，程序按 success/fail 读取 delta 与 safeWindowSeconds

qte.json.coworkerRescueEffect
  → consumesBuff（coworkerRescue）← actions.json 中同事救援动作设置的 buff

waves.json
  → coworkerWatchEffect.consumesBuff → actions.json 中 coworker_watch 设置的 buff

resources.json
  独立资源定义，被资源系统、动作系统、结束系统共同读取

gameRules.json
  独立规则阈值，被工位太空计时器系统与 QTE filler 生成系统读取
```

## 11. 验收对照

| 验收项 | 对应做法 |
|---|---|
| JSON 合法 | 九个文件均已用 `npm run validate` 校验通过 |
| 不新增方案外资源 | 仅 `spirit`/`satiety`/`trust`/`coworkerSpirit` 四项 |
| 不新增方案外动作 | 仅制作方案 10.1 节列出的 10 个动作（A1/A2/B1-B4/C1-C4） |
| 不新增方案外 QTE | 仅制作方案 14.2 节列出的 6 个 QTE 步骤（Q1-Q6） |
| QTE 结算写入配置 | `qte.json.qteOutcome` 含 success/fail delta 与 safeWindowSeconds；`coworkerRescueEffect` 含救援抵消规则 |
| 三层素材分工 | sceneObjects 只管交互属性；visuals.json 管 objectId+state→assetId；assets.ts 管 assetId→路径 |
| 不写正式玩法逻辑 | 九个文件均为纯数据，不含可执行逻辑；判定类内容只写在 `description` 里作为说明 |
| npm run validate 通过 | 配置引用校验脚本无报错 |
| 本文档可读性 | 第 1-9 节逐字段说明，第 10 节给出引用关系图，第 11 节给出验收对照 |
