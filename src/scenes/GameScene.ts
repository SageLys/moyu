import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DEPTH } from '../game/constants';
import { sceneObjects, sceneProps, getQteStep, gameRules } from '../core/config';
import { resolveCopyText } from '../core/text';
import { createInitialGameState, tickGame } from '../core/state';
import { applyAction } from '../core/actions';
import { applyQteStepClick } from '../core/qte';
import type { GameState, GameMode, ActionId, ObjectId, ResourceId, EndReason } from '../core/types';
import { ObjectView } from '../render/objectView';
import { LeaderView } from '../render/leaderView';
import { EdgeDarken } from '../render/edgeDarken';
import { QteHighlight } from '../render/qteHighlight';
import { StatusBar } from '../ui/StatusBar';
import { MessageBar } from '../ui/MessageBar';
import { ComputerPanel } from '../ui/ComputerPanel';
import { CoworkerMenu } from '../ui/CoworkerMenu';
import { LeaderWarningHud } from '../ui/LeaderWarningHud';
import { StartScreen } from '../ui/StartScreen';
import { EndPanel } from '../ui/EndPanel';
import { DebugOverlay } from '../ui/DebugOverlay';
import { TuningPanel } from '../ui/TuningPanel';

type SceneObjectConfig = (typeof sceneObjects)[keyof typeof sceneObjects];

/** 平时点击场景物件 → 动作 id 的路由（不含打开弹层的 computer/coworker）。 */
const OBJECT_ACTION: Partial<Record<string, ActionId>> = {
  phone: 'check_phone',
  takeout_box: 'eat_takeout',
  coffee: 'drink_coffee',
  files: 'organize_work_trace',
};

// 渲染顺序：先主角本体，再同事，再桌面物件（深度区分，见 SCENE_LAYOUT §2）。
// leader 不在此列：它单独由 LeaderView 渲染于 midground，无 hitbox、不可点击。
const INTERACTABLE_DEPTHS: Record<string, number> = {
  protagonist: DEPTH.protagonist,
  coworker: DEPTH.coworker,
  computer: DEPTH.deskItem,
  keyboard: DEPTH.deskItem,
  phone: DEPTH.deskItem,
  takeout_box: DEPTH.deskItem,
  coffee: DEPTH.deskItem,
  files: DEPTH.deskItem,
};

