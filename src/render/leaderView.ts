import Phaser from 'phaser';
import { sceneObjects } from '../core/config';
import { DEPTH } from '../game/constants';
import { resolveObjectAsset } from './objectView';

type LeaderPhase = 'patrol' | 'approaching' | 'checking' | 'leaving';

/**
 * 领导对象表现层（纯呈现，不参与点击判定、无 hitbox）。
 * 时序由 core 状态机驱动，GameScene 在状态切换时调用 approach()/leave()，
 * 本类只负责按 sceneObjects.leader.patrolAnchors 做位置/体型插值动画：
 *  - NORMAL_PLAY：在 patrol_far 区间左右巡逻（update 逐帧推进）；
 *  - LEADER_WARNING：沿 approaching 插值移动到 checking 锚点停驻；
 *  - QTE 结束：沿 leaving 返回 patrol_far 并恢复巡逻。
 */
export class LeaderView {
  private static readonly PATROL_SPEED_PX_PER_SEC = 90;

  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private readonly anchors = sceneObjects.leader.patrolAnchors;

  private phase: LeaderPhase = 'patrol';
  private patrolX: number;
  private patrolDir: 1 | -1 = 1;
  private activeTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const far = this.anchors.patrol_far;
    this.patrolX = (far.xRange[0] + far.xRange[1]) / 2;

    const asset = resolveObjectAsset('leader', 'patrol_far');
    this.image = scene.add
      .image(this.patrolX, far.y, asset)
      .setDisplaySize(far.width, far.height)
      .setDepth(DEPTH.midground);
  }

  /** core 进入 LEADER_WARNING：沿 approaching 路径移动到 checking 锚点。 */
  approach(durationSec: number): void {
    if (this.phase === 'approaching' || this.phase === 'checking') return;
    this.phase = 'approaching';
    this.killTween();

    const chk = this.anchors.checking;
    const proxy = this.makeProxy();
    this.activeTween = this.scene.tweens.add({
      targets: proxy,
      x: chk.x,
      y: chk.y,
      w: chk.width,
      h: chk.height,
      duration: Math.max(300, durationSec * 1000),
      ease: 'Sine.easeInOut',
      onUpdate: () => this.applyProxy(proxy),
      onComplete: () => {
        this.phase = 'checking';
        this.activeTween = null;
      },
    });
  }

  /** QTE 成功/失败结束：沿 leaving 路径返回远处巡逻并恢复 patrol。 */
  leave(durationSec = 1.2): void {
    if (this.phase === 'leaving' || this.phase === 'patrol') return;
    this.phase = 'leaving';
    this.killTween();

    const far = this.anchors.patrol_far;
    const endX = far.xRange[1];
    const proxy = this.makeProxy();
    this.activeTween = this.scene.tweens.add({
      targets: proxy,
      x: endX,
      y: far.y,
      w: far.width,
      h: far.height,
      duration: durationSec * 1000,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.applyProxy(proxy),
      onComplete: () => {
        this.phase = 'patrol';
        this.patrolX = endX;
        this.patrolDir = -1;
        this.activeTween = null;
      },
    });
  }

  /** 当前阶段（只读，供 QA 断言领导是否离开 checking）。 */
  getPhase(): LeaderPhase {
    return this.phase;
  }

  /** 逐帧推进：仅在 patrol 阶段做左右巡逻。 */
  update(dtSec: number): void {
    if (this.phase !== 'patrol') return;
    const far = this.anchors.patrol_far;
    const [minX, maxX] = far.xRange;
    this.patrolX += this.patrolDir * LeaderView.PATROL_SPEED_PX_PER_SEC * dtSec;
    if (this.patrolX >= maxX) {
      this.patrolX = maxX;
      this.patrolDir = -1;
    } else if (this.patrolX <= minX) {
      this.patrolX = minX;
      this.patrolDir = 1;
    }
    this.image.setPosition(this.patrolX, far.y);
  }

  /** 单局重置（调试 reset）：立即回到远处巡逻初始姿态。 */
  reset(): void {
    this.killTween();
    this.phase = 'patrol';
    const far = this.anchors.patrol_far;
    this.patrolX = (far.xRange[0] + far.xRange[1]) / 2;
    this.patrolDir = 1;
    this.image.setPosition(this.patrolX, far.y).setDisplaySize(far.width, far.height);
  }

  private makeProxy(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.image.x,
      y: this.image.y,
      w: this.image.displayWidth,
      h: this.image.displayHeight,
    };
  }

  private applyProxy(p: { x: number; y: number; w: number; h: number }): void {
    this.image.setPosition(p.x, p.y).setDisplaySize(p.w, p.h);
  }

  private killTween(): void {
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }
  }
}
