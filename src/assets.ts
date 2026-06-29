/**
 * SVG 资产路径索引
 * 所有 assetKey 与 docs/ASSET_LIST.md 中的 assetId 一一对应。
 * 替换美术资源时只修改此处路径，不改动 sceneObjects.json 中的 assetKey 与对象 id。
 * 见 docs/TECH_DECISION.md "素材替换约束"。
 */

export const AssetPaths = {

  // ── 交互物件 (assets/svg/interactables/) ─────────────────────────────────
  computer:          "/assets/svg/interactables/computer.svg",
  keyboard:          "/assets/svg/interactables/keyboard.svg",
  phone_idle:        "/assets/svg/interactables/phone_idle.svg",
  phone_lit:         "/assets/svg/interactables/phone_lit.svg",
  takeout_closed:    "/assets/svg/interactables/takeout_closed.svg",
  takeout_open:      "/assets/svg/interactables/takeout_open.svg",
  coffee:            "/assets/svg/interactables/coffee.svg",
  files_normal:      "/assets/svg/interactables/files_normal.svg",
  files_organized:   "/assets/svg/interactables/files_organized.svg",
  desk:              "/assets/svg/interactables/desk.svg",
  coworker_desk:     "/assets/svg/interactables/coworker_desk.svg",

  // ── 角色 (assets/svg/characters/) ────────────────────────────────────────
  protagonist_idle:      "/assets/svg/characters/protagonist_idle.svg",
  protagonist_slack:     "/assets/svg/characters/protagonist_slack.svg",
  protagonist_sit_up:    "/assets/svg/characters/protagonist_sit_up.svg",
  coworker_idle:         "/assets/svg/characters/coworker_idle.svg",
  coworker_watch:        "/assets/svg/characters/coworker_watch.svg",
  coworker_unstable:     "/assets/svg/characters/coworker_unstable.svg",
  leader_silhouette:     "/assets/svg/characters/leader_silhouette.svg",

  // ── UI 组件 (assets/svg/ui/) ──────────────────────────────────────────────
  top_status_bar:           "/assets/svg/ui/top_status_bar.svg",
  resource_bar_spirit:      "/assets/svg/ui/resource_bar_spirit.svg",
  resource_bar_satiety:     "/assets/svg/ui/resource_bar_satiety.svg",
  resource_bar_trust:       "/assets/svg/ui/resource_bar_trust.svg",
  bottom_message_bar:       "/assets/svg/ui/bottom_message_bar.svg",
  leader_warning_hud:       "/assets/svg/ui/leader_warning_hud.svg",
  computer_panel_frame:     "/assets/svg/ui/computer_panel_frame.svg",
  end_panel_frame:          "/assets/svg/ui/end_panel_frame.svg",
  restart_button:           "/assets/svg/ui/restart_button.svg",
  coworker_bubble_watch:    "/assets/svg/ui/coworker_bubble_watch.svg",
  coworker_bubble_rescue:   "/assets/svg/ui/coworker_bubble_rescue.svg",
  coworker_bubble_complain: "/assets/svg/ui/coworker_bubble_complain.svg",
  coworker_bubble_comfort:  "/assets/svg/ui/coworker_bubble_comfort.svg",

  // ── 特效 (assets/svg/effects/) ────────────────────────────────────────────
  qte_target_highlight: "/assets/svg/effects/qte_target_highlight.svg",
  wrong_click_flash:    "/assets/svg/effects/wrong_click_flash.svg",
  danger_marker:        "/assets/svg/effects/danger_marker.svg",
  click_ripple:         "/assets/svg/effects/click_ripple.svg",
  screen_edge_warning:  "/assets/svg/effects/screen_edge_warning.svg",

  // AI raster backgrounds, ending illustrations, and reference images.
  office_background_base:            "/assets/ai_generated/processed/office_background_base.png",
  office_background_warning_variant: "/assets/ai_generated/processed/office_background_warning_variant.png",
  start_screen_background:           "/assets/ai_generated/processed/start_screen_background.png",
  end_spirit_alien:                  "/assets/ai_generated/processed/end_spirit_alien.png",
  end_satiety_shutdown:              "/assets/ai_generated/processed/end_satiety_shutdown.png",
  end_trust_desk_cleared:            "/assets/ai_generated/processed/end_trust_desk_cleared.png",
  end_coworker_broadcast:            "/assets/ai_generated/processed/end_coworker_broadcast.png",
  mood_reference_office_pressure:    "/assets/ai_generated/processed/mood_reference_office_pressure.png",
  poster_style_reference_01:         "/assets/ai_generated/processed/poster_style_reference_01.png",
  poster_style_reference_02:         "/assets/ai_generated/processed/poster_style_reference_02.png",

} as const;

export type AssetKey = keyof typeof AssetPaths;

/**
 * 运行时取路径的辅助函数，类型安全。
 * 用法：getAssetPath("computer")  →  "/assets/svg/interactables/computer.svg"
 */
export function getAssetPath(key: AssetKey): string {
  return AssetPaths[key];
}
