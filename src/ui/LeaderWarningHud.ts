import Phaser from 'phaser';
import { DEPTH } from '../game/constants';

/**
 * 领导警报 HUD（leader_warning_hud 区域 24,76,256x96，见 SCENE_LAYOUT §3）。
 * 仅呈现，不承载点击：
 *  - LEADER_WARNING：显示预警提示 + 剩余倒计时（core.leaderWarningRemaining）；
 *  - QTE_ACTIVE：显示当前步骤 promptText + 剩余倒计时（core.qteRemaining）；
 *  - QTE_SUCCESS / QTE_FAIL：显示巡查结束/发现异常结语，短暂停留后自动隐藏。
 * NORMAL_PLAY 期间隐藏。倒计时数值与时序全部来自 core，本类不自行计时。
 */
export class LeaderWarningHud {
  private static readonly X = 24;
  private static readonly Y = 76;
  private static readonly W = 256;
  private static readonly H = 96;

  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly countdownText: Phaser.GameObjects.Text;
  private resultTimer: Phaser.Time.TimerEvent | null = null;
  private shakeTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const bg = scene.add
      .image(0, 0, 'leader_warning_hud')
      .setOrigin(0, 0)
      .setDisplaySize(LeaderWarningHud.W, LeaderWarningHud.H);

    this.titleText = scene.add
      .text(16, 16, '', {
        color: '#E3DCCF',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '16px',
        wordWrap: { width: LeaderWarningHud.W - 32 },
      })
      .setOrigin(0, 0);

    this.countdownText = scene.add
      .text(16, LeaderWarningHud.H - 28, '', {
        color: '#FFB000',
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '20px',
      })
      .setOrigin(0, 0.5);

    this.container = scene.add
      .container(LeaderWarningHud.X, LeaderWarningHud.Y, [bg, this.titleText, this.countdownText])
      .setDepth(DEPTH.ui)
      .setVisible(false);
  }

  /** 预警阶段：标题 + 倒计时。 */
  showWarning(title: string, remainingSec: number): void {
    this.cancelResultTimer();
    this.container.setVisible(true);
    this.titleText.setText(title);
    this.countdownText.setText(LeaderWarningHud.fmt(remainingSec));
  }

  /** QTE 阶段：当前步骤提示 + 倒计时。 */
  showQte(promptText: string, remainingSec: number): void {
    this.cancelResultTimer();
    this.container.setVisible(true);
    this.titleText.setText(promptText);
    this.countdownText.setText(LeaderWarningHud.fmt(remainingSec));
  }

  /** 结算结语（成功/失败）：显示固定文案，不再显示倒计时，停留后自动隐藏。 */
  showResult(text: string, lingerSec = 1.8): void {
    this.cancelResultTimer();
    this.container.setVisible(true);
    this.titleText.setText(text);
    this.countdownText.setText('');
    this.resultTimer = this.scene.time.delayedCall(lingerSec * 1000, () => {
      this.container.setVisible(false);
      this.resultTimer = null;
    });
  }

  /** 仅刷新倒计时数值（每帧调用，不改标题）。 */
  updateCountdown(remainingSec: number): void {
    if (this.container.visible) {
      this.countdownText.setText(LeaderWarningHud.fmt(remainingSec));
    }
  }

  /** 错点反馈：HUD 整体轻微抖动（与 core 已扣减的倒计时联动）。 */
  shake(): void {
    if (this.shakeTween && this.shakeTween.isPlaying()) return;
    const baseX = LeaderWarningHud.X;
    this.shakeTween = this.scene.tweens.add({
      targets: this.container,
      x: { from: baseX - 6, to: baseX + 6 },
      duration: 50,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.container.x = baseX;
        this.shakeTween = null;
      },
    });
  }

  hide(): void {
    this.cancelResultTimer();
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  private cancelResultTimer(): void {
    if (this.resultTimer) {
      this.resultTimer.remove(false);
      this.resultTimer = null;
    }
  }

  private static fmt(sec: number): string {
    return `${Math.max(0, sec).toFixed(1)}s`;
  }
}
