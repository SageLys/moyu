# QA_CHECKLIST — M5 单局闭环验收（16 项）

任务：M5（开始页 + 结束面板 + 全状态素材切换 + 重开 + 首尾反馈 + 第一轮平衡）。

## 验证方式

- `npm run validate` / `npm run test:unit` / `npm run build` 全部通过。
- 启动 dev server（`npm run dev`，http://localhost:5173），通过 Preview 工具（真实浏览器）加载，
  用 `window.__game` 调试 API 逐条断言核心状态；并截图核对开始页 / 结束面板 / 预警呈现。
- 时序确定性：`setManualTick(true)` 后用 `advance(seconds)` 按 1/60 步长推进 core。
- M5 新增调试 API：`start()/restart()/reset()`（= 完全重置回 NORMAL_PLAY）、`toStartScreen()`、
  `getObjectTexture(id)`（读对象当前纹理 key，断言状态→素材切换）。

## 命令结果

| 命令 | 结果 |
|---|---|
| `npm run validate` | CONFIG VALIDATION PASSED |
| `npm run test:unit` | 6 files / 84 tests passed |
| `npm run build` | tsc + vite build 成功（仅 Phaser 包体 >500kB 提示，非错误） |
| `npx tsc --noEmit` | 无类型错误 |
| dev server 控制台 | 全流程 0 error |

## 16 项 QA 表（逐条结果）

| # | 验收项 | 断言 | 结果 |
|---|---|---|---|
| 1 | 开局 30 秒不点击三资源持续下降 | advance(30)：spirit/satiety/trust 均 < 初始；mode 仍 NORMAL_PLAY | ✅ |
| 2 | 点摸鱼页：spirit↑、trust↓、出现 unsafe_screen | open_fishing_page 后三项断言成立 | ✅ |
| 3 | 点手机：出现 phone_lit | check_phone 后 activeDangers 含 phone_lit | ✅ |
| 4 | 点外卖：satiety↑、出现 takeout_open | eat_takeout 后 satiety 上升且含 takeout_open | ✅ |
| 5 | 点文件：清除 desk_empty 且 workTraceTimer 复位 | advance 21s 触发 desk_empty → organize 后清除且 workTraceTimer=0 | ✅ |
| 6 | 领导来时强制关闭电脑弹层与同事菜单 | COMPUTER_PANEL/COWORKER_MENU 打开中触发巡查 → 进入 LEADER_WARNING，弹层/菜单均关闭 | ✅ |
| 7 | QTE 优先用真实危险状态生成 | unsafe_screen+phone_lit → 步骤 targets=[computer, phone]（按 priority） | ✅ |
| 8 | QTE 点错不立即失败，只扣时间 | 错点后 mode 仍 QTE_ACTIVE、qteRemaining −0.5s、步骤索引不变 | ✅ |
| 9 | QTE 成功后 trust↑、波次+1 | 顺序点对全部步骤 → trust +6、wave+1、mode QTE_SUCCESS | ✅ |
| 10 | QTE 失败后未完成危险状态保留 | 耗尽倒计时 → wave+1，activeDangers 仍含 unsafe_screen/phone_lit | ✅ |
| 11 | 同事望风只影响下一次预警 | base≈7.97s → 望风后 boosted≈9.47s 且 buff 消费；再下一波预警回到 base 区间 | ✅ |
| 12 | 同事求救只抵消一次 QTE 失败结算 | 求救后失败 → trust 仅 ≈−5（而非 −15）、coworkerRescue 消费 | ✅ |
| 13 | 任一明示资源归零进入对应结束面板（含正确插画） | spirit→spirit_zero(end_spirit_alien)、satiety→satiety_zero(end_satiety_shutdown)、trust→trust_zero(end_trust_desk_cleared)，均 RUN_END | ✅ |
| 14 | 同事精神值归零进入同事异常结局 | coworkerSpirit=0 → endReason=coworkerSpirit_zero(end_coworker_broadcast)，RUN_END | ✅ |
| 15 | 重开后所有状态完全重置 | restart() → NORMAL_PLAY、wave 1、资源 75/75/70/70、危险/buff 空、nextPatrol 35、workTrace 0、endReason null | ✅ |
| 16 | 连续游玩 3–5 分钟核心循环成立且可理解 | 自动对局 12 个巡查周期：每周期 wave+1、模式 NORMAL→预警→QTE→NORMAL 正常循环、12/12 QTE 完成、到第 13 波、0 异常；精神/信任随回合下行体现真实压力 | ✅ |

