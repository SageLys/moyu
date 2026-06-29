# 交互流程说明（INTERACTION_FLOW）

本文档是 HTML Demo 预制作第三步的产出之一，用文字与流程图描述场景中的 18 类交互。坐标与对象 id 引用 docs/SCENE_LAYOUT.md 与 src/data/sceneObjects.json，状态名引用《假装正在工作》Demo 制作方案.md 第 17 节状态机（`GameState.currentMode`）。

本文档只描述交互流程的发生顺序与对象/UI 之间的触发关系，不写正式判定逻辑（不写计时器具体代码、不写数值结算公式，数值已在 actions.json / dangers.json / qte.json / 制作方案.md 中定义，本文档只引用其 id）。

---

## 0. 总览流程图

```text
NORMAL_PLAY（场景自由点击，资源持续衰减）
  ├─点击 computer → COMPUTER_PANEL（见 1-4）→ 关闭弹层 → NORMAL_PLAY
  ├─点击 phone / takeout_box / coffee / files → 原地执行动作（见 5-8）→ 仍处于 NORMAL_PLAY
  └─点击 coworker → COWORKER_MENU（见 9-11）→ 菜单关闭 → NORMAL_PLAY
↓（领导巡查计时器到达巡查间隔，随时可能打断以上任意子状态）
LEADER_WARNING（见 12，强制关闭 COMPUTER_PANEL / COWORKER_MENU）
↓（预警倒计时结束）
QTE_ACTIVE（见 13-15，按当前现场危险状态生成步骤序列）
  ├─全部步骤在倒计时结束前点完 → QTE_SUCCESS（见 16）
  └─倒计时结束仍有步骤未完成 → QTE_FAIL（见 17）
↓
NORMAL_PLAY（波次 +1，循环回到顶部）
↓（任意时刻，资源系统检测归零，可在上述任一状态中触发）
RUN_END（见 18，结束面板，仅允许重新开始）
```

---

## 1. 普通状态点击电脑

`currentMode = NORMAL_PLAY` 时，玩家点击 `computer` 对象的 hitbox（x:540–740, y:335–505）。系统将 `currentMode` 切换为 `COMPUTER_PANEL`，弹出 `computer_panel` UI（坐标见 SCENE_LAYOUT.md 第 3 节）。`computer` 对象本体仍渲染在原位置，弹层覆盖在其上方，不发生位移动画的强制要求。

```text
NORMAL_PLAY
↓ 点击 computer（hitbox x:540-740 y:335-505）
currentMode → COMPUTER_PANEL
↓
弹出 computer_panel
```

## 2. 电脑弹层打开

`computer_panel` 弹出后显示 4 个页签按钮：文档｜Excel｜聊天｜摸鱼。默认显示离开弹层前的上一次页签状态（首次进入默认文档页，对应安全工作页）。当前页签按钮高亮，内容区显示对应静态画面（制作方案 10.3 节内容）。弹层右上角提供关闭入口，点击关闭或点击弹层外的场景区域都会回到 `NORMAL_PLAY`。

```text
COMPUTER_PANEL 弹出
↓
显示 4 个页签按钮，当前页签高亮
↓
显示对应内容区（文档 / Excel / 聊天 / 摸鱼画面）
↓（点击关闭按钮或弹层外区域）
currentMode → NORMAL_PLAY
```

## 3. 切换文档 / Excel / 聊天

`COMPUTER_PANEL` 内点击「文档」「Excel」或「聊天」任一页签，触发 `actions.json.switch_safe_work`：`computerState` 置为 `SAFE_WORK`；清除危险状态 `unsafe_screen`；`computer` 对象的 `dangerStates`（`screen_fishing_glow` 视觉标记）消失；应用 `delta`（精神值 -6，信任值 +8）；`bottom_message_bar` 显示对应反馈文案。

```text
COMPUTER_PANEL（当前页签：摸鱼或安全页）
↓ 点击 文档 / Excel / 聊天 任一页签
触发 switch_safe_work
↓
computerState → SAFE_WORK，清除 unsafe_screen
↓
computer 对象危险视觉标记消失，资源条变化，bottom_message_bar 更新
```

## 4. 切换摸鱼页

