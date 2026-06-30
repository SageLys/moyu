import Phaser from 'phaser';
import { CANVAS_WIDTH } from '../game/constants';
import { DEPTH } from '../game/constants';
import { getResource } from '../core/config';
import type { GameState, ResourceId } from '../core/types';

interface BarSpec {
  id: ResourceId;
  label: string;
  color: number;
}

/**
 * 顶部状态栏：精神/饱腹/信任 三条图形资源条（按 0–100 比例绘制），
 * 外加存活时间与当前波次。不显示任何资源的具体数值。
 * 比例用各资源 min/max 计算（读 resources.json），不硬编码 100。
 */
export class StatusBar {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly waveText: Phaser.GameObjects.Text;

  // 资源条几何（顶部状态栏区域 0..64 内）
  private static readonly BAR_X = 96;
  private static readonly BAR_W = 200;
  private static readonly BAR_H = 14;
  private static readonly BARS: BarSpec[] = [
    { id: 'spirit', label: '精神', color: 0x7a9fa8 },
    { id: 'satiety', label: '饱腹', color: 0xc9a86b },
    { id: 'trust', label: '信任', color: 0x8fae86 },
  ];

  private readonly labels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    scene.add
      .image(CANVAS_WIDTH / 2, 32, 'top_status_bar')
      .setDisplaySize(CANVAS_WIDTH, 64)
      .setDepth(DEPTH.ui);

    this.graphics = scene.add.graphics().setDepth(DEPTH.ui + 1);

    // 资源条文字标签（无数值）
    StatusBar.BARS.forEach((bar, i) => {
      const x = StatusBar.barX(i);
      this.labels.push(
        scene.add
          .text(x - 36, 24, bar.label, {
            color: '#D8D0C0',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            fontSize: '15px',
          })
          .setOrigin(0, 0.5)
          .setDepth(DEPTH.ui + 1),
      );
    });

    this.timeText = scene.add
      .text(CANVAS_WIDTH - 24, 18, '', {
        color: '#E3DCCF',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '16px',
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.ui + 1);

    this.waveText = scene.add
      .text(CANVAS_WIDTH - 24, 42, '', {
        color: '#C3CDD4',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '16px',
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.ui + 1);
  }

  private static barX(index: number): number {
    return StatusBar.BAR_X + index * (StatusBar.BAR_W + 60);
  }

  update(state: GameState): void {
    const g = this.graphics;
    g.clear();

    const y = 32 - StatusBar.BAR_H / 2;
    StatusBar.BARS.forEach((bar, i) => {
      const x = StatusBar.barX(i);
      const cfg = getResource(bar.id);
      const ratio = Phaser.Math.Clamp(
        (state.resources[bar.id] - cfg.min) / (cfg.max - cfg.min),
        0,
        1,
      );

      // 轨道
      g.fillStyle(0x1a2228, 1);
      g.fillRoundedRect(x, y, StatusBar.BAR_W, StatusBar.BAR_H, 6);
      // 填充
      g.fillStyle(bar.color, 1);
      const fillW = Math.max(0, Math.round(StatusBar.BAR_W * ratio));
      if (fillW > 0) {
        g.fillRoundedRect(x, y, fillW, StatusBar.BAR_H, 6);
      }
      // 描边
      g.lineStyle(2, 0x3a4a58, 1);
      g.strokeRoundedRect(x, y, StatusBar.BAR_W, StatusBar.BAR_H, 6);
    });

    this.timeText.setText(`存活 ${StatusBar.formatTime(state.runTime)}`);
    this.waveText.setText(`第 ${state.wave} 波`);
  }

  private static formatTime(seconds: number): string {
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
