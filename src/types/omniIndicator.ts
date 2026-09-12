import { BoxStatus } from './indicators';

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
    adx: number; // 趨勢強度 (>=25 代表強趨勢)
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
  trailingDefensePrice: number; // 滾動波段最高價 - 2.5 * ATR
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

// 6. 多空共振量化評估結果
export interface TechnicalConfluence {
  score: number; // 0 ~ 100 分
  rating: 'STRONG_BULL' | 'MODERATE_BULL' | 'NEUTRAL' | 'MODERATE_BEAR' | 'STRONG_BEAR';
  primarySignals: string[]; // 核心多空特徵條列 (如: "均線多頭排列", "MACD紅柱擴張")
  actionAdvice: string;     // 具體紀律指引 (如: "多頭動能強勁，跌破移動防守線前續抱")
  riskAlert?: string;       // 潛在風險預警 (如: "KD已進入極端超買區，慎防正乖離過大短拉回")
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
