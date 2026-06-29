# AI 图片生成批次记录

生成方式：内置 image_gen 工具。原始输出已复制到项目 `assets/ai_generated/raw/` 下，保留内置默认目录原件。

| batch | assetId | 候选数量 | raw 目录 | selected | processed |
| --- | --- | ---: | --- | --- | --- |
| batch_1_backgrounds | office_background_base | 4 | assets/ai_generated/raw/batch_1_backgrounds/ | assets/ai_generated/selected/office_background_base.png | assets/ai_generated/processed/office_background_base.png |
| batch_1_backgrounds | office_background_warning_variant | 2 | assets/ai_generated/raw/batch_1_backgrounds/ | assets/ai_generated/selected/office_background_warning_variant.png | assets/ai_generated/processed/office_background_warning_variant.png |
| batch_2_start_and_mood | start_screen_background | 2 | assets/ai_generated/raw/batch_2_start_and_mood/ | assets/ai_generated/selected/start_screen_background.png | assets/ai_generated/processed/start_screen_background.png |
| batch_2_start_and_mood | mood_reference_office_pressure | 4 | assets/ai_generated/raw/batch_2_start_and_mood/ | assets/ai_generated/selected/mood_reference_office_pressure.png | assets/ai_generated/processed/mood_reference_office_pressure.png |
| batch_2_start_and_mood | poster_style_reference | 4 | assets/ai_generated/raw/batch_2_start_and_mood/ | assets/ai_generated/selected/poster_style_reference_01.png, poster_style_reference_02.png | assets/ai_generated/processed/poster_style_reference_01.png, poster_style_reference_02.png |
| batch_3_endings | end_spirit_alien | 3 | assets/ai_generated/raw/batch_3_endings/ | assets/ai_generated/selected/end_spirit_alien.png | assets/ai_generated/processed/end_spirit_alien.png |
| batch_3_endings | end_satiety_shutdown | 2 | assets/ai_generated/raw/batch_3_endings/ | assets/ai_generated/selected/end_satiety_shutdown.png | assets/ai_generated/processed/end_satiety_shutdown.png |
| batch_3_endings | end_trust_desk_cleared | 2 | assets/ai_generated/raw/batch_3_endings/ | assets/ai_generated/selected/end_trust_desk_cleared.png | assets/ai_generated/processed/end_trust_desk_cleared.png |
| batch_3_endings | end_coworker_broadcast | 3 | assets/ai_generated/raw/batch_3_endings/ | assets/ai_generated/selected/end_coworker_broadcast.png | assets/ai_generated/processed/end_coworker_broadcast.png |

处理标准：背景、开始界面、氛围参考、结局插画统一处理为 1280x720 PNG；海报参考处理为 768x768 PNG。