`COMPUTER_PANEL` 内点击「摸鱼」页签，触发 `actions.json.open_fishing_page`：`computerState` 置为 `FISHING`；置位危险状态 `unsafe_screen`；`computer` 对象叠加危险视觉标记（`screen_fishing_glow`）；应用 `delta`（精神值 +14，信任值 -12）。

```text
COMPUTER_PANEL（当前页签：安全页）
↓ 点击 摸鱼 页签
触发 open_fishing_page
↓
computerState → FISHING，置位 unsafe_screen
↓
computer 对象叠加 screen_fishing_glow 标记，资源条变化，bottom_message_bar 更新
```

## 5. 点击手机

`currentMode = NORMAL_PLAY` 时点击 `phone` 对象 hitbox（x:475–565, y:540–610），触发 `actions.json.check_phone`：置位危险状态 `phone_lit`；`phone` 对象叠加视觉标记（`phone_screen_lit`）；应用 `delta`（精神值 +8，信任值 -6）；不打开任何弹层，停留在 `NORMAL_PLAY`。

```text
NORMAL_PLAY
↓ 点击 phone（hitbox x:475-565 y:540-610）
触发 check_phone，置位 phone_lit
↓
phone 对象叠加 phone_screen_lit 标记，资源条变化，bottom_message_bar 更新
↓
仍处于 NORMAL_PLAY
```

## 6. 点击外卖

`currentMode = NORMAL_PLAY` 时点击 `takeout_box` 对象 hitbox（x:695–825, y:520–620），触发 `actions.json.eat_takeout`：置位危险状态 `takeout_open`；`takeout_box` 对象叠加视觉标记（`takeout_box_open_icon`）；应用 `delta`（精神值 +3，饱腹值 +18，信任值 -8）。

```text
NORMAL_PLAY
↓ 点击 takeout_box（hitbox x:695-825 y:520-620）
触发 eat_takeout，置位 takeout_open
↓
takeout_box 对象叠加 takeout_box_open_icon 标记，资源条变化，bottom_message_bar 更新
↓
仍处于 NORMAL_PLAY
```

## 7. 点击咖啡

`currentMode = NORMAL_PLAY` 时点击 `coffee` 对象 hitbox（x:425–495, y:518–602），触发 `actions.json.drink_coffee`：不置位任何危险状态；应用 `delta`（精神值 +10，饱腹值 -5，信任值 -3）；`coffee` 对象只播放点击特效，不叠加持续性视觉标记。

```text
NORMAL_PLAY
↓ 点击 coffee（hitbox x:425-495 y:518-602）
触发 drink_coffee
↓
资源条变化（精神值升、饱腹值降），bottom_message_bar 更新，无危险状态产生
↓
仍处于 NORMAL_PLAY
```

## 8. 点击文件堆

`currentMode = NORMAL_PLAY` 时点击 `files` 对象 hitbox（x:930–1070, y:440–600），触发 `actions.json.organize_work_trace`：清除危险状态 `desk_empty`（若存在）；同时复位 `workTraceTimer` 计时器；应用 `delta`（精神值 -5，信任值 +12）；`files` 对象的视觉标记（`desk_clutter_warning_icon`）消失（若之前存在）。

```text
NORMAL_PLAY
↓ 点击 files（hitbox x:930-1070 y:440-600）
触发 organize_work_trace
↓
清除 desk_empty，workTraceTimer 复位，资源条变化，bottom_message_bar 更新
↓
仍处于 NORMAL_PLAY
```

## 9. 点击同事

`currentMode = NORMAL_PLAY` 时点击 `coworker` 对象 hitbox（x:150–290, y:350–570）。系统将 `currentMode` 切换为 `COWORKER_MENU`，在 `coworker_bubble_menu` 区域（x:260, y:340, 200x200，贴近 `coworker` 右上方）弹出 4 个气泡。本步骤本身不产生任何资源变化或危险状态。

```text
NORMAL_PLAY
↓ 点击 coworker（hitbox x:150-290 y:350-570）
currentMode → COWORKER_MENU
↓
弹出 coworker_bubble_menu（贴近 coworker，不占用 bottom_message_bar）
```

## 10. 同事菜单展开

`coworker_bubble_menu` 内显示 4 个圆形气泡：望风｜求救｜吐槽｜安抚，环绕在 `coworker` 对象右上方。气泡菜单展开期间，`coworker` 对象本体保持原视觉状态（`idle`），菜单是独立浮层，不修改 `coworker` 的 `normalStates`。