### 呈现层目检（截图）

- 开始页：start_screen_background + 标题「假装正在工作」+ 副标题（systemMessages.run_start）+「开始」按钮。✅
- 结束面板：结局插画（spirit_zero→外星人）+ 随机结束陈述 + 「存活 m:ss　最高第 N 波」+「重新开始」；
  背后场景变暗；**无「死亡/崩溃/Game Over」字样**。✅
- 全状态素材切换（`getObjectTexture` 断言）：
  phone idle→phone_idle / lit→phone_lit；takeout closed→open；files tidy→organized（整理后瞬时）；
  protagonist idle→slack（危险）/→sit_up（QTE 坐直瞬时）；coworker idle→watch（望风 buff）→unstable（同事精神值低档）；
  computer 整图保持、unsafe_screen 走 danger_marker 叠加；背景 base↔warning variant（预警/QTE 期间切 warning）。✅
- 安全窗口：QTE 成功后提示栏显示 safe_window_start，并出现短暂全屏柔光（safeGlow，位于 ui 之下）。✅
- 首尾反馈：资源跌入 dropping(<35)/critical(<20) 档位时提示栏推送 resourceWarnings 对应文案；
  同事精神值跌入 medium(<50)/low(<25) 档位时推送 coworkerHints 暗示（仅提示栏，无数值）。✅

## 本轮第一轮平衡：改动的 JSON 字段与理由

所有改动仅动 `src/data/*.json` 数值，未改逻辑代码；单测从配置读 delta/阈值，故全部仍通过。

| 文件 | 字段 | 原值 → 新值 | 理由 |
|---|---|---|---|
| actions.json | eat_takeout.delta.trust | −8 → **−10** | 吃外卖要有时机风险：信任代价更高，叠加留下 takeout_open，避免随意进食。 |
| actions.json | drink_coffee.delta.satiety | −5 → **−7** | 咖啡不能完全替代摸鱼：续精神的身体代价更明确，避免咖啡刷精神无脑最优。 |
| actions.json | organize_work_trace.delta.trust | +12 → **+10** | 文件整理不能无限保命：降低单次信任收益。 |
| actions.json | organize_work_trace.delta.spirit | −5 → **−6** | 同上：提高精神代价，抑制"反复刷文件堆信任"成为最优解。 |
| actions.json | coworker_watch.delta.coworkerSpirit | −10 → **−12** | 同事动作有价值但滥用推高隐藏风险：望风更耗同事精神，抑制每波望风。 |
| gameRules.json | feedback（新增） | — | 首尾反馈分档阈值落地为配置：resourceBands{droppingBelow:35,criticalBelow:20}、coworkerBands{highAtOrAbove:50,mediumAtOrAbove:25}，对应制作方案 §15.1/§8.2，呈现层只读不写死。 |

平衡结果（自动对局观察）：理想操作下可稳定推进到 5 波以上并明显感到精神/信任的此消彼长；
第 1–2 波节奏宽松（patrolInterval 35/32s）、3–4 波 qteSteps 升到 3 且阈值开始收紧、第 5 波 4 步且预警仅 4s，
压力曲线符合"撑过 1–2 波 / 3–4 波组合压力 / 5 波后明显紧张"。

## 本任务新增 / 修改文件

新增：
- `src/ui/StartScreen.ts`（开始页）
- `src/ui/EndPanel.ts`（结束面板：存活/波次/随机结束陈述/结局插画/重开）
- `docs/QA_CHECKLIST.md`（本文件）

修改：
- `src/scenes/GameScene.ts`（START/RUN_END 接入、开始/重开完全重置、背景 base↔warning 切换、
  coworker 档位与瞬时态素材覆盖、首尾反馈推送、安全窗口柔光、调试 API 扩展）
- `src/render/objectView.ts`（refresh 增加 overrideState 呈现态；textureKey getter 供 QA）
- `src/ui/DebugOverlay.ts`（沿用 M4）
- `src/game/constants.ts`（新增 safeGlow/endPanel/startScreen 深度）
- `src/data/gameRules.json`（新增 feedback 分档阈值）
- `src/data/actions.json`（第一轮平衡 5 处数值）
