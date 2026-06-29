# AI 生图提示词（生产用源文件）

本文件是 `docs/AI_IMAGE_PROMPTS.md` 的同步副本，放在素材目录旁边，方便实际调用生图工具时直接取用提示词文本，不需要跳回 `docs/` 目录查找。两份文件内容必须保持一致；如有修改，需同步更新另一份。

本文件覆盖 `docs/ASSET_LIST.md` 中 **C 类 AI 生图资产**（共 9 个）。本步骤**不实际调用生图工具**，不生成任何成品图片，只产出提示词文本。

来源文档：

- docs/STYLE_GUIDE.md（配色、线条、"避免写实人物/复杂纹理"等风格约束，所有提示词必须遵守）
- docs/ASSET_PLAN.md（AI 生图负责范围、入库规则）
- docs/ASSET_LIST.md（C 类资产清单与尺寸建议）
- 《假装正在工作》Demo 制作方案.md 第 16.3 节（四种结局的叙事方向）

统一注意事项（适用于全部 9 个资产，不在每条重复列出）：

1. 所有提示词均不要求生成可读中文文字，负面提示词统一加入"不要文字"约束。
2. 所有提示词均不要求生成复杂真实人物，正负面提示词统一强调"卡通化、非写实、无真实面部细节"。
3. 涉及办公室整体场景的提示词，均要求在主角工位区域留出空白，不画满复杂细节，避免覆盖前景 SVG 物件位置。
4. 结局插画允许比背景更荒诞，但仍要求保持低饱和 Flash 卡通风，不偏向写实或恐怖。
5. 本文档中没有任何资产用于制作最终的小尺寸交互图标，交互物件最终图标统一由 SVG 制作（见 docs/ASSET_PLAN.md 第 3 节）。

---

## 1. office_background_base

- **中文用途说明**：游戏主场景背景层的最终底图，覆盖办公室墙面、地板、后方走道与会议室方向，为前景 SVG 工位物件和角色留出居中空白区域。
- **中文提示词**：横版办公室内部场景概念图，低饱和灰蓝与米灰色调办公室墙面与地板，远处走道与若干模糊工位轮廓，画面正中央到右侧留出大片空白地面与墙面供角色与桌面物件叠加，墙面干净，结构简单，扁平色块风格，粗描边卡通插画风格，没有真实人物，没有可读文字标牌，环境光线均匀，略带荧光灯办公室氛围，16:9 横版构图。
- **英文提示词**：wide horizontal flat-color cartoon illustration of an office interior background, low-saturation gray-blue and beige color palette, distant corridor and blurred silhouette of far desks, large empty clean floor and wall area reserved in the center-right for character and desk overlay, thick clean outlines, flat color blocks, minimal flash-cartoon style, no readable text or signage, no realistic humans, even fluorescent office lighting, 16:9 wide composition, simple geometric office architecture.
- **负面提示词**：no photorealistic rendering, no realistic human faces, no readable text, no logos, no clutter, no high-detail texture, no busy background props in the center reserved area, no neon colors, no oversaturation, no watermark.
- **构图要求**：16:9 横版，地平线（地板与墙面交界）位于画面约 60% 高度处；画面中心到右侧（对应主角工位 x 约 425–1070）保持视觉空白，避免放置遮挡物；左侧（对应同事工位 x 约 150–290）可有简单工位轮廓暗示但不需要清晰物件；最上方区域不必刻意躲避顶部状态栏，UI 会叠加在上层。
- **色彩要求**：主色为低饱和灰蓝与米灰，点缀低饱和绿色与橙色（对照 docs/STYLE_GUIDE.md 第 2.1 节），避免高对比度或鲜艳色块，整体亮度中等，不使用纯黑纯白。
- **是否需要透明背景**：否（全幅不透明背景图）。
- **推荐尺寸**：1280x720（或更高分辨率等比例生成后裁切，如 1536x864）。
- **生成数量建议**：6–10 张候选，筛选出 1–2 张进入处理阶段。
- **入库路径**：`assets/ai_generated/raw/` → 筛选 → `assets/ai_generated/selected/` → 裁切/压缩/调色 → `assets/ai_generated/processed/office_background_base.png`
- **筛选标准**：中央工位区域足够空旷干净；线条风格扁平不写实；色调低饱和；没有意外出现的文字、人脸、复杂纹理；远处走道清晰可辨认。
- **是否可直接入游戏**：经裁切压缩处理后可直接作为最终背景使用。

