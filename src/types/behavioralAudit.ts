export interface DispositionEffectMetrics {
  avgHoldingDaysGain: number;       // 獲利平倉批次之平均持有自然天數
  avgHoldingDaysLoss: number;       // 虧損部位 (含浮虧) 之平均持有自然天數
  holdingDaysBiasRatio: number;     // 偏誤比率 = avgHoldingDaysLoss / avgHoldingDaysGain
  pgr: number;                      // 獲利實現比率 (Proportion of Gains Realized)
  plr: number;                      // 虧損實現比率 (Proportion of Losses Realized)
  severity: 'HEALTHY' | 'MODERATE' | 'SEVERE';
  diagnosisText: string;
}

export interface FOMOEntryAuditMetrics {
  totalBuyTradesCount: number;
  chasingHighTradesCount: number;   // 買在 60MA 季線正乖離率 > 15% 的筆數
  chasingHighRatio: number;         // 追高交易佔比 %
  chasingHighWinRate: number;       // 追高買進之最終獲利勝率 %
  calmEntryWinRate: number;         // 非過熱進場之最終獲利勝率 %
  alphaDragPercentage: number;      // 因追高導致的勝率減損點數 (calm - chasing)
}

export interface FrictionCostMetrics {
  totalFeesPaid: number;            // 累計手續費 (TWD)
  totalTaxesPaid: number;           // 累計證交稅 (TWD)
  totalFrictionCost: number;        // 總摩擦成本
  annualizedTurnoverRate: number;   // 年化資金週轉率 %
  annualizedDragRatePercent: number;// 佔淨資產之年化侵蝕率 %
}

import { TradeIntent } from './stock';

export interface BagHoldingAlert {
  symbol: string;
  name: string;
  holdingDays: number;
  unrealizedPnLPercent: number;
  unrealizedPnLTwd: number;
  intent: TradeIntent;
  message: string;
}

export interface FrictionEquivalence {
  totalFrictionTwd: number;
  iphoneCount: number; // 相當於幾支頂配 iPhone (以 40,000 元/支計)
  diningCount: number; // 相當於幾次高級大餐 (以 2,500 元/次計)
  impactText: string;
}

export interface BehavioralAuditReport {
  period: { startDate: string; endDate: string };
  disposition: DispositionEffectMetrics;
  fomo: FOMOEntryAuditMetrics;
  friction: FrictionCostMetrics;
  actionableInsights: string[];     // 客觀交易紀律覆盤建議清單
  bagHoldings?: BagHoldingAlert[];  // Spec 0183: 波段凹單警報標的清單
  frictionEquivalence?: FrictionEquivalence; // Spec 0183: 摩擦成本實體化對照
}

