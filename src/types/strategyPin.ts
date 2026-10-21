/**
 * 戰情室外部 AI 裁決回流協議與釘選資料型別 (Spec 0200 / Ticket 03)
 */

export interface StrategyLoopbackPayload {
  symbol: string;
  aiModel: string;
  verdict: string;
  stopLoss: number;
  takeProfit?: number;
  trendReversal?: number;
  validityDays: number;
}

export interface PinnedStrategy extends StrategyLoopbackPayload {
  id: string;
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  isExpired: boolean;
  acknowledgedAlert?: boolean; // 使用者是否已點擊確認警報，避免重複疲勞提示
}

export interface StrategyOutcomeRecord {
  id: string;
  symbol: string;
  aiModel: string;
  createdAt: string;
  closedAt: string;
  outcome: 'WIN' | 'LOSS' | 'EXPIRED';
  returnPct?: number;
}

export interface ModelWinRateStat {
  aiModel: string;
  total: number;
  wins: number;
  losses: number;
  expired: number;
  winRatePct: number;
}

export interface StrategyTriggerStatus {
  isStopLossTriggered: boolean;
  isTakeProfitTriggered: boolean;
  isReversalTriggered: boolean;
  triggerMessage?: string;
}
