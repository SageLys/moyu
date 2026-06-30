import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DEPTH } from '../game/constants';
import type { ActionId } from '../core/types';

interface TabSpec {
  key: string;
  label: string;
  action: ActionId;
  content: string;
}

export interface ComputerPanelHandlers {
  onAction: (actionId: ActionId) => void;
  onClose: () => void;
}

/**
 * 电脑弹层（computer_panel 区域 240,96,800,536）。
 * 4 页签：文档/Excel/聊天/摸鱼。
 *  - 文档/Excel/聊天 → applyAction('switch_safe_work')
 *  - 摸鱼            → applyAction('open_fishing_page')
 * 点关闭按钮或点弹层外（backdrop）→ onClose（回 NORMAL_PLAY）。
 */
export class ComputerPanel {
  private static readonly PANEL_X = 240;
  private static readonly PANEL_Y = 96;
  private static readonly PANEL_W = 800;
  private static readonly PANEL_H = 536;

  private static readonly TABS: TabSpec[] = [
    { key: 'doc', label: '文档', action: 'switch_safe_work', content: '一份正在编辑的文档。屏幕处于可以被解释的工作页面。' },
    { key: 'excel', label: 'Excel', action: 'switch_safe_work', content: '一张排满公式的表格。看起来非常像在工作。' },
    { key: 'chat', label: '聊天', action: 'switch_safe_work', content: '工作群聊天窗口。停留在与本职工作相关的对话。' },
    { key: 'fishing', label: '摸鱼', action: 'open_fishing_page', content: '一个与本职工作关系很远的网页。精神值恢复，但屏幕不安全。' },
  ];

  private readonly scene: Phaser.Scene;
  private readonly handlers: ComputerPanelHandlers;
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Zone;
  private readonly contentText: Phaser.GameObjects.Text;
  private readonly tabHighlights = new Map<string, Phaser.GameObjects.Rectangle>();
  private activeTab = 'doc';
  // 当前页面类别（safe = 文档/Excel/聊天，fishing = 摸鱼）。默认页 doc 属安全页。
  private currentCategory: 'safe' | 'fishing' = 'safe';
  private open = false;

  constructor(scene: Phaser.Scene, handlers: ComputerPanelHandlers) {
    this.scene = scene;
    this.handlers = handlers;

    // 半透明遮罩，捕获弹层外点击
    this.backdrop = scene.add
      .zone(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT)
      .setInteractive()
      .setDepth(DEPTH.panel - 1)
      .setVisible(false);
    this.backdrop.on('pointerdown', () => this.handlers.onClose());

    const dim = scene.add
      .rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x0d1218, 0.45)
      .setDepth(DEPTH.panel - 1);

    const cx = ComputerPanel.PANEL_X + ComputerPanel.PANEL_W / 2;
    const cy = ComputerPanel.PANEL_Y + ComputerPanel.PANEL_H / 2;

    const frame = scene.add
      .image(0, 0, 'computer_panel_frame')
      .setDisplaySize(ComputerPanel.PANEL_W, ComputerPanel.PANEL_H);

    this.container = scene.add.container(cx, cy, [frame]).setDepth(DEPTH.panel);
    // dim 跟随弹层显隐
    this.container.setData('dim', dim);

    this.buildTabs();
    this.buildCloseButton();

    this.contentText = scene.add
      .text(0, 40, '', {
        color: '#2C3E50',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '20px',
        align: 'center',
        wordWrap: { width: ComputerPanel.PANEL_W - 120 },
      })
      .setOrigin(0.5);
    this.container.add(this.contentText);

    this.renderActive();
    this.setVisible(false);
  }

  private buildTabs(): void {
    const tabW = 150;
    const tabH = 40;
    const gap = 16;
    const totalW = ComputerPanel.TABS.length * tabW + (ComputerPanel.TABS.length - 1) * gap;
    const startX = -totalW / 2 + tabW / 2;
    const tabY = -ComputerPanel.PANEL_H / 2 + 90;

    ComputerPanel.TABS.forEach((tab, i) => {
      const x = startX + i * (tabW + gap);

      const highlight = this.scene.add
        .rectangle(x, tabY, tabW, tabH, 0xffb000, 1)
        .setStrokeStyle(2, 0x2c3e50);
      const labelBg = this.scene.add
        .rectangle(x, tabY, tabW, tabH, 0xc3cdd4, 1)
        .setStrokeStyle(2, 0x2c3e50)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add
        .text(x, tabY, tab.label, {
          color: '#2C3E50',
          fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
          fontSize: '18px',
        })
        .setOrigin(0.5);

      labelBg.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event?.stopPropagation?.();
        this.selectTab(tab);
      });

      this.tabHighlights.set(tab.key, highlight);
      this.container.add([highlight, labelBg, label]);
    });
  }

  private buildCloseButton(): void {
    const x = ComputerPanel.PANEL_W / 2 - 30;
    const y = -ComputerPanel.PANEL_H / 2 + 22;
    const btn = this.scene.add
      .rectangle(x, y, 32, 32, 0x7a1a1a, 1)
      .setStrokeStyle(2, 0x2c3e50)
      .setInteractive({ useHandCursor: true });
    const label = this.scene.add
      .text(x, y, '×', {
        color: '#E3DCCF',
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
      })
      .setOrigin(0.5);
    btn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event?.stopPropagation?.();
      this.handlers.onClose();
    });
    this.container.add([btn, label]);
  }

  private selectTab(tab: TabSpec): void {
    const prevCategory = this.currentCategory;
    const nextCategory: 'safe' | 'fishing' = tab.action === 'open_fishing_page' ? 'fishing' : 'safe';

    // 始终切换显示内容与页签高亮（纯呈现）。
    this.activeTab = tab.key;
    this.renderActive();

    // 仅在页面类别真正切换时才结算动作（防资源刷分）：
    //   safe → fishing 触发 open_fishing_page；fishing → safe 触发 switch_safe_work。
    //   在三个安全页之间切换、或重复点当前页，只换显示不结算。
    if (nextCategory === prevCategory) return;
    this.currentCategory = nextCategory;
    this.handlers.onAction(tab.action);
  }

  /** QA 用：按页签 key 模拟一次页签点击（等价于真实点击对应页签）。 */
  clickTabByKey(key: string): void {
    const tab = ComputerPanel.TABS.find((t) => t.key === key);
    if (tab) this.selectTab(tab);
  }

  /** 新一局开始：把页签复位到默认安全页，与重置后的 core 屏幕状态保持一致。 */
  reset(): void {
    this.activeTab = 'doc';
    this.currentCategory = 'safe';
    this.renderActive();
  }

  private renderActive(): void {
    for (const [key, highlight] of this.tabHighlights) {
      highlight.setVisible(key === this.activeTab);
    }
    const tab = ComputerPanel.TABS.find((t) => t.key === this.activeTab);
    if (tab) this.contentText.setText(tab.content);
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
    (this.container.getData('dim') as Phaser.GameObjects.Rectangle).setVisible(visible);
  }
}
