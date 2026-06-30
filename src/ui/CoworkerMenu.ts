import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DEPTH } from '../game/constants';
import type { ActionId } from '../core/types';

interface BubbleSpec {
  asset: string;
  action: ActionId;
}

export interface CoworkerMenuHandlers {
  onAction: (actionId: ActionId) => void;
  onClose: () => void;
}

/**
 * 同事气泡菜单（coworker_bubble_menu 区域 260,340,200x200，贴近 coworker 右上方）。
 * 4 个圆形气泡：望风/求救/吐槽/安抚 →
 *   coworker_watch / coworker_rescue / coworker_complain / coworker_comfort。
 * 点击任一气泡 → 执行动作并关闭回 NORMAL_PLAY；点击菜单外（backdrop）→ 关闭。
 */
export class CoworkerMenu {
  private static readonly MENU_X = 260;
  private static readonly MENU_Y = 340;
  private static readonly DIAMETER = 70;

  // 2x2 排布，相对菜单区域左上角的气泡中心
  private static readonly BUBBLES: BubbleSpec[] = [
    { asset: 'coworker_bubble_watch', action: 'coworker_watch' },
    { asset: 'coworker_bubble_rescue', action: 'coworker_rescue' },
    { asset: 'coworker_bubble_complain', action: 'coworker_complain' },
    { asset: 'coworker_bubble_comfort', action: 'coworker_comfort' },
  ];

  private readonly handlers: CoworkerMenuHandlers;
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Zone;
  private open = false;

  constructor(scene: Phaser.Scene, handlers: CoworkerMenuHandlers) {
    this.handlers = handlers;

    this.backdrop = scene.add
      .zone(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT)
      .setInteractive()
      .setDepth(DEPTH.panel - 1)
      .setVisible(false);
    this.backdrop.on('pointerdown', () => this.handlers.onClose());

    this.container = scene.add.container(0, 0).setDepth(DEPTH.panel);

    const centers = [
      { x: 45, y: 45 },
      { x: 155, y: 45 },
      { x: 45, y: 155 },
      { x: 155, y: 155 },
    ];

    CoworkerMenu.BUBBLES.forEach((bubble, i) => {
      const cx = CoworkerMenu.MENU_X + centers[i].x;
      const cy = CoworkerMenu.MENU_Y + centers[i].y;
      const img = scene.add
        .image(cx, cy, bubble.asset)
        .setDisplaySize(CoworkerMenu.DIAMETER, CoworkerMenu.DIAMETER)
        .setInteractive({ useHandCursor: true });
      img.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event?.stopPropagation?.();
        this.handlers.onAction(bubble.action);
      });
      this.container.add(img);
    });

    this.setVisible(false);
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  isOpen(): boolean {
    return this.open;
  }

  private setVisible(visible: boolean): void {
    this.open = visible;
    this.container.setVisible(visible);
    this.backdrop.setVisible(visible);
    if (this.backdrop.input) this.backdrop.input.enabled = visible;
  }
}
