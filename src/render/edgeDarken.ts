import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DEPTH } from '../game/constants';

/**
 * 画面边缘变暗（暗角）特效。覆盖整个场景，深度位于 ui 之下
 * （DEPTH.edgeDarken < DEPTH.ui），不遮挡 HUD / 提示栏 / 弹层文字。
 * 强度随预警→检查→失败递增，由 GameScene 在状态切换时调用 fadeTo / hide。
 */
export class EdgeDarken {
  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private tween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.image = scene.add
      .image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'screen_edge_warning')
      .setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT)
      .setDepth(DEPTH.edgeDarken)
      .setAlpha(0)
      .setVisible(false);
  }

  /** 渐变到目标透明度（0 表示完全消退）。 */
  fadeTo(targetAlpha: number, durationSec = 0.6): void {
    this.killTween();
    if (targetAlpha > 0) this.image.setVisible(true);
    this.tween = this.scene.tweens.add({
      targets: this.image,
      alpha: targetAlpha,
      duration: durationSec * 1000,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.image.alpha <= 0.001) this.image.setVisible(false);
        this.tween = null;
      },
    });
  }

  hide(): void {
    this.killTween();
    this.image.setAlpha(0).setVisible(false);
  }

  /** 当前暗角透明度（只读，供 QA 断言暗角是否已消退）。 */
  getAlpha(): number {
    return this.image.alpha;
  }

  private killTween(): void {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
  }
}