---

## 2. office_background_warning_variant

- **中文用途说明**：领导预警/检查阶段的暗角压力氛围参考图，仅用于验证暗角配色和强度是否成立，不直接进入游戏（最终效果由 SVG/Canvas 实时实现）。
- **中文提示词**：与办公室背景底图相同的横版办公室场景，但整体光线更暗，四周边缘加重阴影，画面中央仍保持清晰，墙面与地板色调偏冷，远处走道隐约可见领导剪影轮廓，扁平色块卡通风格，粗描边，没有真实人物细节，没有可读文字。
- **英文提示词**：same flat-color cartoon office background as the base version, but overall lighting dimmed, heavier vignette shadow around the edges, center area still clearly readable, cooler wall and floor tones, faint silhouette shape of a supervisor figure in the distant corridor, flash-cartoon flat style, thick outlines, no readable text, no realistic facial detail.
- **负面提示词**：no realistic human face, no readable text, no horror or violent imagery, no excessive darkness obscuring the central work area, no oversaturated red, no clutter.
- **构图要求**：与 office_background_base 相同机位与留白区域，仅调整明暗与氛围，边缘暗角不遮挡中央工位空白区。
- **色彩要求**：在低饱和基础上整体压低明度，边缘阴影使用低饱和深蓝灰，禁止使用刺眼的纯红色大面积铺色（红色只作为 HUD 局部点缀的参考，不在背景里大面积使用）。
- **是否需要透明背景**：否。
- **推荐尺寸**：1280x720。
- **生成数量建议**：4–6 张候选，筛选 1 张作为参考定调，不强制处理入库。
- **入库路径**：`assets/ai_generated/raw/` → 筛选 → `assets/ai_generated/selected/office_background_warning_variant.png`（作为参考，通常不进入 `processed/`）。
- **筛选标准**：暗角效果克制不遮挡中央；色调与 base 版本统一；没有引入恐怖感或写实压迫感图像。
- **是否可直接入游戏**：仅作参考，不直接入游戏；最终预警氛围由程序内 SVG/Canvas 暗角与红色 HUD 效果实现。

---

## 3. start_screen_background

- **中文用途说明**：游戏开始界面的背景插画，建立荒诞职场基调，呈现办公桌一角或办公室远景，作为标题与开始按钮的衬底。
- **中文提示词**：横版开始界面背景插画，单个空荡的办公桌一角，桌上有简化电脑、咖啡杯、文件堆轮廓，低饱和灰蓝米灰配色，扁平色块卡通风格，粗描边，构图留出画面上方与中央大片空白供标题文字与开始按钮叠加，没有真实人物，没有可读文字内容，整体氛围安静略带荒诞感。
- **英文提示词**：wide flat-color cartoon illustration for a game start screen, a single empty office desk corner with simplified silhouettes of a computer, coffee cup and paper stack, low-saturation gray-blue and beige palette, thick outlines, flash-cartoon flat style, large empty space reserved at the top and center for title text and start button overlay, no realistic humans, no readable text content, quiet slightly absurd atmosphere.
- **负面提示词**：no readable text or logo baked into the image, no realistic human figures, no high-detail texture, no clutter covering the reserved title area, no bright neon colors.
- **构图要求**：标题与按钮预留区域位于画面上 40% 与正中，桌面物件配置在画面下半或一侧，保持视觉留白。
- **色彩要求**：与 office_background_base 同一套低饱和配色体系，保持视觉统一。
- **是否需要透明背景**：否。
- **推荐尺寸**：1280x720。
- **生成数量建议**：6–8 张候选，筛选 1–2 张。
- **入库路径**：`assets/ai_generated/raw/` → 筛选 → `assets/ai_generated/selected/` → 处理 → `assets/ai_generated/processed/start_screen_background.png`
- **筛选标准**：预留文字区域干净；风格与主场景背景统一；荒诞基调而非压抑基调（开始页不需要暗角压力感）。
- **是否可直接入游戏**：经裁切调色后可直接作为开始页背景使用。

