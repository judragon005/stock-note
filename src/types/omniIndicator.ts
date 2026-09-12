import { BoxStatus } from './indicators';

// 市場狀態機枚舉
export type MarketRegime = 'TRENDING_BULL' | 'TRENDING_BEAR' | 'CHOPPY_RANGE' | 'VOLATILITY_SQUEEZE';

// 1. 趨勢指標群
export interface TrendMetrics {
  ma5?: number;
  ma20?: number;
  ma60?: number;
  ma120?: number;
  ma240?: number;
  maAlignment: 'BULLISH' | 'BEARISH' | 'ENTANGLED'; // 多頭排列 / 空頭排列 / 糾結
  macd: {
    dif: number;
    signal: number;
    hist: number;
    isGoldenCross: boolean;
    isDeathCross: boolean;
  };
  dmiAdx?: {
    pdi: number; // +DI
    mdi: number; // -DI
    adx: number; // 趨勢強度 (>=25 代表強趨勢, <20 代表盤整無趨勢)
    trendDirection: 'BULLISH' | 'BEARISH' | 'RANGE';
  };
}

// 2. 動能擺盪指標群
export interface MomentumMetrics {
  rsi6?: number;
  rsi14?: number;
  rsi24?: number;
  rsiStatus: 'OVERBOUGHT' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'OVERSOLD';
  kd9: {
    k: number;
    d: number;
    status: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'HIGH_DULL' | 'LOW_DULL' | 'NEUTRAL';
  };
  cci20?: number; // 順勢指標 (>100 超買, <-100 超賣)
  williamsR14?: number; // 威廉指標 (0~-20 超買, -80~-100 超賣)
}

// 3. 波動通道指標群
export interface VolatilityMetrics {
  bollinger: {
    upper: number;
    mid: number;
    lower: number;
    bandwidthPercent: number;
    percentB: number; // (Price - Lower) / (Upper - Lower)
    isSqueeze: boolean; // 帶寬 <= 8%
  };
  atr14: number;
  trailingDefensePrice: number; // 滾動波段最高價 - 2.5 * ATR (吊燈動態防守)
  bias20Percent: number; // (Close - MA20) / MA20 * 100%
  bias60Percent: number;
}

// 4. 量能與資金流指標群
export interface VolumeFlowMetrics {
  yesterdayVolume: number;
  avgVolume5: number;
  avgVolume20: number;
  volumeRatio5: number; // 昨日量 / 5日均量
  isSurge: boolean;     // 量能放大 >= 1.8x
  isDryUp: boolean;     // 量能窒息 <= 0.35x
  obv: {
    current: number;
    trend: 'RISING' | 'FALLING' | 'FLAT';
  };
  trustNetBuyRatio?: number; // 投量比 % (台股)
}

// 5. 關鍵支撐壓力與價格位階群
export interface SupportResistanceLevels {
  darvasBox: {
    upper: number;
    lower: number;
    status: BoxStatus;
  };
  fibonacci: {
    high: number;
    low: number;
    fib236: number; // 0.236
    fib382: number; // 0.382
    fib500: number; // 0.500
    fib618: number; // 0.618
    fib786: number; // 0.786
  };
  pivotPoints: {
    pivot: number; // (H + L + C) / 3
    r1: number;    // 2P - L
    r2: number;    // P + (H - L)
    s1: number;    // 2P - H
    s2: number;    // P - (H - L)
  };
}

// 關鍵價位密集聚集群 (Cluster)
export interface KeyLevelCluster {
  price: number;
  spanStart: number;
  spanEnd: number;
  label: string; // 例如: "箱頂 10.51 + 布林上軌 10.54"
  distancePercent: number; // 與當前價差距 %
  sources: string[];
}

export interface KeyLevelClusters {
  primaryResistance?: KeyLevelCluster; // 第一壓力帶 (減碼區)
  secondaryResistance?: KeyLevelCluster; // 次級阻力帶 (續強目標)
  shortTermDefense?: KeyLevelCluster; // 短線防守帶
  structuralDefense?: KeyLevelCluster; // 結構底線
}

// 背離訊號
export interface DivergenceSignal {
  hasBearishDivergence: boolean; // 頂背離
  hasBullishDivergence: boolean; // 底背離
  description?: string;
}

// 價格行為陷阱 (Price Action Trap)
export interface PriceActionTrapSignal {
  hasBullTrap: boolean; // 誘多假突破 (壓力帶長上影線/墓碑線)
  hasBearTrap: boolean; // 誘空假跌破 (支撐帶長下影線/長針破底翻)
  description?: string;
}

// 實戰交易階梯矩陣 (Actionable Trade Matrix)
export interface ActionableTradeMatrix {
  primaryResistanceZone: { price: number; label: string; distancePercent: number };
  expansionTargetZone: { price: number; label: string; distancePercent: number };
  shortTermDefenseLine: { price: number; label: string; distancePercent: number };
  structuralInvalidationLine: { price: number; label: string; distancePercent: number };
}

// 6. 多空共振量化評估結果 (升級版大腦)
export interface TechnicalConfluence {
  score: number; // 0 ~ 100 分
  rating: 'STRONG_BULL' | 'MODERATE_BULL' | 'NEUTRAL' | 'MODERATE_BEAR' | 'STRONG_BEAR';
  marketRegime: MarketRegime;
  regimeLabel: string; // 例如: "⚡ 變盤在即 (Squeeze)"、"〰️ 無趨勢盤整 (Choppy)"
  oneSentenceBottomLine: string; // 0秒一眼決策核心：繁體中文大白話操盤指南
  contradictionPenaltyApplied: boolean; // 是否觸發無趨勢矛盾懲罰
  primarySignals: string[]; // 核心多空特徵條列
  actionAdvice: string;     // 具體紀律指引
  riskAlert?: string;       // 潛在風險預警
  clusters: KeyLevelClusters;
  actionMatrix: ActionableTradeMatrix;
  divergence: DivergenceSignal;
  priceActionTrap: PriceActionTrapSignal;
  chipsContradiction?: boolean;
}

// 7. 個股全指標整合資料包
export interface OmniIndicatorReport {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  asOfDate: string;
  currentPrice: number;
  previousClose?: number;
  dailyChange?: number;
  dailyChangePercent?: number;
  candleCount: number;
  trend: TrendMetrics;
  momentum: MomentumMetrics;
  volatility: VolatilityMetrics;
  volumeFlow: VolumeFlowMetrics;
  levels: SupportResistanceLevels;
  confluence: TechnicalConfluence;
}
