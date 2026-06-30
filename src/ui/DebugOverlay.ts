import Phaser from 'phaser';
import { DEPTH } from '../game/constants';
import type { GameState } from '../core/types';

/**
 * 调试浮层：按 ` 或 D 键切换。
 * 显示 spirit/satiety/trust/coworkerSpirit 精确值、currentMode、
 * 当前危险集合、wave、各计时器，用于 QA 验证。
 */
export class DebugOverlay {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.bg = scene.add
      .rectangle(8, 76, 360, 320, 0x0d1218, 0.8)
      .setOrigin(0, 0)
      .setDepth(DEPTH.debug)
      .setVisible(false);

    this.text = scene.add
      .text(16, 84, '', {
        color: '#7CFC9A',
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        lineSpacing: 3,
      })
      .setDepth(DEPTH.debug + 1)
      .setVisible(false);

    const kb = scene.input.keyboard;
    if (kb) {
      kb.on('keydown-BACKTICK', () => this.toggle());
      kb.on('keydown-D', () => this.toggle());
    }
  }

  toggle(): void {
    this.visible = !this.visible;
    this.bg.setVisible(this.visible);
    this.text.setVisible(this.visible);
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** 返回当前调试文本（即使浮层隐藏也可取，供 QA 断言）。 */
  buildText(state: GameState): string {
    const r = state.resources;
    const f1 = (n: number) => n.toFixed(1);
    const dangers = [...state.activeDangers];
    const buffs = [...state.activeBuffs];
    const qteSeq =
      state.qteSteps.length === 0
        ? '(none)'
        : state.qteSteps
            .map((s, i) => `${i === state.qteStepIndex ? '>' : ' '}${i}:${s.stepId}`)
            .join('\n         ');
    return [
      `mode:    ${state.currentMode}`,
      `wave:    ${state.wave}`,
      `spirit:  ${f1(r.spirit)}`,
      `satiety: ${f1(r.satiety)}`,
      `trust:   ${f1(r.trust)}`,
      `cowork:  ${f1(r.coworkerSpirit)}`,
      `dangers: [${dangers.join(', ')}]`,
      `buffs:   [${buffs.join(', ')}]`,
      `runTime:        ${f1(state.runTime)}`,
      `nextPatrol:     ${f1(state.nextLeaderPatrol)}`,
      `warningRem:     ${f1(state.leaderWarningRemaining)}`,
      `qteRemaining:   ${f1(state.qteRemaining)}`,
      `workTraceTimer: ${f1(state.workTraceTimer)}`,
      `safeWindow:     ${f1(state.safeWindow)}`,
      `qteIndex: ${state.qteStepIndex}`,
      `qteSteps: ${qteSeq}`,
    ].join('\n');
  }

  update(state: GameState): void {
    if (this.visible) {
      this.text.setText(this.buildText(state));
    }
  }
}
