import {
  MomentumAssetMetric,
  MomentumAction,
  DualMomentumSignal,
  MomentumUniverseConfig,
} from '../types/momentum';
import { DailyCandle } from '../types/indicators';

/**
 * 預設經典雙重動能資產池模板
 */
export const DEFAULT_MOMENTUM_UNIVERSES: MomentumUniverseConfig[] = [
  {
    id: 'global_macro',
    name: '全球宏觀全天候動能池 (Global Macro)',
    description: '涵蓋標普500 (SPY)、那斯達克 (QQQ)、元大台灣50 (0050)、黃金 (GLD) 與長天期公債 (TLT)。',
    riskFreeRateAnnualized: 0.04,
    symbols: [
      { symbol: 'SPY', market: 'US', name: '標普500 ETF' },
      { symbol: 'QQQ', market: 'US', name: '那斯達克100 ETF' },
      { symbol: '0050.TW', market: 'TW', name: '元大台灣50' },
      { symbol: 'GLD', market: 'US', name: 'SPDR 黃金 ETF' },
      { symbol: 'TLT', market: 'US', name: '20年期以上美國公債' },
    ],
  },
  {
    id: 'taiwan_core',
    name: '台股核心標的輪動池 (Taiwan Core Rotation)',
    description: '涵蓋市值型 0050、高股息 0056、高股息 00878 與低波動 00713。',
    riskFreeRateAnnualized: 0.02,
    symbols: [
      { symbol: '0050.TW', market: 'TW', name: '元大台灣50' },
      { symbol: '0056.TW', market: 'TW', name: '元大高股息' },
      { symbol: '00878.TW', market: 'TW', name: '國泰永續高股息' },
      { symbol: '00713.TW', market: 'TW', name: '元大台灣高息低波' },
    ],
  },
  {
    id: 'us_tech',
    name: '美股成長與板塊輪動池 (US Tech & Growth)',
    description: '那斯達克 (QQQ)、標普500 (SPY)、半導體 (SMH) 與醫療保健 (XLV)。',
    riskFreeRateAnnualized: 0.04,
    symbols: [
      { symbol: 'QQQ', market: 'US', name: 'Invesco QQQ' },
      { symbol: 'SPY', market: 'US', name: 'SPDR S&P 500' },
      { symbol: 'SMH', market: 'US', name: 'VanEck 半導體 ETF' },
      { symbol: 'XLV', market: 'US', name: '醫療保健板塊 ETF' },
    ],
  },
];

/**
 * 計算單一標的之滾動報酬與 12-1M 加權動能分數
 * - 12-1M: 50% * R_12M + 30% * R_6M + 20% * R_3M
 */
export function calculateAssetMomentum(
  symbol: string,
  market: 'TW' | 'US',
  candles: DailyCandle[],
  riskFreeRateAnnualized: number = 0.04,
  name?: string
): MomentumAssetMetric {
  if (candles.length === 0) {
    return {
      symbol,
      name,
      market,
      currentPrice: 0,
      returns3M: 0,
      returns6M: 0,
      returns12M: 0,
      momentumScore: -999,
      isAboveRiskFree: false,
      rank: 99,
    };
  }

  const len = candles.length;
  const currentPrice = candles[len - 1].close;

  // 交易日近似步長：3M = 63日, 6M = 126日, 12M = 252日
  const idx3M = Math.max(0, len - 1 - 63);
  const idx6M = Math.max(0, len - 1 - 126);
  const idx12M = Math.max(0, len - 1 - 252);

  const price3M = candles[idx3M].close;
  const price6M = candles[idx6M].close;
  const price12M = candles[idx12M].close;

  const returns3M = price3M > 0 ? ((currentPrice - price3M) / price3M) * 100 : 0;
  const returns6M = price6M > 0 ? ((currentPrice - price6M) / price6M) * 100 : 0;
  const returns12M = price12M > 0 ? ((currentPrice - price12M) / price12M) * 100 : 0;

  // 12-1M 加權動能評分
  const momentumScore =
    Math.round((0.5 * returns12M + 0.3 * returns6M + 0.2 * returns3M) * 100) / 100;

  const isAboveRiskFree = returns12M > riskFreeRateAnnualized * 100;

  return {
    symbol,
    name,
    market,
    currentPrice,
    returns3M: Math.round(returns3M * 100) / 100,
    returns6M: Math.round(returns6M * 100) / 100,
    returns12M: Math.round(returns12M * 100) / 100,
    momentumScore,
    isAboveRiskFree,
    rank: 1, // 後續排序指派
  };
}

