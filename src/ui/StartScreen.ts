import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DEPTH } from '../game/constants';
import { resolveCopyText } from '../core/text';

export interface StartScreenHandlers {
  onStart: () => void;
}

/**
 * 开始页（START 状态）：用 start_screen_background 铺满画面，提供"开始"入口，
 * 点击后由 GameScene 调用 core.createInitialGameState 进入 NORMAL_PLAY。
 * 纯呈现，不含任何玩法数值；副标题文案走 copyText（systemMessages.run_start）。
 */
export class StartScreen {
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, handlers: StartScreenHandlers) {
    const bg = scene.add
      .image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'start_screen_background')
      .setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);

    const title = scene.add
      .text(CANVAS_WIDTH / 2, 250, '假装正在工作', {
        color: '#E3DCCF',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#0d1218', 6);

    const subtitle = scene.add
      .text(CANVAS_WIDTH / 2, 320, StartScreen.resolve('systemMessages.run_start'), {
        color: '#C3CDD4',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5);

    const btnBg = scene.add
      .rectangle(CANVAS_WIDTH / 2, 460, 220, 64, 0x2c3e50, 0.94)
      .setStrokeStyle(3, 0xffb000)
      .setInteractive({ useHandCursor: true });
    const btnLabel = scene.add
      .text(CANVAS_WIDTH / 2, 460, '开始', {
        color: '#E3DCCF',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '26px',
      })
      .setOrigin(0.5);
    btnBg.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event?.stopPropagation?.();
        handlers.onStart();
      },
    );

    this.container = scene.add
      .container(0, 0, [bg, title, subtitle, btnBg, btnLabel])
      .setDepth(DEPTH.startScreen);
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  isOpen(): boolean {
    return this.container.visible;
  }

  private static resolve(key: string): string {
    const v = resolveCopyText(key);
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && v.length > 0) return v[0];
    return '';
  }
}