const VISIBLE_RESOURCES: ResourceId[] = ['spirit', 'satiety', 'trust'];
const RES_BAND_ORDER: Record<string, number> = { healthy: 0, dropping: 1, critical: 2 };
const COW_BAND_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
// 自由点击态：在这些模式下才推送资源/同事档位提示，避免与预警/QTE 的 HUD 文案抢占提示栏。
const FREE_PLAY_MODES = new Set<GameMode>(['NORMAL_PLAY', 'COMPUTER_PANEL', 'COWORKER_MENU']);

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private prevMode!: GameMode;
  private readonly views = new Map<string, ObjectView>();
  private leaderView!: LeaderView;
  private bgImage!: Phaser.GameObjects.Image;
  private readonly propImages = new Map<string, Phaser.GameObjects.Image>();
  private edgeDarken!: EdgeDarken;
  private qteHighlight!: QteHighlight;
  private safeGlow!: Phaser.GameObjects.Rectangle;
  private statusBar!: StatusBar;
  private messageBar!: MessageBar;
  private computerPanel!: ComputerPanel;
  private coworkerMenu!: CoworkerMenu;
  private hud!: LeaderWarningHud;
  private startScreen!: StartScreen;
  private endPanel!: EndPanel;
  private debugOverlay!: DebugOverlay;
  private hoverGfx!: Phaser.GameObjects.Graphics;
  private tuningPanel!: TuningPanel;
  private readonly zones = new Map<string, Phaser.GameObjects.Zone>();
  // 布局编辑模式：拖动物件/道具实时改坐标，冻结玩法。
  private layoutEdit = false;
  private layoutGfx!: Phaser.GameObjects.Graphics;
  private readonly layoutLabels = new Map<string, Phaser.GameObjects.Text>();

  // 非危险驱动的瞬时呈现态覆盖（files organized / protagonist sit_up）。
  private readonly transient = new Map<string, string>();
  // 首尾反馈档位缓存（仅在档位变差时推送提示）。
  private resBand: Record<string, string> = {};
  private cowBand = 'high';

  // QA 用：开启后 update() 不再自动 tick core，时序完全由 advance() 手动驱动（确定性）。
  private manualTick = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.state = createInitialGameState();

    // ── background ──────────────────────────────────────────────────────────
    this.bgImage = this.add
      .image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'office_background_base')
      .setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT)
      .setDepth(DEPTH.background);

    // ── 办公桌道具层（数据驱动，深度 deskProp，介于角色与桌面物件之间） ───────────
    for (const p of sceneProps) {
      const img = this.add
        .image(p.x, p.y, p.asset)
        .setDisplaySize(p.width, p.height)
        .setDepth(DEPTH.deskProp);
      this.propImages.set(p.id, img);
    }

    // ── midground: 领导（巡查/预警/检查/离开 动画由 core 状态切换驱动） ────────────
    this.leaderView = new LeaderView(this);

    // ── interactables: 主角本体 → 同事 → 桌面物件 ─────────────────────────────
    for (const id of Object.keys(INTERACTABLE_DEPTHS)) {
      this.views.set(id, new ObjectView(this, id, INTERACTABLE_DEPTHS[id]));
    }

    // 物件级 hover 描边
    this.hoverGfx = this.add.graphics().setDepth(DEPTH.hover);

    // 画面级暗角（ui 之下）、QTE 当前目标高亮（hover 之上）、安全窗口柔光（ui 之下）
    this.edgeDarken = new EdgeDarken(this);
    this.qteHighlight = new QteHighlight(this);
    this.safeGlow = this.add
      .rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0xfdf3d0, 1)
      .setDepth(DEPTH.safeGlow)
      .setAlpha(0)
      .setVisible(false);

    // ── ui ──────────────────────────────────────────────────────────────────
    this.statusBar = new StatusBar(this);
    this.messageBar = new MessageBar(this);
    this.computerPanel = new ComputerPanel(this, {
      onAction: (a) => this.runAction(a),
      onClose: () => this.closeComputerPanel(),
    });
    this.coworkerMenu = new CoworkerMenu(this, {
      onAction: (a) => this.runCoworkerAction(a),
      onClose: () => this.closeCoworkerMenu(),
    });
    this.hud = new LeaderWarningHud(this);
    this.endPanel = new EndPanel(this, { onRestart: () => this.beginRun() });
    this.startScreen = new StartScreen(this, { onStart: () => this.beginRun() });
    this.debugOverlay = new DebugOverlay(this);

    // ── 内置调参 / 布局调试面板（快捷键 T） ─────────────────────────────────────
    this.layoutGfx = this.add.graphics().setDepth(DEPTH.debug - 1).setVisible(false);
    this.tuningPanel = new TuningPanel({
      onRestart: () => this.beginRun(),
      onToggleLayout: (on) => this.setLayoutEditMode(on),
      getLayoutJson: () => this.buildLayoutJson(),
    });

    // ── 为可在 NORMAL_PLAY 或 QTE 点击的对象建 hitbox 交互区 ────────────────────
    this.buildInteractiveZones();

    // 调试热键：L 立即触发一次领导巡查（便于确定性 QA）。
    this.input.keyboard?.on('keydown-L', () => this.triggerPatrol());

    // 初始进入开始页（START）：不衰减、不接收物件点击，等待"开始"。
    this.enterStartScreen();

    // 调试 API 仅在开发构建暴露（生产 build 下 import.meta.env.DEV 为 false，不挂 window.__game）。
    if (import.meta.env.DEV) this.exposeDebugApi();
  }

  /** 进入开始页（首屏与每次开始前的呈现态）。 */
  private enterStartScreen(): void {
    this.state.currentMode = 'START';
    this.prevMode = 'START';
    this.setBackground(false);
    this.startScreen.show();
    this.refreshObjectVisuals();
    this.statusBar.update(this.state);
  }

  /** 开始 / 重新开始：用 core.createInitialGameState 完全重置，回到 NORMAL_PLAY。 */
  private beginRun(): void {
    this.state = createInitialGameState();
    this.prevMode = 'NORMAL_PLAY';

    // 清理所有子层与呈现态，确保无残留。
    this.startScreen.hide();
    this.endPanel.hide();
    this.computerPanel.hide();
    this.computerPanel.reset();
    this.coworkerMenu.hide();
    this.hud.hide();
    this.edgeDarken.hide();
    this.qteHighlight.clear();
    this.hoverGfx.clear();
    this.safeGlow.setAlpha(0).setVisible(false);
    this.transient.clear();
    this.leaderView.reset();
    this.setBackground(false);

    this.initFeedbackBands();
    this.refreshObjectVisuals();
    this.statusBar.update(this.state);
    this.messageBar.show(this.resolveText('systemMessages.run_start'));
  }

  private buildInteractiveZones(): void {
    for (const [id, raw] of Object.entries(sceneObjects)) {
      const obj = raw as SceneObjectConfig;
      // leader 无 hitbox；其余对象只要在某个模式下可点击就建交互区（QTE 需要 keyboard/protagonist）。
      if (!(obj.clickableInNormal || obj.clickableInQte) || !obj.hitbox) continue;
      const hb = obj.hitbox;
      // 交互区深度须跟随对象的视觉层级：桌面物件（电脑/键盘…）在视觉上盖住主角下半身，
      // 若所有 zone 用同一深度，重叠处的命中优先级会退化为创建顺序，导致后建的 protagonist
      // zone 抢走电脑/键盘的点击（只剩未被遮挡的左侧窄条可点）。用各自的视觉深度对齐输入优先级。
      const zone = this.add
        .zone(hb.x + hb.width / 2, hb.y + hb.height / 2, hb.width, hb.height)
        .setInteractive({ useHandCursor: obj.clickableInNormal })
        .setDepth((INTERACTABLE_DEPTHS[id] ?? DEPTH.deskItem) + 1);

      zone.on('pointerover', () => this.onObjectHover(id));
      zone.on('pointerout', () => this.onObjectHoverEnd());
      zone.on('pointerdown', () => this.onObjectClick(id));
      this.zones.set(id, zone);
    }
  }

  // ── hover ───────────────────────────────────────────────────────────────────
  private onObjectHover(id: string): void {
    const obj = (sceneObjects as Record<string, SceneObjectConfig>)[id];
    // 仅在 NORMAL_PLAY 且该对象平时可点击时显示 hover；QTE 高亮优先、不被 hover 干扰。
    if (this.state.currentMode !== 'NORMAL_PLAY' || !obj.clickableInNormal) return;
    const text = resolveCopyText(obj.hoverTextKey);
    this.messageBar.show(typeof text === 'string' ? text : '');
    this.drawHover(obj);
  }

  private onObjectHoverEnd(): void {
    this.hoverGfx.clear();
  }

  private drawHover(obj: SceneObjectConfig): void {
    if (!obj.hitbox) return;
    const hb = obj.hitbox;
    this.hoverGfx.clear();
    this.hoverGfx.lineStyle(3, 0xffb000, 0.9);
    this.hoverGfx.strokeRoundedRect(hb.x, hb.y, hb.width, hb.height, 6);
  }

  // ── click routing ────────────────────────────────────────────────────────────
  private onObjectClick(id: string): void {
    // 宽限窗口(LEADER_WARNING)与 QTE 期间：任何对象点击都转发给 core 判定（命中/错点），不打开弹层。
    if (this.state.currentMode === 'QTE_ACTIVE' || this.state.currentMode === 'LEADER_WARNING') {
      this.onQteClick(id);
      return;
    }
    if (this.state.currentMode !== 'NORMAL_PLAY') return;

    if (id === 'computer') {
      this.openComputerPanel();
      return;
    }
    if (id === 'coworker') {
      this.openCoworkerMenu();
      return;
    }
    const action = OBJECT_ACTION[id];
    if (action) this.runAction(action);
  }

  /** QTE 点击转发：命中/错点的判定与结算全部走 core.applyQteStepClick。 */
  private onQteClick(id: string): void {
    const result = applyQteStepClick(this.state, id as ObjectId);
    const view = this.views.get(id);
    if (result.hit) {
      view?.flashSuccess(this);
      this.messageBar.show(result.feedbackText);
      // 命中后的"已整理/已坐直"瞬时呈现态。
      if (id === 'files') this.setTransient('files', 'organized', 1.5);
      else if (id === 'protagonist') this.setTransient('protagonist', 'sit_up', 1.0);
      if (!result.complete) {
        // 未结束：高亮与 HUD 提示转移到下一步。
        this.syncQtePresentation();
      } else {
        // 最后一步命中：core 已在本输入回调内同步把 currentMode 置为 QTE_SUCCESS。
        // 随后每帧 update() 先跑 tickGame，会无条件把 QTE_SUCCESS 推进到 NORMAL_PLAY，
        // stepPresentation 永远观察不到 QTE_SUCCESS。故在此直接驱动成功表现，并对齐
        // prevMode，使后续 stepPresentation 不会重复触发，且能正确切到 NORMAL_PLAY。
        this.handleModeChange('QTE_ACTIVE', 'QTE_SUCCESS');
        this.prevMode = 'QTE_SUCCESS';
      }
    } else {
      // 错点不立即判负：红闪 + HUD 抖动（core 已扣减倒计时），序列与高亮不变。
      view?.flashWrong(this);
      this.messageBar.show(result.feedbackText);
      this.hud.shake();
    }
    this.refreshObjectVisuals();
  }

  private runAction(actionId: ActionId): void {
    const result = applyAction(this.state, actionId);
    if (result.ok) {
      this.messageBar.show(result.feedbackText);
      // 整理工作痕迹：短暂显示"已整理"桌面（files organized）。
      if (actionId === 'organize_work_trace') this.setTransient('files', 'organized', 1.5);
    }
    this.refreshObjectVisuals();
    this.statusBar.update(this.state);
  }

  private runCoworkerAction(actionId: ActionId): void {
    this.runAction(actionId);
    this.closeCoworkerMenu();
  }

  // ── computer panel ───────────────────────────────────────────────────────────
  private openComputerPanel(): void {
    this.state.currentMode = 'COMPUTER_PANEL';
    this.hoverGfx.clear();
    this.computerPanel.show();
  }

  private closeComputerPanel(): void {
    this.computerPanel.hide();
    if (this.state.currentMode === 'COMPUTER_PANEL') {
      this.state.currentMode = 'NORMAL_PLAY';
    }
  }

  // ── coworker menu ────────────────────────────────────────────────────────────
  private openCoworkerMenu(): void {
    this.state.currentMode = 'COWORKER_MENU';
    this.hoverGfx.clear();
    this.coworkerMenu.show();
  }

  private closeCoworkerMenu(): void {
    this.coworkerMenu.hide();
    if (this.state.currentMode === 'COWORKER_MENU') {
      this.state.currentMode = 'NORMAL_PLAY';
    }
  }

  // ── 对象视觉刷新（危险整图/标记 + 非危险呈现态覆盖） ───────────────────────────
  private refreshObjectVisuals(): void {
    const overrides = this.computeOverrides();
    for (const [id, view] of this.views) {
      view.refresh(this, this.state.activeDangers, overrides[id]);
    }
  }

  /** 计算各对象的非危险呈现态：coworker 实时档位 + 瞬时 transient 覆盖。 */
  private computeOverrides(): Record<string, string | undefined> {
    const o: Record<string, string | undefined> = {};
    o.coworker = this.coworkerVisualState();
    for (const [id, st] of this.transient) o[id] = st;
    return o;
  }

  /** coworker idle/watch/unstable：unstable=同事精神值低档；watch=望风 buff 生效期间。 */
  private coworkerVisualState(): string {
    const { mediumAtOrAbove } = gameRules.feedback.coworkerBands;
    if (this.state.resources.coworkerSpirit < mediumAtOrAbove) return 'unstable';
    if (this.state.activeBuffs.has('coworkerWatch')) return 'watch';
    return 'idle';
  }

  private setTransient(id: string, st: string, sec: number): void {
    this.transient.set(id, st);
    this.time.delayedCall(sec * 1000, () => {
      if (this.transient.get(id) === st) this.transient.delete(id);
    });
  }

  // ── QTE 呈现：高亮当前目标 + HUD 显示当前步骤提示 ─────────────────────────────
  private syncQtePresentation(): void {
    const step = this.state.qteSteps[this.state.qteStepIndex];
    if (!step) return;
    this.qteHighlight.setTarget(step.targetObjectId);
    const stepCfg = getQteStep(step.stepId);
    // 宽限期显示 leaderWarningRemaining，严格 QTE 期显示 qteRemaining（每帧再由 stepPresentation 刷新）。
    const remaining =
      this.state.currentMode === 'LEADER_WARNING'
        ? this.state.leaderWarningRemaining
        : this.state.qteRemaining;
    this.hud.showQte(this.resolveText(stepCfg.promptTextKey), remaining);
  }

  // ── loop ─────────────────────────────────────────────────────────────────────
  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    // 布局编辑模式：冻结玩法，只画布局辅助线、刷新面板读数。
    if (this.layoutEdit) {
      this.drawLayoutGizmos();
      this.tuningPanel.update(this.state);
      return;
    }
    if (!this.manualTick) {
      tickGame(this.state, dt);
    }
    this.stepPresentation(dt);
    this.tuningPanel.update(this.state);
  }

  /**
   * 呈现与输入转发的统一推进（与 core 解耦）：同步弹层显隐、检测状态切换、
   * 推进逐帧动画、刷新 HUD 倒计时与对象视觉、推送档位提示。供 update() 与 advance() 共用。
   */
  private stepPresentation(dt: number): void {
    const mode = this.state.currentMode;

    // core 计时器可能在 LEADER_WARNING/QTE 触发时强制离开子状态：同步关闭弹层。
    if (this.computerPanel.isOpen() && mode !== 'COMPUTER_PANEL') this.computerPanel.hide();
    if (this.coworkerMenu.isOpen() && mode !== 'COWORKER_MENU') this.coworkerMenu.hide();

    if (mode !== this.prevMode) {
      this.handleModeChange(this.prevMode, mode);
      this.prevMode = mode;
    }

    this.leaderView.update(dt);
    this.qteHighlight.update(dt);

    // HUD 倒计时数值始终取自 core（本类不自行计时）。
    if (mode === 'LEADER_WARNING') this.hud.updateCountdown(this.state.leaderWarningRemaining);
    else if (mode === 'QTE_ACTIVE') this.hud.updateCountdown(this.state.qteRemaining);

    // 首尾反馈：仅在自由点击态推送资源/同事档位提示（不与 QTE/预警 HUD 抢占）。
    if (FREE_PLAY_MODES.has(mode)) this.emitFeedbackHints();

    this.refreshObjectVisuals();
    this.statusBar.update(this.state);
    this.debugOverlay.update(this.state);
  }

  /** 状态切换时的一次性呈现动作（开始/预警/进入 QTE/成败结算/结束）。 */
  private handleModeChange(_from: GameMode, to: GameMode): void {
    switch (to) {
      case 'NORMAL_PLAY': {
        // 进入/回到自由点击态：背景恢复 base（结算结语由 HUD 自行停留后隐藏）。
        this.setBackground(false);
        break;
      }
      case 'LEADER_WARNING': {
        // 强制回收子状态 UI；领导沿 approaching 移向 checking；边缘渐暗、背景切 warning。
        // 预警即"可收拾"的宽限窗口：高亮首个目标并在 HUD 显示步骤提示，玩家此刻就能点击收拾。
        this.computerPanel.hide();
        this.coworkerMenu.hide();
        this.hoverGfx.clear();
        this.setBackground(true);
        this.messageBar.show(this.resolveText('systemMessages.leader_warning_start'));
        this.edgeDarken.fadeTo(0.5, 0.6);
        this.leaderView.approach(this.state.leaderWarningRemaining);
        this.syncQtePresentation();
        break;
      }
      case 'QTE_ACTIVE': {
        this.setBackground(true);
        this.edgeDarken.fadeTo(0.8, 0.4);
        this.syncQtePresentation();
        break;
      }
      case 'QTE_SUCCESS': {
        this.qteHighlight.clear();
        this.hud.showResult(this.resolveText('systemMessages.qte_wave_success'));
        this.messageBar.show(this.resolveText('systemMessages.safe_window_start'));
        this.edgeDarken.fadeTo(0, 0.6);
        this.flashSafeWindow();
        this.setBackground(false);
        this.leaderView.leave();
        break;
      }
      case 'QTE_FAIL': {
        // 未完成危险的视觉标记保留（core 不清除其 dangers，refreshObjectVisuals 自然保留）。
        this.qteHighlight.clear();
        this.hud.showResult(this.resolveText('systemMessages.qte_wave_fail'));
        this.messageBar.show(this.resolveText('systemMessages.qte_wave_fail'));
        // 压力视觉加深，短暂停顿后领导离开、边缘消退、背景恢复。
        this.edgeDarken.fadeTo(1.0, 0.2);
        this.time.delayedCall(800, () => {
          this.edgeDarken.fadeTo(0, 0.8);
          this.setBackground(false);
          this.leaderView.leave();
        });
        break;
      }
      case 'RUN_END': {
        // 强制关闭所有子层（弹层/菜单/QTE 高亮/HUD），弹出结束面板。
        this.computerPanel.hide();
        this.coworkerMenu.hide();
        this.hud.hide();
        this.qteHighlight.clear();
        this.hoverGfx.clear();
        this.edgeDarken.hide();
        this.safeGlow.setAlpha(0).setVisible(false);
        this.messageBar.show('');
        this.setBackground(false);
        const reason = this.state.endReason;
        if (reason) this.endPanel.show(reason, this.state.runTime, this.state.wave);
        break;
      }
      default:
        break;
    }
  }

  /** 背景在 base / warning variant 之间切换（资产走 assets.ts 键，与 M3/M4 背景一致）。 */
  private setBackground(warning: boolean): void {
    const key = warning ? 'office_background_warning_variant' : 'office_background_base';
    if (this.bgImage.texture.key !== key) {
      this.bgImage.setTexture(key).setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  /** 安全窗口柔光：短暂全屏暖光淡入淡出（位于 ui 之下，不遮挡 HUD/提示栏）。 */
  private flashSafeWindow(): void {
    this.safeGlow.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.safeGlow,
      alpha: 0.22,
      duration: 220,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => this.safeGlow.setAlpha(0).setVisible(false),
    });
  }

  // ── 首尾反馈档位提示（数值零硬编码，阈值与文案均走配置） ───────────────────────
  private initFeedbackBands(): void {
    this.resBand = {};
    for (const id of VISIBLE_RESOURCES) this.resBand[id] = this.resourceBand(this.state.resources[id]);
    this.cowBand = this.coworkerBand(this.state.resources.coworkerSpirit);
  }

  private resourceBand(v: number): string {
    const { droppingBelow, criticalBelow } = gameRules.feedback.resourceBands;
    if (v < criticalBelow) return 'critical';
    if (v < droppingBelow) return 'dropping';
    return 'healthy';
  }

  private coworkerBand(v: number): string {
    const { highAtOrAbove, mediumAtOrAbove } = gameRules.feedback.coworkerBands;
    if (v >= highAtOrAbove) return 'high';
    if (v >= mediumAtOrAbove) return 'medium';
    return 'low';
  }

  /** 资源进入更低档时推送 resourceWarnings；同事精神值变差时推送 coworkerHints（提示栏，无数值）。 */
  private emitFeedbackHints(): void {
    let resMsg: string | null = null;
    let worstSev = -1;
    for (const id of VISIBLE_RESOURCES) {
      const nb = this.resourceBand(this.state.resources[id]);
      const prev = this.resBand[id] ?? 'healthy';
      if (RES_BAND_ORDER[nb] > RES_BAND_ORDER[prev] && RES_BAND_ORDER[nb] > worstSev) {
        worstSev = RES_BAND_ORDER[nb];
        resMsg = this.pickText(`resourceWarnings.${id}.${nb}`);
      }
      this.resBand[id] = nb;
    }

    let cowMsg: string | null = null;
    const ncb = this.coworkerBand(this.state.resources.coworkerSpirit);
    if (COW_BAND_ORDER[ncb] > COW_BAND_ORDER[this.cowBand]) {
      cowMsg = this.pickText(`coworkerHints.${ncb}`);
    }
    this.cowBand = ncb;

    // 资源告警优先于同事暗示（同帧只显示一条，避免互相覆盖）。
    const msg = resMsg ?? cowMsg;
    if (msg) this.messageBar.show(msg);
  }

  /** 取文案：数组随机一条、字符串原样。 */
  private pickText(key: string): string {
    const v = resolveCopyText(key);
    if (Array.isArray(v) && v.length > 0) return v[Math.floor(Math.random() * v.length)];
    if (typeof v === 'string') return v;
    return '';
  }

  private resolveText(key: string): string {
    const v = resolveCopyText(key);
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && v.length > 0) return v[0];
    return '';
  }

  /** 调试：立即触发一次领导巡查（清安全窗 + 巡查计时清零，确保下一 tick 进入预警）。 */
  private triggerPatrol(): void {
    if (this.state.currentMode === 'START' || this.state.currentMode === 'RUN_END') return;
    this.state.safeWindow = 0;
    this.state.nextLeaderPatrol = 0;
  }

  // ── 布局编辑模式（调参面板"布局模式"按钮驱动） ─────────────────────────────────
  /** 开/关布局编辑：让物件与办公桌道具可拖动，实时改坐标并冻结玩法。 */
  private setLayoutEditMode(on: boolean): void {
    this.layoutEdit = on;
    this.layoutGfx.setVisible(on);

    // 可拖动对象：交互物件本体 + 办公桌道具。
    const draggables: Array<{ id: string; img: Phaser.GameObjects.Image; kind: 'object' | 'prop' }> = [];
    for (const [id, view] of this.views) draggables.push({ id, img: view.image, kind: 'object' });
    for (const [id, img] of this.propImages) draggables.push({ id, img, kind: 'prop' });

    for (const { id, img, kind } of draggables) {
      if (on) {
        img.setInteractive({ draggable: true, useHandCursor: true });
        this.input.setDraggable(img, true);
        img.off('drag');
        img.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) =>
          this.onLayoutDrag(id, kind, img, x, y),
        );
      } else {
        img.off('drag');
        img.disableInteractive();
      }
    }

    if (!on) {
      this.layoutGfx.clear();
      for (const t of this.layoutLabels.values()) t.destroy();
      this.layoutLabels.clear();
    }
  }

  /** 拖动回调：移动精灵，并把新坐标写回 config（物件同步 hitbox 与交互区；道具写回 sceneProps）。 */
  private onLayoutDrag(
    id: string,
    kind: 'object' | 'prop',
    img: Phaser.GameObjects.Image,
    x: number,
    y: number,
  ): void {
    if (kind === 'object') {
      const cfg = (sceneObjects as Record<string, SceneObjectConfig>)[id];
      const dx = x - cfg.position.x;
      const dy = y - cfg.position.y;
      cfg.position.x = Math.round(x);
      cfg.position.y = Math.round(y);
      if (cfg.hitbox) {
        cfg.hitbox.x = Math.round(cfg.hitbox.x + dx);
        cfg.hitbox.y = Math.round(cfg.hitbox.y + dy);
        const zone = this.zones.get(id);
        zone?.setPosition(cfg.hitbox.x + cfg.hitbox.width / 2, cfg.hitbox.y + cfg.hitbox.height / 2);
      }
      img.setPosition(x, y);
    } else {
      const p = sceneProps.find((pr) => pr.id === id);
      if (p) {
        p.x = Math.round(x);
        p.y = Math.round(y);
      }
      img.setPosition(x, y);
    }
  }

  /** 画出所有 hitbox / 道具边框与坐标标签，辅助对位。 */
  private drawLayoutGizmos(): void {
    const g = this.layoutGfx;
    g.clear();

    for (const [id] of this.views) {
      const cfg = (sceneObjects as Record<string, SceneObjectConfig>)[id];
      if (!cfg.hitbox) continue;
      const hb = cfg.hitbox;
      g.lineStyle(1.5, 0xffb000, 0.9);
      g.strokeRect(hb.x, hb.y, hb.width, hb.height);
      this.gizmoLabel(`obj:${id}`, `${id}\n(${cfg.position.x},${cfg.position.y})`, hb.x + 2, hb.y + 2);
    }

    for (const p of sceneProps) {
      g.lineStyle(1.5, 0x33d6ff, 0.9);
      g.strokeRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
      this.gizmoLabel(`prop:${p.id}`, `${p.id}\n(${p.x},${p.y})`, p.x - p.width / 2 + 2, p.y - p.height / 2 + 2);
    }
  }

  private gizmoLabel(key: string, text: string, x: number, y: number): void {
    let t = this.layoutLabels.get(key);
    if (!t) {
      t = this.add
        .text(x, y, text, {
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.55)',
          fontFamily: 'Consolas, monospace',
          fontSize: '11px',
          padding: { x: 2, y: 1 },
        })
        .setDepth(DEPTH.debug);
      this.layoutLabels.set(key, t);
    }
    t.setText(text).setPosition(x, y).setVisible(true);
  }

  /** 导出当前布局（sceneObjects 坐标/hitbox + sceneProps）为可回填的 JSON 片段。 */
  private buildLayoutJson(): string {
    const objs: Record<string, unknown> = {};
    for (const [id] of this.views) {
      const cfg = (sceneObjects as Record<string, SceneObjectConfig>)[id];
      objs[id] = { position: cfg.position, hitbox: cfg.hitbox };
    }
    return JSON.stringify({ 'sceneObjects (positions/hitboxes)': objs, 'sceneProps.json': { props: sceneProps } }, null, 2);
  }

  /** 暴露调试 API，供无头/预览 QA 断言与模拟操作（仅供测试，不参与正式玩法）。 */
  private exposeDebugApi(): void {
    (window as unknown as Record<string, unknown>).__game = {
      getState: () => this.state,
      getDebugText: () => this.debugOverlay.buildText(this.state),
      clickObject: (id: string) => this.onObjectClick(id),
      selectComputerTab: (action: ActionId) => this.runAction(action),
      // 经由真实页签路径模拟点击（含「只在页面类别切换时才结算」的防刷逻辑）。
      clickComputerTab: (tabKey: string) => this.computerPanel.clickTabByKey(tabKey),
      selectCoworker: (action: ActionId) => this.runCoworkerAction(action),
      closeModal: () => {
        this.closeComputerPanel();
        this.closeCoworkerMenu();
      },
      toggleDebug: () => this.debugOverlay.toggle(),
      getObjectTexture: (id: string) => this.views.get(id)?.textureKey ?? null,
      // QA：返回场景坐标 (x,y) 处命中优先级最高（深度最大）的交互区 id，
      // 用于回归"重叠 hitbox 的点击落到视觉最上层对象"（电脑/键盘不再被主角 zone 抢点）。
      hitTestTop: (x: number, y: number): { id: string; depth: number } | null => {
        let top: { id: string; depth: number } | null = null;
        for (const [id, zone] of this.zones) {
          const b = zone.getBounds();
          if (x < b.x || x > b.right || y < b.y || y > b.bottom) continue;
          if (!top || zone.depth > top.depth) top = { id, depth: zone.depth };
        }
        return top;
      },
      // ── M4/M5 QA 扩展 ────────────────────────────────────────────────────────
      triggerPatrol: () => this.triggerPatrol(),
      // 只读表现层状态（供 P0-1 回归断言：领导是否离开 checking / 暗角是否消退 / HUD 是否收尾）。
      getLeaderPhase: () => this.leaderView.getPhase(),
      getEdgeDarkenAlpha: () => this.edgeDarken.getAlpha(),
      isHudVisible: () => this.hud.isVisible(),
      setManualTick: (on: boolean) => {
        this.manualTick = on;
      },
      // 手动按固定步长推进 core 时序（manualTick 开启时确定性驱动预警/QTE 倒计时）。
      advance: (seconds: number) => {
        const step = 1 / 60;
        let remaining = seconds;
        while (remaining > 1e-9) {
          const d = Math.min(step, remaining);
          tickGame(this.state, d);
          this.stepPresentation(d);
          remaining -= d;
        }
      },
      start: () => this.beginRun(),
      restart: () => this.beginRun(),
      // 兼容 M4：reset 等价于开始一局（完全重置回 NORMAL_PLAY）。
      reset: () => this.beginRun(),
      toStartScreen: () => this.enterStartScreen(),
    };
  }
}
