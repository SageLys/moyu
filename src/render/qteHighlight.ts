import Phaser from 'phaser';
import { sceneObjects } from '../core/config';
import { DEPTH } from '../game/constants';
import type { ObjectId } from '../core/types';

type SceneObjectConfig = (typeof sceneObjects)[keyof typeof sceneObjects];

/**
 * QTE 当前目标高亮（呈现层）。
 * 只对当前步骤的目标对象应用其 sceneObjects.<id>.qteHighlightStyle（描边 #FFB000、
 * 发光、呼吸缩放），绘制在已有对象的 hitbox 之上，不新增任何按钮或目标图标（铁律 §1）。
 * 高亮常驻、优先于 hover（QTE 期间 hover 本就禁用）。目标由 GameScene 依据
 * core.qte.steps[currentIndex].targetObjectId 设置。
 */
export class QteHighlight {
  private static readonly PERIOD_SEC = 1.2; // 呼吸周期，对应 qteHighlightStyle.pulseAnimation
  private static readonly SCALE_MIN = 1.0;
  private static readonly SCALE_MAX = 1.05;

  private readonly gfx: Phaser.GameObjects.Graphics;
  private hitbox: { x: number; y: number; width: number; height: number } | null = null;
  private strokeColor = 0xffb000;
  private strokeWidth = 4;
  private phaseSec = 0;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(DEPTH.qteHighlight).setVisible(false);
  }

  /** 设置当前高亮目标（仅限带 qteHighlightStyle 的 6 个 QTE 对象）。 */
  setTarget(objectId: ObjectId): void {
    const obj = (sceneObjects as Record<string, SceneObjectConfig>)[objectId];
    if (!obj || !obj.hitbox || !obj.qteHighlightStyle) {
      this.clear();
      return;
    }
    this.hitbox = obj.hitbox;
    this.strokeColor = QteHighlight.parseColor(obj.qteHighlightStyle.strokeColor);
    this.strokeWidth = obj.qteHighlightStyle.strokeWidthPx;
    this.phaseSec = 0;
    this.gfx.setVisible(true);
    this.redraw();
  }

  clear(): void {
    this.hitbox = null;
    this.gfx.clear();
    this.gfx.setVisible(false);
  }

  /** 逐帧推进呼吸缩放动画。 */
  update(dtSec: number): void {
    if (!this.hitbox) return;
    this.phaseSec = (this.phaseSec + dtSec) % QteHighlight.PERIOD_SEC;
    this.redraw();
  }

  private redraw(): void {
    const hb = this.hitbox;
    if (!hb) return;

    const t = this.phaseSec / QteHighlight.PERIOD_SEC;
    const mid = (QteHighlight.SCALE_MIN + QteHighlight.SCALE_MAX) / 2;
    const amp = (QteHighlight.SCALE_MAX - QteHighlight.SCALE_MIN) / 2;
    const scale = mid + amp * Math.sin(t * Math.PI * 2);

    const cx = hb.x + hb.width / 2;
    const cy = hb.y + hb.height / 2;
    const w = hb.width * scale;
    const h = hb.height * scale;
    const x = cx - w / 2;
    const y = cy - h / 2;

    this.gfx.clear();
    // 发光：外层更宽、低透明度的描边
    this.gfx.lineStyle(this.strokeWidth + 8, this.strokeColor, 0.25);
    this.gfx.strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, 10);
    // 主描边
    this.gfx.lineStyle(this.strokeWidth, this.strokeColor, 1);
    this.gfx.strokeRoundedRect(x, y, w, h, 8);
  }

  private static parseColor(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }
}
