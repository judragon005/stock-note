export interface MomentumAssetMetric {
  symbol: string;
  name?: string;
  market: 'TW' | 'US';
  currentPrice: number;
  returns3M: number;       // 3 個月報酬率 %
  returns6M: number;       // 6 個月報酬率 %
  returns12M: number;      // 12 個月報酬率 %
  momentumScore: number;   // 12-1M 加權動能評分
  isAboveRiskFree: boolean;// 12 個月報酬是否大於無風險利率
  rank: number;            // 資產池內部相對強弱名次 (1 為最強)
}

export type MomentumAction = 'HOLD_TOP' | 'SWITCH_ASSET' | 'MOVE_TO_CASH';

export interface DualMomentumSignal {
  universeId: string;
  universeName: string;
  calculatedAt: string;     // YYYY-MM-DD
  topAsset: MomentumAssetMetric;
  currentHeldSymbol?: string;
  action: MomentumAction;
  actionHeadline: string;   // 例如 "【動能領跑・續抱持有】"
  actionAdvice: string;     // 紀律性操作建議
  safeHavenTriggered: boolean;
  leaderboard: MomentumAssetMetric[];
}

export interface MomentumUniverseConfig {
  id: string;
  name: string;
  description: string;
  symbols: Array<{ symbol: string; market: 'TW' | 'US'; name?: string }>;
  riskFreeRateAnnualized: number; // 預設 0.04 (4%)
}
