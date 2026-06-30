import Phaser from 'phaser';
import { sceneObjects, visuals, getDanger } from '../core/config';
import type { DangerId } from '../core/types';
import type { AssetKey } from '../assets';
import { DEPTH } from '../game/constants';

type SceneObjectConfig = (typeof sceneObjects)[keyof typeof sceneObjects];

/**
 * 对象+状态 → assetId 解析。严格走 visuals.json.objectVisuals，
 * 渲染层不写任何素材路径字符串（路径只在 src/assets.ts）。
 */
export function resolveObjectAsset(objectId: string, state: string): AssetKey {
  const map = (visuals.objectVisuals as Record<string, Record<string, string>>)[objectId];
  return map[state] as AssetKey;
}

/**
 * 危险 visualState → 叠加/替换用 assetId（visuals.json.dangerOverlays）。
 */
export function resolveDangerOverlay(visualState: string): AssetKey {
  return (visuals.dangerOverlays as Record<string, string>)[visualState] as AssetKey;
}

/**
 * 通用对象渲染助手：按 sceneObjects.json 的 position/size 放置对象，
 * 按 visuals.json 取初始 state 的图，并根据当前危险集合刷新视觉：
 *  - phone_lit / takeout_open 等有专属危险精灵图的对象 → 整图替换；
 *  - unsafe_screen / desk_empty 等无专属危险图的对象 → 叠加 danger_marker。
 * 替换/叠加的判定完全由数据驱动（dangerOverlays 是否指向 danger_marker）。
 */
export class ObjectView {
  readonly objectId: string;
  readonly config: SceneObjectConfig;
  readonly image: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Image | null = null;
  private currentTextureKey: string;

  /** 当前纹理 key（= assetId），供 QA 断言状态→素材切换是否正确。 */
  get textureKey(): string {
    return this.currentTextureKey;
  }

  constructor(scene: Phaser.Scene, objectId: string, depth: number) {
    this.objectId = objectId;
    this.config = (sceneObjects as Record<string, SceneObjectConfig>)[objectId];

    const { position, size, normalStates } = this.config;
    const baseAsset = resolveObjectAsset(objectId, normalStates[0]);
    this.currentTextureKey = baseAsset;

    this.image = scene.add
      .image(position.x, position.y, baseAsset)
      .setDisplaySize(size.width, size.height)
      .setDepth(depth);
  }

  /**
   * 根据当前激活危险集合刷新对象的整图/叠加表现。
   * overrideState（可选）：非危险驱动的呈现状态（如 coworker idle/watch/unstable、
   * files organized、protagonist sit_up），优先级低于危险整图替换、高于默认 normal 图。
   * 取值必须是 visuals.json.objectVisuals[objectId] 中存在的状态键。
   */
  refresh(scene: Phaser.Scene, activeDangers: Set<DangerId>, overrideState?: string): void {
    const dangerStates = this.config.dangerStates as DangerId[];

    let replaceState: DangerId | null = null;
    let markerActive = false;

    for (const dangerId of dangerStates) {
      if (!activeDangers.has(dangerId)) continue;
      const visualState = getDanger(dangerId).visualState;
      const overlayAsset = resolveDangerOverlay(visualState);
      if (overlayAsset === 'danger_marker') {
        markerActive = true;
      } else {
        replaceState = dangerId;
      }
    }

    // 整图替换（危险）> overrideState（呈现态）> 默认 normal 图
    const targetState = replaceState ?? overrideState ?? this.config.normalStates[0];
    const targetAsset = resolveObjectAsset(this.objectId, targetState);
    if (targetAsset !== this.currentTextureKey) {
      this.image.setTexture(targetAsset);
      this.image.setDisplaySize(this.config.size.width, this.config.size.height);
      this.currentTextureKey = targetAsset;
    }

    // danger_marker 叠加（右上角）
    if (markerActive) {
      if (!this.marker) {
        const { position, size } = this.config;
        this.marker = scene.add
          .image(position.x + size.width / 2 - 6, position.y - size.height / 2 + 6, 'danger_marker')
          .setDisplaySize(30, 30)
          .setDepth(DEPTH.dangerMarker);
      }
      this.marker.setVisible(true);
    } else if (this.marker) {
      this.marker.setVisible(false);
    }
  }

  /**
   * QTE 错点反馈：按 wrongClickFeedback 红色滤镜闪烁约 0.18 秒后复原。
   * 颜色与时长来自 sceneObjects.<id>.wrongClickFeedback（不在此硬编码数值）。
   */
  flashWrong(scene: Phaser.Scene): void {
    const fb = this.config.wrongClickFeedback;
    if (!fb) return;
    const color = parseInt(fb.flashColor.replace('#', ''), 16);
    this.image.setTint(color);
    scene.time.delayedCall(fb.flashDurationSec * 1000, () => this.image.clearTint());
  }

  /** QTE 命中反馈：成功对象短暂亮一下。 */
  flashSuccess(scene: Phaser.Scene): void {
    this.image.setTint(0x9be8a0);
    scene.time.delayedCall(150, () => this.image.clearTint());
  }
}
