# AI 图片入库报告

## 生成概况

本次使用内置 image_gen 工具生成 26 张候选图，完成 raw / selected / processed 三层入库。所有正式登记项均使用 `assets/ai_generated/processed/` 路径，没有 selected 临时接入项。

| assetId | 候选数 | 选中候选 | 最终接入路径 | processed |
| --- | ---: | --- | --- | --- |
| office_background_base | 4 | office_background_base_candidate_02.png | /assets/ai_generated/processed/office_background_base.png | 是 |
| office_background_warning_variant | 2 | office_background_warning_variant_candidate_02.png | /assets/ai_generated/processed/office_background_warning_variant.png | 是 |
| start_screen_background | 2 | start_screen_background_candidate_02.png | /assets/ai_generated/processed/start_screen_background.png | 是 |
| mood_reference_office_pressure | 4 | mood_reference_office_pressure_candidate_03.png | /assets/ai_generated/processed/mood_reference_office_pressure.png | 是 |
| poster_style_reference_01 | 4 | poster_style_reference_candidate_02.png | /assets/ai_generated/processed/poster_style_reference_01.png | 是 |
| poster_style_reference_02 | 4 | poster_style_reference_candidate_03.png | /assets/ai_generated/processed/poster_style_reference_02.png | 是 |
| end_spirit_alien | 3 | end_spirit_alien_candidate_02.png | /assets/ai_generated/processed/end_spirit_alien.png | 是 |
| end_satiety_shutdown | 2 | end_satiety_shutdown_candidate_02.png | /assets/ai_generated/processed/end_satiety_shutdown.png | 是 |
| end_trust_desk_cleared | 2 | end_trust_desk_cleared_candidate_02.png | /assets/ai_generated/processed/end_trust_desk_cleared.png | 是 |
| end_coworker_broadcast | 3 | end_coworker_broadcast_candidate_03.png | /assets/ai_generated/processed/end_coworker_broadcast.png | 是 |

## 不合格或未选候选

- `office_background_base_candidate_03.png` 和 `office_background_base_candidate_04.png`：工位、人物或前景物件过具体，不适合作为纯背景。
- `office_background_base_candidate_01.png`：布局可用，但墙面装饰符号较明显，文字/标识风险略高。
- `mood_reference_office_pressure_candidate_01.png`：偏拼贴，不适合作为最终单幅图。
- `poster_style_reference_candidate_01.png`：图表感偏强，容易抢视觉。
- `poster_style_reference_candidate_04.png`：含类似清单的形状，接近文字结构，未接入。

## 风格、命名与尺寸检查

- 风格整体符合低饱和 Flash 卡通、粗描边、扁平色块方向。
- 未发现真实公司 Logo、明确可读文字或写实人物脸。
- 所有接入文件使用英文 snake_case，文件名与 assetId 一致。
- processed 尺寸：背景、开始界面、氛围参考、结局插画为 1280x720；海报参考为 768x768。
- 当前不建议立即重做。后续若主场景需要更干净的墙面，可重新生成 `office_background_base` 的更空版本。

## 接入注意事项

AI 背景图不能作为点击判定来源。交互物件仍以 SVG / Canvas 为准。QTE 目标高亮仍以 `sceneObjects.json` 和 SVG 对象为准。背景图只提供视觉氛围，不承担规则逻辑。

不要把 AI 图用于资源条、QTE 高亮、hover 描边、错误红闪等 UI 反馈。领导波次、动作系统、QTE、点击交互和玩法数值不在本步骤修改范围内。
