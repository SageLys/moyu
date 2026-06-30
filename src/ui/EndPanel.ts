import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DEPTH } from '../game/constants';
import { resolveCopyText } from '../core/text';
import type { EndReason } from '../core/types';

export interface EndPanelHandlers {
  onRestart: () => void;
}

/**
 * 结束面板（RUN_END 状态，end_panel 区域 340,160,600x400，见 SCENE_LAYOUT §3）。
 * 显示存活时间、最高波次、按 endReason 随机取一条结束陈述、对应结局插画、重新开始按钮。
 * 背后场景变暗作衬底。面板不出现"死亡/崩溃/Game Over"（制作方案 §9）。
 * 结束陈述与插画的归属全部来自配置（copyText.endTexts / visuals 对应 assetId），不硬编码文案。
 */
export class EndPanel {
  private static readonly PANEL_X = 340;
  private static readonly PANEL_Y = 160;
  private static readonly PANEL_W = 600;
  private static readonly PANEL_H = 400;

  // endReason → { copyText 结束陈述路径, 结局插画 assetId }。
  private static readonly END_MAP: Record<EndReason, { textKey: string; illo: string }> = {
    spirit_zero: { textKey: 'endTexts.spirit_zero', illo: 'end_spirit_alien' },
    satiety_zero: { textKey: 'endTexts.satiety_zero', illo: 'end_satiety_shutdown' },
    trust_zero: { textKey: 'endTexts.trust_zero', illo: 'end_trust_desk_cleared' },
    coworkerSpirit_zero: { textKey: 'endTexts.coworker_spirit_zero', illo: 'end_coworker_broadcast' },
  };

  private readonly container: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly illo: Phaser.GameObjects.Image;
  private readonly metaText: Phaser.GameObjects.Text;
  private readonly statementText: Phaser.GameObjects.Text;
  private open = false;

  constructor(scene: Phaser.Scene, handlers: EndPanelHandlers) {
    const cx = EndPanel.PANEL_X + EndPanel.PANEL_W / 2;
    const cy = EndPanel.PANEL_Y + EndPanel.PANEL_H / 2;

    // 背后场景变暗衬底（覆盖整屏，含状态栏/提示栏）。
    this.dim = scene.add
      .rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x0d1218, 0.6)
      .setDepth(DEPTH.endPanel)
      .setVisible(false);

    const frame = scene.add
      .image(0, 0, 'end_panel_frame')
      .setDisplaySize(EndPanel.PANEL_W, EndPanel.PANEL_H);

    // 结局插画（上部居中）。
    this.illo = scene.add.image(0, -110, 'end_spirit_alien').setDisplaySize(240, 150);

    // 结束陈述（插画下方，自动换行）。
    this.statementText = scene.add
      .text(0, 10, '', {
        color: '#E3DCCF',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '18px',
        align: 'center',
        wordWrap: { width: EndPanel.PANEL_W - 100 },
      })
      .setOrigin(0.5);

    // 存活时间 + 最高波次。
    this.metaText = scene.add
      .text(0, 95, '', {
        color: '#C3CDD4',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '18px',
        align: 'center',
      })
      .setOrigin(0.5);

    // 重新开始按钮。
    const btnBg = scene.add
      .rectangle(0, 150, 200, 50, 0x2c3e50, 1)
      .setStrokeStyle(3, 0xffb000)
      .setInteractive({ useHandCursor: true });
    const btnLabel = scene.add
      .text(0, 150, '重新开始', {
        color: '#E3DCCF',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '22px',
      })
      .setOrigin(0.5);
    btnBg.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event?.stopPropagation?.();
        handlers.onRestart();
      },
    );

    this.container = scene.add
      .container(cx, cy, [frame, this.illo, this.statementText, this.metaText, btnBg, btnLabel])
      .setDepth(DEPTH.endPanel + 1)
      .setVisible(false);
  }

  /** 按 core 的结束原因/存活时间/波次填充并弹出。 */
  show(endReason: EndReason, runTimeSec: number, wave: number): void {
    const map = EndPanel.END_MAP[endReason];
    this.illo.setTexture(map.illo).setDisplaySize(240, 150);
    this.statementText.setText(EndPanel.pickStatement(map.textKey));
    this.metaText.setText(`存活 ${EndPanel.fmtTime(runTimeSec)}　最高第 ${wave} 波`);
    this.open = true;
    this.dim.setVisible(true);
    this.container.setVisible(true);
  }

  hide(): void {
    this.open = false;
    this.dim.setVisible(false);
    this.container.setVisible(false);
  }

  isOpen(): boolean {
    return this.open;
  }

  private static pickStatement(textKey: string): string {
    const v = resolveCopyText(textKey);
    if (Array.isArray(v) && v.length > 0) return v[Math.floor(Math.random() * v.length)];
    if (typeof v === 'string') return v;
    return '';
  }

  private static fmtTime(seconds: number): string {
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
