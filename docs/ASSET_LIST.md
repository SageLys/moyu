# 资产清单

本文件记录当前 Demo 资产状态。AI 图片只提供背景、开始界面、结局插画和氛围参考；点击判定、QTE 高亮、hover 描边、错误红闪、资源条和 UI 图标仍以 SVG / Canvas 与数据配置为准。

| assetId | 文件名 | 目录 | 类型 | 制作方式 | 用途 | 关联对象/界面 | 是否必须 | 尺寸建议 | 透明背景 | 当前状态 | 备注 |
| ------- | --- | -- | -- | ---- | -- | ------- | ---- | ---- | ---- | ---- | -- |
| computer | computer.svg | assets/svg/interactables/ | svg_image | svg_canvas | 电脑交互物件 | sceneObjects.computer | 是 | 200x170 | 是 | imported | 保留原 SVG 路径 |
| keyboard | keyboard.svg | assets/svg/interactables/ | svg_image | svg_canvas | 键盘交互物件/QTE 目标 | sceneObjects.keyboard | 是 | 160x50 | 是 | imported | 保留原 SVG 路径 |
| phone_idle | phone_idle.svg | assets/svg/interactables/ | svg_image | svg_canvas | 手机默认状态 | sceneObjects.phone | 是 | 70x50 | 是 | imported | 保留原 SVG 路径 |
| phone_lit | phone_lit.svg | assets/svg/interactables/ | svg_image | svg_canvas | 手机亮屏危险状态 | sceneObjects.phone | 是 | 70x50 | 是 | imported | 保留原 SVG 路径 |
| takeout_closed | takeout_closed.svg | assets/svg/interactables/ | svg_image | svg_canvas | 外卖盒关闭状态 | sceneObjects.takeout_box | 是 | 110x80 | 是 | imported | 保留原 SVG 路径 |
| takeout_open | takeout_open.svg | assets/svg/interactables/ | svg_image | svg_canvas | 外卖盒打开状态 | sceneObjects.takeout_box | 是 | 110x80 | 是 | imported | 保留原 SVG 路径 |
| coffee | coffee.svg | assets/svg/interactables/ | svg_image | svg_canvas | 咖啡杯 | sceneObjects.coffee | 是 | 50x64 | 是 | imported | 保留原 SVG 路径 |
| files_normal | files_normal.svg | assets/svg/interactables/ | svg_image | svg_canvas | 文件堆默认状态 | sceneObjects.files | 是 | 140x160 | 是 | imported | 保留原 SVG 路径 |
| files_organized | files_organized.svg | assets/svg/interactables/ | svg_image | svg_canvas | 文件整理后状态 | sceneObjects.files | 是 | 140x160 | 是 | imported | 保留原 SVG 路径 |
| desk | desk.svg | assets/svg/interactables/ | svg_image | svg_canvas | 主角工位桌 | 主场景中景 | 是 | 700x140 | 是 | imported | 非 AI 背景点击来源 |
| coworker_desk | coworker_desk.svg | assets/svg/interactables/ | svg_image | svg_canvas | 邻座同事工位桌 | 主场景中景 | 是 | 220x140 | 是 | imported | 非 AI 背景点击来源 |
| protagonist_idle | protagonist_idle.svg | assets/svg/characters/ | svg_image | svg_canvas | 主角默认坐姿 | sceneObjects.protagonist | 是 | 170x230 | 是 | imported | 保留原 SVG 路径 |
| protagonist_slack | protagonist_slack.svg | assets/svg/characters/ | svg_image | svg_canvas | 主角松懈状态 | sceneObjects.protagonist | 是 | 170x230 | 是 | imported | 保留原 SVG 路径 |
| protagonist_sit_up | protagonist_sit_up.svg | assets/svg/characters/ | svg_image | svg_canvas | QTE 坐直状态 | qte.sit_up | 是 | 170x230 | 是 | imported | 保留原 SVG 路径 |
| coworker_idle | coworker_idle.svg | assets/svg/characters/ | svg_image | svg_canvas | 同事默认状态 | sceneObjects.coworker | 是 | 140x220 | 是 | imported | 保留原 SVG 路径 |
| coworker_watch | coworker_watch.svg | assets/svg/characters/ | svg_image | svg_canvas | 同事望风状态 | actions.coworker_watch | 是 | 140x220 | 是 | imported | 保留原 SVG 路径 |
| coworker_unstable | coworker_unstable.svg | assets/svg/characters/ | svg_image | svg_canvas | 同事不稳定状态 | coworkerSpirit 提示 | 是 | 140x220 | 是 | imported | 保留原 SVG 路径 |
| leader_silhouette | leader_silhouette.svg | assets/svg/characters/ | svg_image | svg_canvas | 领导剪影 | sceneObjects.leader | 是 | 130x230 | 是 | imported | 保留原 SVG 路径 |
| top_status_bar | top_status_bar.svg | assets/svg/ui/ | svg_image | svg_canvas | 顶部状态栏底图 | UI | 是 | 1280x64 | 是 | imported | 保留原 SVG 路径 |
| resource_bar_spirit | resource_bar_spirit.svg | assets/svg/ui/ | svg_image | svg_canvas | 精神值资源条 | resources.spirit | 是 | 300x20 | 是 | imported | AI 图不用于资源条 |
| resource_bar_satiety | resource_bar_satiety.svg | assets/svg/ui/ | svg_image | svg_canvas | 饱腹值资源条 | resources.satiety | 是 | 300x20 | 是 | imported | AI 图不用于资源条 |
| resource_bar_trust | resource_bar_trust.svg | assets/svg/ui/ | svg_image | svg_canvas | 信任值资源条 | resources.trust | 是 | 300x20 | 是 | imported | AI 图不用于资源条 |
| bottom_message_bar | bottom_message_bar.svg | assets/svg/ui/ | svg_image | svg_canvas | 底部消息栏 | UI | 是 | 1280x56 | 是 | imported | 保留原 SVG 路径 |
| leader_warning_hud | leader_warning_hud.svg | assets/svg/ui/ | svg_image | svg_canvas | 领导预警 HUD | UI | 是 | 256x96 | 是 | imported | AI 图不用于 HUD |
| computer_panel_frame | computer_panel_frame.svg | assets/svg/ui/ | svg_image | svg_canvas | 电脑弹层框架 | UI | 是 | 800x536 | 是 | imported | 保留原 SVG 路径 |
| end_panel_frame | end_panel_frame.svg | assets/svg/ui/ | svg_image | svg_canvas | 结局面板框架 | END 界面 | 是 | 600x400 | 是 | imported | 保留原 SVG 路径 |
| restart_button | restart_button.svg | assets/svg/ui/ | svg_image | svg_canvas | 重新开始按钮 | END 界面 | 是 | 160x56 | 是 | imported | 保留原 SVG 路径 |
| coworker_bubble_watch | coworker_bubble_watch.svg | assets/svg/ui/ | svg_image | svg_canvas | 同事望风气泡图标 | coworker menu | 是 | 70x70 | 是 | imported | 保留原 SVG 路径 |
| coworker_bubble_rescue | coworker_bubble_rescue.svg | assets/svg/ui/ | svg_image | svg_canvas | 同事求救气泡图标 | coworker menu | 是 | 70x70 | 是 | imported | 保留原 SVG 路径 |
| coworker_bubble_complain | coworker_bubble_complain.svg | assets/svg/ui/ | svg_image | svg_canvas | 同事吐槽气泡图标 | coworker menu | 是 | 70x70 | 是 | imported | 保留原 SVG 路径 |
| coworker_bubble_comfort | coworker_bubble_comfort.svg | assets/svg/ui/ | svg_image | svg_canvas | 同事安抚气泡图标 | coworker menu | 是 | 70x70 | 是 | imported | 保留原 SVG 路径 |
| qte_target_highlight | qte_target_highlight.svg | assets/svg/effects/ | svg_image | svg_canvas | QTE 目标高亮 | sceneObjects / QTE | 是 | 随目标缩放 | 是 | imported | AI 图不用于 QTE 判定 |
| wrong_click_flash | wrong_click_flash.svg | assets/svg/effects/ | svg_image | svg_canvas | 错误点击红闪 | sceneObjects feedback | 是 | 随目标缩放 | 是 | imported | AI 图不用于错误反馈 |
| danger_marker | danger_marker.svg | assets/svg/effects/ | svg_image | svg_canvas | 危险标记 | dangers visualState | 是 | 32x32 | 是 | imported | 保留原 SVG 路径 |
| click_ripple | click_ripple.svg | assets/svg/effects/ | svg_image | svg_canvas | 点击波纹 | 点击反馈 | 是 | 随目标缩放 | 是 | imported | 保留原 SVG 路径 |
| screen_edge_warning | screen_edge_warning.svg | assets/svg/effects/ | svg_image | svg_canvas | 屏幕边缘警告 | 预警氛围 | 是 | 1280x720 | 是 | imported | 保留原 SVG 路径 |
| office_background_base | office_background_base.png | assets/ai_generated/processed/ | raster_image | ai_generated | 主游戏办公室背景底图 | NORMAL_PLAY 背景层 | 是 | 1280x720 | 否 | imported | 不承担点击判定 |
| office_background_warning_variant | office_background_warning_variant.png | assets/ai_generated/processed/ | raster_image | ai_generated | 领导预警/压力状态背景变体 | LEADER_WARNING / QTE 氛围层参考 | 是 | 1280x720 | 否 | imported | 不抢 QTE 高亮 |
| start_screen_background | start_screen_background.png | assets/ai_generated/processed/ | raster_image | ai_generated | 开始界面背景 | START 界面 | 是 | 1280x720 | 否 | imported | 标题由 UI 绘制 |
| mood_reference_office_pressure | mood_reference_office_pressure.png | assets/ai_generated/processed/ | raster_image | ai_generated | 压力氛围参考 | 暗角、走道压力、领导压迫效果参考 | 否 | 1280x720 | 否 | imported | 可作为参考图，不作为规则逻辑 |
| poster_style_reference_01 | poster_style_reference_01.png | assets/ai_generated/processed/ | raster_image | ai_generated | 墙面海报/风格参考 | 背景墙装饰参考 | 否 | 768x768 | 否 | imported | 无可读文字 |
| poster_style_reference_02 | poster_style_reference_02.png | assets/ai_generated/processed/ | raster_image | ai_generated | 墙面海报/风格参考 | 背景墙装饰参考 | 否 | 768x768 | 否 | imported | 无可读文字 |
| end_spirit_alien | end_spirit_alien.png | assets/ai_generated/processed/ | raster_image | ai_generated | 精神值归零结局插画 | end_panel / spirit_zero | 是 | 1280x720 | 否 | imported | 外星信号明确，不恐怖 |
| end_satiety_shutdown | end_satiety_shutdown.png | assets/ai_generated/processed/ | raster_image | ai_generated | 饱腹值归零结局插画 | end_panel / satiety_zero | 是 | 1280x720 | 否 | imported | 无外星元素，不表现死亡 |
| end_trust_desk_cleared | end_trust_desk_cleared.png | assets/ai_generated/processed/ | raster_image | ai_generated | 信任值归零结局插画 | end_panel / trust_zero | 是 | 1280x720 | 否 | imported | 工位清空，无直白开除文字 |
| end_coworker_broadcast | end_coworker_broadcast.png | assets/ai_generated/processed/ | raster_image | ai_generated | 同事精神值归零结局插画 | end_panel / coworker_spirit_zero | 是 | 1280x720 | 否 | imported | 同事不是恶意反派 |
