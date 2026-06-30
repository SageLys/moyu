export type GameMode =
  | 'START'
  | 'NORMAL_PLAY'
  | 'COMPUTER_PANEL'
  | 'COWORKER_MENU'
  | 'LEADER_WARNING'
  | 'QTE_ACTIVE'
  | 'QTE_SUCCESS'
  | 'QTE_FAIL'
  | 'RUN_END';

export type ResourceId = 'spirit' | 'satiety' | 'trust' | 'coworkerSpirit';

export type ActionId =
  | 'switch_safe_work'
  | 'open_fishing_page'
  | 'check_phone'
  | 'eat_takeout'
  | 'drink_coffee'
  | 'organize_work_trace'
  | 'coworker_watch'
  | 'coworker_rescue'
  | 'coworker_complain'
  | 'coworker_comfort';

export type DangerId =
  | 'unsafe_screen'
  | 'phone_lit'
  | 'takeout_open'
  | 'desk_empty'
  | 'body_slack';

export type ObjectId =
  | 'computer'
  | 'keyboard'
  | 'phone'
  | 'takeout_box'
  | 'coffee'
  | 'files'
  | 'coworker'
  | 'protagonist'
  | 'leader';

export type QteStepId =
  | 'switch_safe_work'
  | 'put_away_phone'
  | 'put_away_takeout'
  | 'organize_work_trace'
  | 'sit_up'
  | 'type_keyboard';

export type BuffId = 'coworkerWatch' | 'coworkerRescue';

export type EndReason =
  | 'spirit_zero'
  | 'satiety_zero'
  | 'trust_zero'
  | 'coworkerSpirit_zero';

export interface QteStep {
  stepId: QteStepId;
  targetObjectId: ObjectId;
  clearsDanger: DangerId | null;
}

export interface GameState {
  currentMode: GameMode;
  wave: number;
  runTime: number;
  resources: Record<ResourceId, number>;
  activeDangers: Set<DangerId>;
  activeBuffs: Set<BuffId>;
  qteSteps: QteStep[];
  qteStepIndex: number;
  qteRemaining: number;
  nextLeaderPatrol: number;
  leaderWarningRemaining: number;
  workTraceTimer: number;
  safeWindow: number;
  endReason: EndReason | null;
}