```text
COWORKER_MENU 弹出
↓
显示 4 个气泡：望风 / 求救 / 吐槽 / 安抚
↓（等待玩家选择）
```

## 11. 同事菜单动作执行

玩家点击 4 个气泡中的任意一个，触发对应动作（`coworker_watch` / `coworker_rescue` / `coworker_complain` / `coworker_comfort`）：应用各自的 `delta`（含隐藏资源 `coworkerSpirit`）；`coworker_watch` 额外置位 buff `coworkerWatch`，`coworker_rescue` 额外置位 buff `coworkerRescue`。执行后气泡菜单关闭，`currentMode` 回到 `NORMAL_PLAY`，`bottom_message_bar` 显示对应反馈文案。

```text
COWORKER_MENU
↓ 点击 望风 / 求救 / 吐槽 / 安抚 任一气泡
触发对应 coworker_* 动作，应用 delta（含 coworkerSpirit）
↓
（望风→置位 coworkerWatch；求救→置位 coworkerRescue）
↓
coworker_bubble_menu 关闭，currentMode → NORMAL_PLAY，bottom_message_bar 更新
```

## 12. 领导预警出现

领导巡查计时器到达当前波次的 `patrolInterval` 时触发，与玩家当前所在子状态无关（可强制打断 `NORMAL_PLAY`、`COMPUTER_PANEL` 或 `COWORKER_MENU`）。系统动作：若 `COMPUTER_PANEL` 或 `COWORKER_MENU` 处于打开状态，先强制关闭；`currentMode` 切换为 `LEADER_WARNING`；`leader_warning_hud`（x:24, y:76, 256x96）显示预警倒计时；`leader` 对象从 `patrol_far`/`approaching` 状态向 `checking` 锚点（x:700, y:310）移动；`effects` 层的画面边缘变暗效果开始出现（强度随预警到检查阶段递增）。

```text
（任意子状态：NORMAL_PLAY / COMPUTER_PANEL / COWORKER_MENU）
↓ 领导巡查计时器到达本波次 patrolInterval
强制关闭 computer_panel / coworker_bubble_menu（若已打开）
↓
currentMode → LEADER_WARNING
↓
leader_warning_hud 显示倒计时，leader 对象向 checking 锚点移动，画面边缘开始变暗
```

## 13. QTE 当前目标高亮

`LEADER_WARNING` 的预警倒计时结束后，`currentMode` 切换为 `QTE_ACTIVE`。QTE 生成系统按 `dangers.json.priority` 与 `qte.json.qteRules`（`generateFromRealDangersFirst`、`fillerSteps`、`priorityBasedOnDangers`）生成本波次的步骤序列，序列长度取自 `waves.json` 对应波次的 `qteSteps`。序列第一个步骤对应的目标对象（只能是 `computer`/`phone`/`takeout_box`/`files`/`protagonist`/`keyboard` 之一）应用其 `qteHighlightStyle`（描边色 `#FFB000`、发光、呼吸缩放动画），该高亮优先于普通 hover 描边常驻显示。`leader_warning_hud` 同步切换为显示当前 QTE 步骤的提示文案（`qte.json.qteSteps.<id>.promptTextKey`）与剩余倒计时。

```text
LEADER_WARNING（预警倒计时结束）
↓
currentMode → QTE_ACTIVE
↓
QTE 生成系统按危险状态优先级生成步骤序列
↓
序列第一个目标对象应用 qteHighlightStyle（优先于 hover）
↓
leader_warning_hud 显示当前步骤提示文案 + 倒计时
```

## 14. QTE 点对

玩家点击当前高亮目标对象的 hitbox。判定为命中：该对象播放成功反馈（短暂闪一下 + 显示 `qte.json.qteSteps.<id>.successTextKey`）；清除该步骤对应的危险状态（`clearsDanger`）；该对象的 `qteHighlightStyle` 移除；高亮转移到序列中的下一个目标对象，`leader_warning_hud` 的提示文案同步更新为下一步骤。若刚点对的是序列最后一个步骤，进入第 16 项「QTE 成功」。