---

## 4. end_spirit_alien

- **中文用途说明**：精神值归零结束陈述配图，呼应"外星人"主线（制作方案 16.3 节、文案风格定稿说明）。
- **中文提示词**：荒诞卡通风插画，一个简化的工位场景上方出现一个低饱和色调的简笔外星飞碟轮廓，飞碟造型简单卡通化，不写实，办公桌上文件与键盘保持原位，整体气氛冷静荒诞而非恐怖，扁平色块，粗描边，低饱和配色，没有真实人物面部细节，没有可读文字。
- **英文提示词**：absurd flat-color cartoon illustration, a simplified low-saturation cartoon flying saucer silhouette appearing above a small office desk scene, saucer design simple and toylike not realistic, desk items like papers and keyboard remain in place, calm absurd mood rather than horror, flat color blocks, thick outlines, low-saturation palette, no realistic human facial detail, no readable text.
- **负面提示词**：no horror atmosphere, no realistic alien creature design, no readable text, no realistic human face, no gore, no high-detail sci-fi rendering, no oversaturated colors.
- **构图要求**：飞碟位于画面上方，工位元素位于画面下方，构图居中对称即可，画面下方留出文字说明区域（结束陈述文案由 UI 层叠加，本图不内置文字）。
- **色彩要求**：与整体低饱和体系一致，飞碟可用低饱和绿色或紫灰作为点缀色，避免鲜艳科幻配色。
- **是否需要透明背景**：否（生成完整构图背景，简化结算面板实现）。
- **推荐尺寸**：1024x768（生成后裁切适配 end_panel 600x400 展示区域）。
- **生成数量建议**：6–8 张候选，筛选 1–2 张。
- **入库路径**：`assets/ai_generated/raw/` → 筛选 → `assets/ai_generated/selected/` → 处理 → `assets/ai_generated/processed/end_spirit_alien.png`
- **筛选标准**：荒诞但不恐怖；飞碟造型卡通化而非写实；与整体美术风格一致；构图为后续裁切留有余量。
- **是否可直接入游戏**：经裁切调色后可直接用于 end_panel 配图。

---

## 5. end_satiety_shutdown

- **中文用途说明**：饱腹值归零结束陈述配图，表现"身体续航失效"，不出现外星人元素。
- **中文提示词**：荒诞卡通风插画，一个简笔小人趴在简化办公桌上一动不动，桌上散落外卖盒轮廓，整体氛围冷静荒诞而非悲情，低饱和配色，扁平色块，粗描边，人物极简夸张，没有写实面部细节，没有可读文字，没有外星人或科幻元素。
- **英文提示词**：absurd flat-color cartoon illustration, a minimal exaggerated stick-like cartoon figure collapsed face-down on a simplified office desk, scattered takeout box silhouettes on the desk, calm absurd mood rather than tragic, low-saturation flat color palette, thick outlines, minimal exaggerated character design, no realistic facial detail, no readable text, no alien or sci-fi elements.
- **负面提示词**：no alien or UFO elements, no realistic human anatomy, no gore or medical distress imagery, no readable text, no oversaturated colors, no tragic dramatic lighting.
- **构图要求**：人物与桌面居中偏下，画面上方留白供结束陈述文字区域使用。
- **色彩要求**：低饱和暖灰与米色为主，避免过度阴郁的纯黑配色。
- **是否需要透明背景**：否。
- **推荐尺寸**：1024x768。
- **生成数量建议**：6–8 张候选，筛选 1–2 张。
- **入库路径**：`assets/ai_generated/raw/` → 筛选 → `assets/ai_generated/selected/` → 处理 → `assets/ai_generated/processed/end_satiety_shutdown.png`
- **筛选标准**：不出现外星人/科幻元素；荒诞而不悲情；人物极简夸张符合整体风格。
- **是否可直接入游戏**：经裁切调色后可直接用于 end_panel 配图。

