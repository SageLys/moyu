import {
  buildTuningSections,
  resetTuningToDefaults,
  exportTunedJson,
  type TunableSection,
} from '../core/tuning';
import type { GameState } from '../core/types';

/**
 * 内置调参 / 调试面板（DOM 覆盖层，快捷键 T 切换）。
 * 左侧列出所有游戏性数值输入框（改动即时写回 config，多数下一 tick 生效）；顶部一排按钮：
 * 重开一局 / 恢复默认 / 导出JSON / 布局模式；底部实时显示当前局状态读数。
 * 用 DOM 而非 Phaser：多字段数值表单用原生 <input> 编辑体验远优于画布文字。
 *
 * 面板不介入正式玩法逻辑，仅作开发期调试工具；默认隐藏，不影响正常游玩。
 */
export interface TuningPanelHooks {
  onRestart: () => void;
  onToggleLayout: (on: boolean) => void;
  getLayoutJson: () => string;
}

export class TuningPanel {
  private readonly root: HTMLDivElement;
  private readonly readout: HTMLPreElement;
  private readonly sections: TunableSection[];
  private readonly inputs: Array<{ input: HTMLInputElement; get: () => number }> = [];
  private visible = false;
  private layoutOn = false;
  private readonly hooks: TuningPanelHooks;

  constructor(hooks: TuningPanelHooks) {
    this.hooks = hooks;
    this.sections = buildTuningSections();

    this.root = document.createElement('div');
    this.applyRootStyle();

    this.root.appendChild(this.buildHeader());
    this.root.appendChild(this.buildFields());

    this.readout = document.createElement('pre');
    this.readout.style.cssText =
      'margin:8px 0 0;padding:8px;background:#0d1218;border-radius:6px;color:#7CFC9A;font:12px/1.4 Consolas,monospace;white-space:pre-wrap;';
    this.root.appendChild(this.readout);

    document.body.appendChild(this.root);

    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if ((e.key === 't' || e.key === 'T') && !typing) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  private applyRootStyle(): void {
    this.root.style.cssText = [
      'position:fixed',
      'top:12px',
      'right:12px',
      'width:340px',
      'max-height:calc(100vh - 24px)',
      'overflow-y:auto',
      'z-index:99999',
      'background:rgba(20,26,34,0.96)',
      'border:1px solid #3A4A58',
      'border-radius:10px',
      'padding:12px',
      'color:#E3DCCF',
      'font:13px/1.4 Arial,"Microsoft YaHei",sans-serif',
      'box-shadow:0 8px 30px rgba(0,0,0,0.5)',
      'display:none',
    ].join(';');
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = '调参 / 调试面板  (按 T 关闭)';
    title.style.cssText = 'font-weight:bold;font-size:14px;margin-bottom:8px;color:#FFB000;';
    header.appendChild(title);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
    row.appendChild(this.button('重开一局', () => this.hooks.onRestart()));
    row.appendChild(
      this.button('恢复默认', () => {
        resetTuningToDefaults();
        this.syncInputs();
      }),
    );
    row.appendChild(this.button('导出JSON', () => this.exportJson()));
    const layoutBtn = this.button('布局模式: 关', () => {
      this.layoutOn = !this.layoutOn;
      layoutBtn.textContent = `布局模式: ${this.layoutOn ? '开' : '关'}`;
      layoutBtn.style.background = this.layoutOn ? '#7a5a1a' : '#2E3C48';
      this.hooks.onToggleLayout(this.layoutOn);
    });
    row.appendChild(layoutBtn);
    header.appendChild(row);
    return header;
  }

  private buildFields(): HTMLElement {
    const wrap = document.createElement('div');
    for (const section of this.sections) {
      const h = document.createElement('div');
      h.textContent = section.title;
      h.style.cssText =
        'font-weight:bold;margin:10px 0 4px;padding-bottom:2px;border-bottom:1px solid #3A4A58;color:#9ABBC4;';
      wrap.appendChild(h);

      if (section.note) {
        const note = document.createElement('div');
        note.textContent = section.note;
        note.style.cssText = 'font-size:11px;color:#8aa;opacity:0.8;margin-bottom:4px;';
        wrap.appendChild(note);
      }

      for (const field of section.fields) {
        const rowEl = document.createElement('label');
        rowEl.style.cssText =
          'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0;';
        const span = document.createElement('span');
        span.textContent = field.label + (field.restart ? ' ↻' : '');
        span.style.cssText = 'flex:1;font-size:12px;';
        const input = document.createElement('input');
        input.type = 'number';
        input.step = String(field.step);
        if (field.min !== undefined) input.min = String(field.min);
        if (field.max !== undefined) input.max = String(field.max);
        input.value = String(field.get());
        input.style.cssText =
          'width:78px;padding:3px 5px;background:#0d1218;border:1px solid #3A4A58;border-radius:4px;color:#E3DCCF;font:12px Consolas,monospace;';
        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          if (!Number.isNaN(v)) field.set(v);
        });
        this.inputs.push({ input, get: field.get });
        rowEl.appendChild(span);
        rowEl.appendChild(input);
        wrap.appendChild(rowEl);
      }
    }
    return wrap;
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText =
      'padding:5px 9px;background:#2E3C48;border:1px solid #3A4A58;border-radius:5px;color:#E3DCCF;cursor:pointer;font-size:12px;';
    b.addEventListener('click', onClick);
    return b;
  }

  private exportJson(): void {
    const text =
      '=== 数值 (回填 data/*.json) ===\n' +
      exportTunedJson() +
      '\n\n=== 布局 (回填 sceneObjects/sceneProps) ===\n' +
      this.hooks.getLayoutJson();
    navigator.clipboard?.writeText(text).catch(() => undefined);
    // 同时打印到控制台，便于无剪贴板权限时复制。
    // eslint-disable-next-line no-console
    console.log('[tuning export]\n' + text);
    this.flashReadout('已导出到剪贴板 + 控制台');
  }

  private flashReadout(msg: string): void {
    this.readout.textContent = msg;
  }

  /** 面板显隐后同步输入框到当前值（恢复默认后调用）。 */
  private syncInputs(): void {
    for (const { input, get } of this.inputs) input.value = String(get());
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? 'block' : 'none';
    if (this.visible) this.syncInputs();
  }

  isLayoutOn(): boolean {
    return this.layoutOn;
  }

  /** 每帧刷新底部状态读数（仅面板可见时）。 */
  update(state: GameState): void {
    if (!this.visible) return;
    const r = state.resources;
    const n = (x: number) => x.toFixed(1);
    this.readout.textContent = [
      `mode:  ${state.currentMode}   wave: ${state.wave}   t: ${n(state.runTime)}s`,
      `精神 ${n(r.spirit)}  饱腹 ${n(r.satiety)}  信任 ${n(r.trust)}  同事 ${n(r.coworkerSpirit)}`,
      `nextPatrol ${n(state.nextLeaderPatrol)}  warn ${n(state.leaderWarningRemaining)}  qte ${n(state.qteRemaining)}`,
      `dangers [${[...state.activeDangers].join(', ')}]`,
    ].join('\n');
  }
}
