export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

/**
 * 渲染层深度（对应 docs/SCENE_LAYOUT.md §2 的从底到顶层级）。
 * background < midground < interactables < ui < effects(物件级)。
 * UI 与弹层位于更高深度区间，画面级特效（暗角）介于场景与 UI 之间。
 */
export const DEPTH = {
  background: 0,
  midground: 10,
  // interactables 内部：先主角本体，再桌面物件
  protagonist: 20,
  coworker: 21,
  deskItem: 22,
  dangerMarker: 28,
  hover: 40,
  qteHighlight: 45,
  // 画面级暗角特效：覆盖整个场景但位于 ui 之下，不遮挡 HUD/提示栏/弹层。
  edgeDarken: 90,
  // 安全窗口柔光：位于 ui 之下的短暂全屏柔光提示。
  safeGlow: 92,
  ui: 100,
  panel: 200,
  // 结束面板（含变暗衬底）覆盖 ui/弹层之上。
  endPanel: 300,
  // 开始页覆盖一切（debug 浮层除外）。
  startScreen: 450,
  debug: 500,
} as const;