---

## 6. end_trust_desk_cleared

- **中文用途说明**：信任值归零结束陈述配图，表现职场委婉清退（工位被清空）。
- **中文提示词**：荒诞卡通风插画，一张空荡的办公桌，桌面物件全部消失，只剩一个简化的"招聘中"工位牌轮廓（牌面留空白不写具体文字），椅子轻微推开，整体氛围冷静克制，低饱和配色，扁平色块，粗描边，没有真实人物，没有可读文字内容。
- **英文提示词**：absurd flat-color cartoon illustration, an empty office desk with all items removed, a simplified blank placeholder nameplate silhouette where a sign would be (no readable text on it), chair pushed slightly aside, calm restrained mood, low-saturation flat color palette, thick outlines, no realistic humans, no readable text content.
- **负面提示词**：no readable text or letters on the nameplate, no realistic human figures, no dramatic lighting, no oversaturated colors, no clutter.
- **构图要求**：桌面居中，留出周围空白突出"空荡"感，画面上方留白供文字区域使用。
- **色彩要求**：低饱和灰蓝米灰为主，整体明度中等偏冷，传达"清空"而非"悲伤"。
- **是否需要透明背景**：否。
- **推荐尺寸**：1024x768。
- **生成数量建议**：6–8 张候选，筛选 1–2 张。
- **入库路径**：`assets/ai_generated/raw/` → 筛选 → `assets/ai_generated/selected/` → 处理 → `assets/ai_generated/processed/end_trust_desk_cleared.png`
- **筛选标准**：不出现任何可读文字；空荡感明确；不传达过度悲情。
- **是否可直接入游戏**：经裁切调色后可直接用于 end_panel 配图。

---

## 7. end_coworker_broadcast

- **中文用途说明**：同事精神值归零结束陈述配图，表现同事触发异常事件（"打开宇宙广播"）。
- **中文提示词**：荒诞卡通风插画，邻座同事简笔形象平静地对着一个简化的复古广播/天线装置，装置造型卡通化偏复古科幻感但不写实，背景为简化办公室一角，整体氛围冷静荒诞，低饱和配色，扁平色块，粗描边，没有写实面部细节，没有可读文字。
- **英文提示词**：absurd flat-color cartoon illustration, a minimal cartoon coworker figure calmly operating a simplified retro broadcast antenna device, the device stylized and slightly retro-sci-fi but not realistic, simplified office corner background, calm absurd mood, low-saturation flat color palette, thick outlines, no realistic facial detail, no readable text.
- **负面提示词**：no realistic human face, no readable text, no horror atmosphere, no oversaturated neon colors, no complex sci-fi machinery detail.
- **构图要求**：同事与装置居中偏下，画面上方留白供文字区域使用。
- **色彩要求**：与整体低饱和体系一致，装置可用低饱和橙色或绿色点缀。
- **是否需要透明背景**：否。
- **推荐尺寸**：1024x768。
- **生成数量建议**：6–8 张候选，筛选 1–2 张。
- **入库路径**：`assets/ai_generated/raw/` → 筛选 → `assets/ai_generated/selected/` → 处理 → `assets/ai_generated/processed/end_coworker_broadcast.png`
- **筛选标准**：荒诞而非恐怖；装置卡通化而非写实科幻；与整体风格一致。
- **是否可直接入游戏**：经裁切调色后可直接用于 end_panel 配图。