```text
QTE_ACTIVE（当前目标：步骤 N）
↓ 点击当前高亮目标对象的 hitbox
该对象成功反馈，清除对应危险状态，移除当前高亮
↓（若 N 不是最后一步）
高亮转移到步骤 N+1，leader_warning_hud 提示文案更新
↓（若 N 是最后一步）
进入「QTE 成功」（见 16）
```

## 15. QTE 点错

玩家点击的对象不是当前高亮目标（可以是另一个合法的 QTE 对象但顺序不对，也可以是 `coffee`/`coworker` 等非 QTE 对象）。系统播放该对象的 `wrongClickFeedback`（红色滤镜闪烁约 0.18 秒）；`leader_warning_hud` 的倒计时整体轻微抖动并扣减 `qte.json.qteRules.wrongClickPenaltySeconds`（0.5 秒）；当前 QTE 步骤与高亮目标保持不变，不切换序列，也不立即判负（`wrongClickImmediateFail = false`）。

```text
QTE_ACTIVE（当前目标：步骤 N）
↓ 点击非当前目标的任意对象
该对象 wrongClickFeedback 红闪
↓
leader_warning_hud 倒计时抖动并扣减 0.5 秒
↓
当前目标与序列位置不变，继续等待正确点击
```

## 16. QTE 成功

序列中全部步骤在倒计时结束前依次点对。`currentMode` 切换为 `QTE_SUCCESS`：`leader_warning_hud` 显示巡查结束提示；`leader` 对象从 `checking` 锚点沿 `leaving` 路径返回 `patrol_far`；画面边缘变暗效果消退；应用结算（精神值 -4，信任值 +6，进入 4 秒安全窗口）；波次 +1；随后 `currentMode` 回到 `NORMAL_PLAY`。

```text
QTE_ACTIVE（最后一步点对）
↓
currentMode → QTE_SUCCESS
↓
leader 对象沿 leaving 路径离开，画面边缘变暗消退
↓
应用结算：精神值 -4，信任值 +6，安全窗口 4 秒，波次 +1
↓
currentMode → NORMAL_PLAY
```

## 17. QTE 失败

倒计时归零时序列仍有未完成的步骤。`currentMode` 切换为 `QTE_FAIL`：`leader_warning_hud` 显示发现异常提示；画面短暂停顿；`leader` 对象在 `checking` 锚点保持更强的压力视觉（边缘变暗加深）；应用结算（精神值 -8，信任值 -15）；未完成步骤对应的危险状态保留（对应对象的 `dangerStates` 视觉标记不消失）；波次 +1；随后 `currentMode` 回到 `NORMAL_PLAY`，`leader` 对象沿 `leaving` 路径离开。

```text
QTE_ACTIVE（倒计时结束，仍有步骤未完成）
↓
currentMode → QTE_FAIL
↓
画面短暂停顿，leader 对象压力视觉加深
↓
应用结算：精神值 -8，信任值 -15，未完成步骤的危险状态保留，波次 +1
↓
leader 对象沿 leaving 路径离开，currentMode → NORMAL_PLAY
```

## 18. 资源归零进入结束面板

资源系统在任意时刻（`NORMAL_PLAY`/`LEADER_WARNING`/`QTE_ACTIVE` 等子状态中均可触发）检测到精神值、饱腹值、信任值三项明示资源之一触底，或隐藏资源 `coworkerSpirit` 触底。系统动作：强制关闭当前打开的 `computer_panel`/`coworker_bubble_menu`/QTE 高亮等任何子状态层；`currentMode` 切换为 `RUN_END`；弹出 `end_panel`（x:340, y:160, 600x400），显示存活时间、最高波次、对应 `endReason` 的结束陈述文案（`copyText.json.endTexts`）与重新开始按钮；背后场景保持可见但整体变暗作为遮罩衬底。`RUN_END` 状态下只接受「重新开始」操作。

```text
（任意子状态）
↓ 资源系统检测到 spirit / satiety / trust / coworkerSpirit 任一触底
强制关闭当前子状态层（弹层 / 菜单 / QTE 高亮）
↓
currentMode → RUN_END
↓
弹出 end_panel：存活时间 + 最高波次 + 结束陈述 + 重新开始按钮
↓（点击重新开始）
回到单局开始（不在本文档范围内展开）
```