export interface EvaluateDualMomentumParams {
  universeConfig: MomentumUniverseConfig;
  quotesMap: Record<string, DailyCandle[]>;
  currentHeldSymbol?: string;
  riskFreeRateAnnualized?: number;
}

/**
 * 評定指定資產池之雙重動能信號與資產輪動排行榜
 */
export function evaluateDualMomentum(params: {
  universeConfig: MomentumUniverseConfig;
  quotesMap: Record<string, DailyCandle[]>;
  currentHeldSymbol?: string;
  riskFreeRateAnnualized?: number;
}): DualMomentumSignal {
  const { universeConfig, quotesMap, currentHeldSymbol } = params;
  const riskFreeRate = params.riskFreeRateAnnualized ?? universeConfig.riskFreeRateAnnualized;

  const metrics: MomentumAssetMetric[] = [];

  for (const item of universeConfig.symbols) {
    const candles = quotesMap[item.symbol] || quotesMap[item.symbol.replace('.TW', '')] || [];
    const metric = calculateAssetMomentum(
      item.symbol,
      item.market,
      candles,
      riskFreeRate,
      item.name
    );
    metrics.push(metric);
  }

  // 依動能分數降序排序 (相對動能)
  metrics.sort((a, b) => b.momentumScore - a.momentumScore);
  metrics.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  const topAsset =
    metrics.length > 0
      ? metrics[0]
      : {
          symbol: 'N/A',
          market: 'US' as const,
          currentPrice: 0,
          returns3M: 0,
          returns6M: 0,
          returns12M: 0,
          momentumScore: 0,
          isAboveRiskFree: false,
          rank: 1,
        };

  // 絕對動能檢驗：第一名資產是否高於無風險利率
  const safeHavenTriggered = !topAsset.isAboveRiskFree;

  let action: MomentumAction;
  let actionHeadline: string;
  let actionAdvice: string;

  if (safeHavenTriggered) {
    action = 'MOVE_TO_CASH';
    actionHeadline = '【觸發避險・現金為王】';
    actionAdvice = `資產池內所有標的 12 個月報酬皆落後無風險基準 (${(riskFreeRate * 100).toFixed(1)}%)，市場處於系統性空頭或鈍化，建議保留現金或暫駐短債避風港防禦。`;
  } else if (currentHeldSymbol && currentHeldSymbol === topAsset.symbol) {
    action = 'HOLD_TOP';
    actionHeadline = '【動能領跑・續抱持有】';
    actionAdvice = `當前持有的 ${topAsset.name || topAsset.symbol} 為資產池動能冠軍（評分 ${topAsset.momentumScore.toFixed(1)}），趨勢穩固，建議維持原有部位續抱。`;
  } else {
    action = 'SWITCH_ASSET';
    actionHeadline = '【板塊輪動・切換冠軍】';
    actionAdvice = `動能冠軍已切換為 ${topAsset.name || topAsset.symbol}（評分 ${topAsset.momentumScore.toFixed(1)}，12M 回報 ${topAsset.returns12M}%），建議評估獲利了結弱勢標的，輪動配置至強勢領頭羊。`;
  }

  return {
    universeId: universeConfig.id,
    universeName: universeConfig.name,
    calculatedAt: new Date().toISOString().split('T')[0],
    topAsset,
    currentHeldSymbol,
    action,
    actionHeadline,
    actionAdvice,
    safeHavenTriggered,
    leaderboard: metrics,
  };
}