---

## 8. poster_style_reference

- **中文用途说明**：用于在正式批量生成前验证整体美术风格方向（描边粗细、色块比例、人物简化程度），不是最终游戏素材，仅作团队内部风格对齐参考。
- **中文提示词**：一组办公室主题的扁平色块卡通海报风格插画探索，粗描边，低饱和配色，极简夸张人物比例（头大身小），展示多种描边粗细与色块对比方案，用于风格比较，不需要具体场景内容，不需要可读文字。
- **英文提示词**：a set of flat-color cartoon poster-style illustration explorations on an office theme, thick outlines, low-saturation color palette, minimal exaggerated character proportions with oversized heads, showcasing a few variations of outline thickness and color block contrast for style comparison, no specific scene content required, no readable text.
- **负面提示词**：no readable text, no realistic rendering, no photographic texture, no oversaturated colors.
- **构图要求**：无固定构图要求，可为多张独立小图或拼贴对比图，便于横向比较不同描边/色块方案。
- **色彩要求**：统一使用低饱和配色测试不同明度对比方案。
- **是否需要透明背景**：否。
- **推荐尺寸**：1024x1024 或拼贴图 1600x900。
- **生成数量建议**：10–15 张，用于横向比较，不需要精筛到最终入库数量。
- **入库路径**：`assets/ai_generated/raw/` → 筛选后留存于 `assets/ai_generated/selected/poster_style_reference/`（可保留多张作为风格依据，不裁切处理，不进入 `processed/`）。
- **筛选标准**：能清晰体现描边粗细、色块比例、人物简化程度的差异，便于团队选定最终方向。
- **是否可直接入游戏**：仅作风格参考，不直接入游戏。

---

## 9. mood_reference_office_pressure

- **中文用途说明**：用于验证"轻松滑稽但带压迫感"氛围的视觉基调（暗角、低饱和红色 HUD 点缀、阴影压近），为后续 `leader_warning_hud`、画面边缘变暗等 SVG/Canvas 效果提供色彩与强度参考，不是最终游戏素材。
- **中文提示词**：办公室场景气氛参考图，画面四周出现低饱和暗角阴影，远处出现一个简化的领导剪影正在靠近，局部点缀克制的低饱和红色光效暗示警报感，整体仍保持扁平色块卡通风格，不写实，不恐怖，没有可读文字。
- **英文提示词**：an office scene mood reference illustration, low-saturation vignette shadow appearing around the frame edges, a simplified silhouette figure of a supervisor approaching in the distance, restrained low-saturation red accent lighting hinting at an alert mood, overall still flat-color cartoon style, not realistic, not horror, no readable text.
- **负面提示词**：no horror imagery, no realistic human face, no oversaturated bright red covering large areas, no readable text, no realistic photographic lighting.
- **构图要求**：暗角集中在四周边缘，中心区域保持清晰可读，领导剪影位于背景层而非画面正中。
- **色彩要求**：红色仅作为局部点缀（如 HUD 边框或细线），不大面积铺色；整体仍以低饱和灰蓝/米灰为底色。
- **是否需要透明背景**：否。
- **推荐尺寸**：1280x720 或 1024x1024。
- **生成数量建议**：6–8 张，筛选 1–2 张作为强度参考。
- **入库路径**：`assets/ai_generated/raw/` → 筛选后留存于 `assets/ai_generated/selected/mood_reference_office_pressure.png`（参考用，不进入 `processed/`）。
- **筛选标准**：压迫感克制不过度；红色点缀不过量；暗角不遮挡核心可读性，符合"轻松滑稽但带压迫感"基调而非恐怖基调。
- **是否可直接入游戏**：仅作参考，不直接入游戏。
