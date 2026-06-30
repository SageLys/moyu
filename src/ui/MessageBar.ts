import Phaser from 'phaser';
import { CANVAS_WIDTH } from '../game/constants';
import { DEPTH } from '../game/constants';

/**
 * 底部提示栏（bottom_message_bar 区域 0,664,1280,56）。
 * 只显示文字：hover 说明 / 点击反馈（core.applyAction 的 feedbackText）。
 * 不承载任何可点击的动作按钮（铁律 §3）。
 */
export class MessageBar {
  private static readonly BAR_Y = 664;
  private static readonly BAR_H = 56;

  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    scene.add
      .image(CANVAS_WIDTH / 2, MessageBar.BAR_Y + MessageBar.BAR_H / 2, 'bottom_message_bar')
      .setDisplaySize(CANVAS_WIDTH, MessageBar.BAR_H)
      .setDepth(DEPTH.ui);

    this.text = scene.add
      .text(24, MessageBar.BAR_Y + MessageBar.BAR_H / 2, '', {
        color: '#E3DCCF',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '17px',
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.ui + 1);
  }

  show(message: string): void {
    this.text.setText(message ?? '');
  }

  clear(): void {
    this.text.setText('');
  }
}
