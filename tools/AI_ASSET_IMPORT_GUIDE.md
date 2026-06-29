# AI 图片入库指南

1. 原始候选图保存到 `assets/ai_generated/raw/<batch_name>/`，文件名允许带 `_candidate_01` 序号。
2. 筛选后的稳定图保存到 `assets/ai_generated/selected/`，文件名必须与 assetId 一致。
3. 可接入游戏的处理图保存到 `assets/ai_generated/processed/`，优先使用 PNG。
4. `src/assets.ts` 只登记 processed 路径；仅当 processed 缺失时才临时登记 selected，并必须在报告标注。
5. AI 图不能作为点击判定来源。交互对象、QTE 目标、高亮、hover 描边、错误反馈、资源条和 UI 图标继续使用 SVG / Canvas。
6. 背景图不得画死电脑、手机、外卖、咖啡、文件等精确点击对象。
7. 所有 AI 图不得包含真实 Logo、可读文字、伪文字或写实人物脸。
8. 如需替换某张图，先生成新的 raw 候选，再更新 selected/processed，不直接覆盖默认生图目录原件。
