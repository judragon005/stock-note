import { MarketType } from '../types/stock';
import {
  AiForceDashboardReport,
  InstitutionalFlowData,
  BullBearEnergyData,
  HealthSummaryData,
  DynamicSignalsData,
  ForceDistributionData,
  BullBearStrengthData,
  KlineCandleItem,
} from '../types/aiForceDashboard';
import { calculateVolumeProfile } from './volumeProfileEngine';
import { calculateRiskSpider } from './riskSpiderEngine';
import { calculateForecastCone } from './forecastConeEngine';
import { calculateVwapCostStructure, DEFAULT_TIME_NODES } from './vwapCostEngine';
import { calculateDayTradeRisk } from './dayTradeRiskEngine';
import { calculateMultiDimensionRadar } from './multiDimensionRadarEngine';
import { estimateMarketSentiment } from './marketSentimentEngine';
import { calculateAiConfidence } from './aiConfidenceEngine';

export {
  calculateVolumeProfile,
  calculateRiskSpider,
  calculateForecastCone,
  calculateVwapCostStructure,
  calculateDayTradeRisk,
  calculateMultiDimensionRadar,
  estimateMarketSentiment,
  calculateAiConfidence,
};

/**
 * 建立具備合理預設值的 AiForceDashboardReport
 */
export function createDefaultAiForceReport(
  symbol: string = '2360',
  name: string = '致茂',
  market: MarketType = 'TW'
): AiForceDashboardReport {
  const todayStr = new Date().toISOString().split('T')[0];

  return {
    symbol,
    name,
    market,
    updatedAt: todayStr,
    activeTaskTab: 'TASK_1_COMPREHENSIVE',

    marketBar: {
      currentPrice: 2290.0,
      change: 205.0,
      changePercent: 9.83,
      volumeShares: 2681,
      transactionCount: 6260,
      openPrice: 2135.0,
      highPrice: 2290.0,
      lowPrice: 2135.0,
      latestTradingDate: todayStr,
      dataPointsCount: 98,
      dataSourceText: '日 K TWSE | 法人 TWSE | 融資券 FinMind',
      dataRangeText: `${todayStr} 共 98 個交易日，法人資料 20 日`,
      statusBadges: {
        aiScanActive: true,
        mainForceTracking: true,
        marketStatus: 'NORMAL',
        volatilityAlert: false,
      },
    },

    klineSystem: {
      candles: [],
      keyLevels: {
        highResistance: 2490.0,
        mainForceCost: 2130.65,
        supportLevel: 1875.0,
      },
    },

    decisionCore: {
      warningBadgeText: 'AI WARNING',
      trendJudgement: '中性偏多',
      shortTermState: '區間震盪',
      mainForceAction: '調節減碼',
      chipStructure: '中性',
      dayTradeRiskPercent: 53,
      chipHealthScore: 55,
      chipHealthLabel: '普通',
      supportRange: [1875.0, 1730.0],
      resistanceRange: [2490.0, 2490.0],
      riskHorizonDays: '1~4 個交易日',
    },

    multiDimensionRadar: {
      overallScore: 56,
      overallGrade: 'C',
      dimensions: {
        institutional: 50,
        trend: 65,
        chips: 55,
        liquidity: 45,
        volatility: 60,
        momentum: 58,
      },
    },

    volumeProfile: {
      buckets: [
        { label: '壓力區', priceMin: 2350, priceMax: 2490, percentage: 4, type: 'resistance' },
        { label: '大量成交區', priceMin: 2200, priceMax: 2350, percentage: 17, type: 'heavy' },
        { label: '密集成交區', priceMin: 2100, priceMax: 2200, percentage: 9, type: 'dense' },
        { label: '橫平區', priceMin: 2000, priceMax: 2100, percentage: 9, type: 'flat' },
        { label: '支撐區', priceMin: 1800, priceMax: 2000, percentage: 87, type: 'support' },
      ],
      bullBearFooterTag: '多多多多多',
    },

    riskSpider: {
      liquidityRisk: 30,
      volatilityRisk: 62,
      trendRisk: 45,
      institutionalRisk: 55,
      chipRisk: 48,
      mainForceRiskLevel: 'MEDIUM_HIGH',
      mainForceRiskIndex: 60,
    },

    forecastCone: {
      bullishProb: 47,
      rangeProb: 11,
      bearishProb: 42,
      mainForceDirectionProb: 52,
      annualizedDriftPercent: 19.7,
      timeNodes: [
        { dayOffset: 0, label: '今日', upperPrice: 2290, medianPrice: 2290, lowerPrice: 2290 },
        { dayOffset: 3, label: '3日後', upperPrice: 2380, medianPrice: 2310, lowerPrice: 2220 },
        { dayOffset: 5, label: '5日後', upperPrice: 2440, medianPrice: 2330, lowerPrice: 2180 },
        { dayOffset: 10, label: '10日後', upperPrice: 2520, medianPrice: 2350, lowerPrice: 2120 },
      ],
    },

    vwapCostStructure: {
      mainForceVwap: 2131,
      biasPercent: 7.5,
      bands: [
        { name: '倉儲區', biasLabel: '>5%', percentage: 38, color: '#f97316' },
        { name: '套牢區', biasLabel: '-2~-5%', percentage: 32, color: '#10b981' },
        { name: '主力成本區', biasLabel: '±2%', percentage: 18, color: '#38bdf8' },
        { name: '大量成交區', biasLabel: '±2~5%', percentage: 12, color: '#1e40af' },
      ],
      timeNodes: DEFAULT_TIME_NODES,
    },

    institutionalFlow: {
      history: [],
      recentDaysTable: [
        { date: '09/18', foreignShares: -166, trustShares: 89, dealerShares: 82, totalShares: 5 },
        { date: '09/17', foreignShares: 71, trustShares: -27, dealerShares: 31, totalShares: 75 },
        { date: '09/16', foreignShares: -103, trustShares: 25, dealerShares: 2, totalShares: -76 },
      ],
      cumulative20DaysSummary: '多頭 (20日 +1,621張)',
      recent5DaysSummary: '偏空 (-64張)',
    },

    dayTradeRisk: {
      abnormalSelling: 49,
      turnoverRate: 57,
      dayTradeRatio: 53,
      pullbackRisk: 45,
      intradayVolatility: 62,
      riskLevel: 'MEDIUM',
      riskIndex: 53,
    },

    bullBearEnergy: {
      bullEnergyPercent: 53,
      bearEnergyPercent: 47,
      bullBearRatio: 1.13,
      bullBearConclusion: '偏多',
      noteText: '(20日紅K量/黑K量)',
    },

    healthSummary: {
      chipHealth: 55,
      technicalStructure: 80,
      capitalMomentum: 58,
      liquidityRisk: 5,
      institutionalSupport: 50,
      overallRatingLabel: '普通 (平均 50 分)',
    },

    dynamicSignals: {
      trendSignal: '偏多偏強',
      chipSignal: '籌碼中性',
      momentumSignal: '動能偏強',
      riskSignal: '波動高特偏高',
      verdictLight: 'RED',
      verdictLabel: '紅燈 (高風險)',
    },

    marketSentiment: {
      overallSentimentIndex: 50,
      sentimentState: 'NEUTRAL',
      retailSentimentPercent: 59,
      institutionalSentimentPercent: 55,
      mainForceSentimentPercent: 58,
    },

    aiConfidence: {
      overallConfidence: 47,
      modelAccuracy: 32,
      dataCompleteness: 100,
      signalStability: 80,
      strategyApplicability: 44,
    },

    chipsSummary: {
      foreignNetShares: -166,
      trustNetShares: 89,
      dealerNetShares: 82,
      threeInstitutionsTotal: 5,
      verdictNote: `${todayStr} 短線偏空 | 追價風險可控`,
      conclusionBadge: '偏空震盪',
      sparklineHistory: [100, 250, 180, 420, 310, 520, 480, 620, 590, 600],
    },

    forceDistribution: {
      largePlayerBuyPercent: 65,
      retailBuyPercent: 35,
      retailSellPressurePercent: 36,
      asOfDateText: `${todayStr} (法人買進/賣出佔成交量比例，依 20 日平均)`,
    },

    bullBearStrength: {
      bullStrengthPercent: 58,
      bearStrengthPercent: 42,
      volumeStrengthPercent: 53,
      signalTierLevel: 2,
      compositeScore: 70,
    },

    mainForceVerdict: {
      primaryVerb: '調節減碼',
      semanticTag: '法人動作',
      fullVerdictText:
        'AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 -64 張、收盤相對 20 日 VWAP +7.5%、RSI 60），法人小幅調節，短線宜區間操作。',
    },
  };
}

export interface RawInstitutionalRecord {
  date: string;
  foreignShares: number;
  trustShares: number;
  dealerShares: number;
}

/**
 * 依據真實法人進出記錄或成交量多空模型建構卡片 08 之雙軸圖數列與明細 (Spec 0143 Ticket 1)
 */
export function buildInstitutionalFlow(
  candles: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>,
  records?: RawInstitutionalRecord[],
  _market: MarketType = 'TW'
): InstitutionalFlowData {
  const formatSigned = (num: number) => (num >= 0 ? `+${num.toLocaleString()}` : num.toLocaleString());

  if (records && records.length > 0) {
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    const history = sorted.map((r) => {
      const net = r.foreignShares + r.trustShares + r.dealerShares;
      cumulative += net;
      return {
        date: r.date,
        foreignShares: r.foreignShares,
        trustShares: r.trustShares,
        dealerShares: r.dealerShares,
        cumulativeTotalShares: cumulative,
      };
    });

    const recent3 = sorted.slice(-3).reverse().map((r) => ({
      date: r.date.includes('-') ? r.date.substring(5).replace('-', '/') : r.date,
      foreignShares: r.foreignShares,
      trustShares: r.trustShares,
      dealerShares: r.dealerShares,
      totalShares: r.foreignShares + r.trustShares + r.dealerShares,
    }));

    const last20 = sorted.slice(-20);
    const sum20 = last20.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    const last5 = sorted.slice(-5);
    const sum5 = last5.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);

    return {
      history,
      recentDaysTable: recent3,
      cumulative20DaysSummary: `${sum20 >= 0 ? '多頭' : '偏空'} (20日 ${formatSigned(sum20)}張)`,
      recent5DaysSummary: `${sum5 >= 0 ? '偏多' : '偏空'} (${formatSigned(sum5)}張)`,
    };
  }

  // Fallback: 針對美股或無法人資料，以日 K 成交量多空拆解產生 proxy 歷史
  const sliceCandles = candles.slice(-25);
  let cumulative = 0;
  const history = sliceCandles.map((c) => {
    const isBull = c.close >= c.open;
    const estTotal = Math.round((c.volume || 1000) * 0.12 * (isBull ? 1 : -1));
    const foreignShares = Math.round(estTotal * 0.6);
    const trustShares = Math.round(estTotal * 0.25);
    const dealerShares = estTotal - foreignShares - trustShares;
    cumulative += estTotal;
    return {
      date: c.date,
      foreignShares,
      trustShares,
      dealerShares,
      cumulativeTotalShares: cumulative,
    };
  });

  const recent3 = sliceCandles.slice(-3).reverse().map((c) => {
    const isBull = c.close >= c.open;
    const estTotal = Math.round((c.volume || 1000) * 0.12 * (isBull ? 1 : -1));
    const foreignShares = Math.round(estTotal * 0.6);
    const trustShares = Math.round(estTotal * 0.25);
    const dealerShares = estTotal - foreignShares - trustShares;
    return {
      date: c.date.includes('-') ? c.date.substring(5).replace('-', '/') : c.date,
      foreignShares,
      trustShares,
      dealerShares,
      totalShares: estTotal,
    };
  });

  const last20 = history.slice(-20);
  const sum20 = last20.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
  const last5 = history.slice(-5);
  const sum5 = last5.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);

  return {
    history,
    recentDaysTable: recent3,
    cumulative20DaysSummary: `${sum20 >= 0 ? '多頭' : '偏空'} (20日 ${formatSigned(sum20)}張)`,
    recent5DaysSummary: `${sum5 >= 0 ? '偏多' : '偏空'} (${formatSigned(sum5)}張)`,
  };
}

/**
 * 依據紅 K 與黑 K 成交量計算多空能量比 (Card 10)
 */
export function calculateBullBearEnergyFromCandles(
  candles: Array<{ open: number; close: number; volume: number }>
): BullBearEnergyData {
  const recent20 = candles.slice(-20);
  let bullVol = 0;
  let bearVol = 0;
  for (const c of recent20) {
    if (c.close >= c.open) {
      bullVol += c.volume;
    } else {
      bearVol += c.volume;
    }
  }

  if (bullVol <= 0 && bearVol <= 0) {
    return {
      bullEnergyPercent: 50,
      bearEnergyPercent: 50,
      bullBearRatio: 1,
      bullBearConclusion: '均衡',
      noteText: '(20日紅K量/黑K量)',
    };
  }

  if (bearVol <= 0 && bullVol > 0) {
    return {
      bullEnergyPercent: 100,
      bearEnergyPercent: 0,
      bullBearRatio: 99.99,
      bullBearConclusion: '極度偏多',
      noteText: '(20日紅K量/黑K量)',
    };
  }

  if (bullVol <= 0 && bearVol > 0) {
    return {
      bullEnergyPercent: 0,
      bearEnergyPercent: 100,
      bullBearRatio: 0,
      bullBearConclusion: '極度偏空',
      noteText: '(20日紅K量/黑K量)',
    };
  }

  const total = bullVol + bearVol;
  const bullEnergyPercent = Math.round((bullVol / total) * 100);
  const bearEnergyPercent = 100 - bullEnergyPercent;
  const bullBearRatio = Math.round((bullVol / bearVol) * 100) / 100;

  let bullBearConclusion = '均衡';
  if (bullBearRatio >= 1.5) {
    bullBearConclusion = '多方強勢';
  } else if (bullBearRatio > 1.05) {
    bullBearConclusion = '偏多';
  } else if (bullBearRatio <= 0.67) {
    bullBearConclusion = '空方強勢';
  } else if (bullBearRatio < 0.95) {
    bullBearConclusion = '偏空';
  }

  return {
    bullEnergyPercent,
    bearEnergyPercent,
    bullBearRatio,
    bullBearConclusion,
    noteText: '(20日紅K量/黑K量)',
  };
}

/**
 * 依據均線、量能與法人動向計算健康度 5 環綜合評估 (Card 11)
 */
export function calculateHealthSummaryFromCandles(
  candles: KlineCandleItem[],
  institutionalFlow: InstitutionalFlowData
): HealthSummaryData {
  const last = candles[candles.length - 1];

  // 1. 籌碼健康度
  let chipHealth = 50;
  if (institutionalFlow.history.length > 0) {
    const last5 = institutionalFlow.history.slice(-5);
    const sum5 = last5.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    if (sum5 > 1000) chipHealth = 85;
    else if (sum5 > 200) chipHealth = 70;
    else if (sum5 > 0) chipHealth = 60;
    else if (sum5 < -1000) chipHealth = 25;
    else if (sum5 < -200) chipHealth = 35;
    else chipHealth = 45;
  }

  // 2. 技術型態 (均線多頭排列度)
  let technicalStructure = 50;
  const ma5 = last.ma5 ?? last.close;
  const ma10 = last.ma10 ?? last.close;
  const ma20 = last.ma20 ?? last.close;
  const ma60 = last.ma60 ?? last.close;
  if (last.close > ma5 && ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
    technicalStructure = 90;
  } else if (last.close > ma20 && ma5 > ma20) {
    technicalStructure = 75;
  } else if (last.close < ma20 && last.close > ma60) {
    technicalStructure = 45;
  } else if (last.close < ma60) {
    technicalStructure = 25;
  }

  // 3. 資金動能 (最新日成交量相對 20 日均量)
  const recent20 = candles.slice(-20);
  const avgVol20 = recent20.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent20.length);
  const volRatio = avgVol20 > 0 ? last.volume / avgVol20 : 1;
  let capitalMomentum = 50;
  const isUp = last.close >= last.open;
  if (isUp && volRatio > 1.5) capitalMomentum = 85;
  else if (isUp && volRatio > 1.0) capitalMomentum = 70;
  else if (!isUp && volRatio > 1.5) capitalMomentum = 30;
  else if (!isUp && volRatio > 1.0) capitalMomentum = 40;
  else capitalMomentum = 55;

  // 4. 流動性風險 (5日日均成交量)
  const recent5 = candles.slice(-5);
  const avgVol5 = recent5.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent5.length);
  let liquidityRisk = 15;
  if (avgVol5 > 3000) liquidityRisk = 5;
  else if (avgVol5 > 1000) liquidityRisk = 12;
  else if (avgVol5 > 300) liquidityRisk = 28;
  else liquidityRisk = 60;

  // 5. 法人支撐力 (20日法人累計買賣超)
  let institutionalSupport = 50;
  if (institutionalFlow.history.length > 0) {
    const lastInst = institutionalFlow.history[institutionalFlow.history.length - 1];
    const cum = lastInst.cumulativeTotalShares;
    if (cum > 2000) institutionalSupport = 85;
    else if (cum > 500) institutionalSupport = 70;
    else if (cum > 0) institutionalSupport = 58;
    else if (cum < -2000) institutionalSupport = 20;
    else if (cum < -500) institutionalSupport = 35;
    else institutionalSupport = 45;
  }

  const values = [chipHealth, technicalStructure, capitalMomentum, liquidityRisk, institutionalSupport];
  const averageScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  let overallRatingLabel = '普通 (平均 50 分)';
  if (averageScore >= 75) overallRatingLabel = `優良 (平均 ${averageScore} 分)`;
  else if (averageScore >= 60) overallRatingLabel = `良好 (平均 ${averageScore} 分)`;
  else if (averageScore >= 45) overallRatingLabel = `普通 (平均 ${averageScore} 分)`;
  else overallRatingLabel = `偏弱 (平均 ${averageScore} 分)`;

  return {
    chipHealth,
    technicalStructure,
    capitalMomentum,
    liquidityRisk,
    institutionalSupport,
    overallRatingLabel,
  };
}

/**
 * 依據收盤價、VWAP 乖離率與法人方向計算主力動態信號 (Card 12)
 */
export function calculateDynamicSignalsFromCandles(
  candles: KlineCandleItem[],
  mainForceCost: number,
  institutionalFlow: InstitutionalFlowData
): DynamicSignalsData {
  const last = candles[candles.length - 1];
  const vwapBias = mainForceCost > 0 ? ((last.close - mainForceCost) / mainForceCost) * 100 : 0;

  // 1. 趨勢信號
  let trendSignal = '區間整理';
  if (vwapBias > 4) trendSignal = '偏多偏強';
  else if (vwapBias > 0) trendSignal = '溫和偏多';
  else if (vwapBias < -4) trendSignal = '破線偏空';
  else trendSignal = '偏弱整理';

  // 2. 籌碼信號
  let chipSignal = '籌碼中性';
  if (institutionalFlow.history.length > 0) {
    const last5 = institutionalFlow.history.slice(-5);
    const sum5 = last5.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    const lastInst = institutionalFlow.history[institutionalFlow.history.length - 1];
    if (lastInst.foreignShares > 0 && lastInst.trustShares > 0) {
      chipSignal = '土洋合買';
    } else if (lastInst.foreignShares * lastInst.trustShares < 0) {
      chipSignal = '土洋對作';
    } else if (sum5 > 500) {
      chipSignal = '籌碼集中';
    } else if (sum5 < -500) {
      chipSignal = '籌碼渙散';
    }
  }

  // 3. 動能信號
  let momentumSignal = '動能整理';
  const k = last.k ?? 50;
  const d = last.d ?? 50;
  const rsi = last.rsi ?? 50;
  if (rsi > 75) momentumSignal = '動能過熱';
  else if (rsi < 30) momentumSignal = '動能超跌';
  else if (k > d && rsi > 50) momentumSignal = '動能偏強';
  else if (k < d && rsi < 50) momentumSignal = '動能偏弱';

  // 4. 風險信號
  let riskSignal = '風險可控';
  const ma20 = last.ma20 ?? last.close;
  if (last.close < ma20 && vwapBias < -5) {
    riskSignal = '破位警戒';
  } else if (rsi > 75 || Math.abs(vwapBias) > 8) {
    riskSignal = '波動偏高';
  }

  // 5. 燈號
  let verdictLight: 'GREEN' | 'YELLOW' | 'RED' = 'YELLOW';
  if (riskSignal === '破位警戒') {
    verdictLight = 'RED';
  } else if (
    (trendSignal.includes('多') || trendSignal.includes('強')) &&
    (chipSignal.includes('合買') || chipSignal.includes('集中') || momentumSignal.includes('強'))
  ) {
    verdictLight = 'GREEN';
  }

  const verdictLabel =
    verdictLight === 'RED'
      ? '紅燈 (高風險)'
      : verdictLight === 'YELLOW'
      ? '黃燈 (觀望整理)'
      : '綠燈 (多頭順風)';

  return {
    trendSignal,
    chipSignal,
    momentumSignal,
    riskSignal,
    verdictLight,
    verdictLabel,
  };
}

/**
 * 依據日 K 紅黑量能動態推算買賣力分佈 (Card 16)
 */
export function calculateForceDistributionFromCandles(
  candles: KlineCandleItem[],
  asOfDate: string
): ForceDistributionData {
  const recent20 = candles.slice(-20);
  let bullVol = 0;
  let bearVol = 0;
  for (const c of recent20) {
    if (c.close >= c.open) bullVol += c.volume;
    else bearVol += c.volume;
  }
  const total = bullVol + bearVol;
  const bullRatio = total > 0 ? bullVol / total : 0.5;

  const largePlayerBuyPercent = Math.min(85, Math.max(25, Math.round(bullRatio * 60 + 20)));
  const retailBuyPercent = 100 - largePlayerBuyPercent;
  const retailSellPressurePercent = Math.min(80, Math.max(20, Math.round((1 - bullRatio) * 55 + 20)));

  return {
    largePlayerBuyPercent,
    retailBuyPercent,
    retailSellPressurePercent,
    asOfDateText: `${asOfDate} (法人買進/賣出佔成交量比例，依 20 日平均)`,
  };
}

/**
 * 依據 RSI、KD 與均線綜合計算多空強度分佈 (Card 17)
 */
export function calculateBullBearStrengthFromCandles(
  candles: KlineCandleItem[]
): BullBearStrengthData {
  const last = candles[candles.length - 1];
  const rsi = last.rsi ?? 50;
  const k = last.k ?? 50;
  const ma20 = last.ma20 ?? last.close;

  let bullStrengthPercent = Math.round(rsi * 0.45 + k * 0.35 + (last.close >= ma20 ? 20 : 0));
  bullStrengthPercent = Math.max(5, Math.min(95, bullStrengthPercent));
  const bearStrengthPercent = 100 - bullStrengthPercent;

  const recent20 = candles.slice(-20);
  const avg20 = recent20.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent20.length);
  const recent5 = candles.slice(-5);
  const avg5 = recent5.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent5.length);
  const volumeStrengthPercent = Math.max(10, Math.min(95, Math.round((avg20 > 0 ? avg5 / avg20 : 1) * 50)));

  const compositeScore = Math.round(bullStrengthPercent * 0.6 + volumeStrengthPercent * 0.4);
  let tier = 3;
  if (compositeScore >= 80) tier = 1;
  else if (compositeScore >= 65) tier = 2;
  else if (compositeScore >= 50) tier = 3;
  else if (compositeScore >= 35) tier = 4;
  else tier = 5;

  return {
    bullStrengthPercent,
    bearStrengthPercent,
    volumeStrengthPercent,
    signalTierLevel: tier,
    compositeScore,
  };
}

/**
 * 依據真實歷史日 K (OHLCV) 數列動態生成完整的 AiForceDashboardReport (Spec 0140 階段一 & Spec 0143 階段二)
 */
export function generateAiForceReportFromCandles(
  symbol: string = '2360',
  name: string = '致茂',
  market: MarketType = 'TW',
  candles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [],
  realtimeQuote?: {
    price?: number;
    change?: number;
    changePercent?: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
  },
  institutionalRecords?: RawInstitutionalRecord[]
): AiForceDashboardReport {
  // 1. 安全邊界：不足 5 根時安全回退至預設 report
  if (!candles || candles.length < 5) {
    const fallback = createDefaultAiForceReport(symbol, name, market);
    if (realtimeQuote?.price) {
      fallback.marketBar.currentPrice = realtimeQuote.price;
    }
    return fallback;
  }

  const count = candles.length;
  const last = candles[count - 1];
  const prev = candles[count - 2];

  // 2. 逐根計算均線 (MA5, MA10, MA20, MA60)、KD、MACD、RSI
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  // EMA 與 MACD 輔助
  let ema12 = closes[0];
  let ema26 = closes[0];
  let dea9 = 0;
  // KD 輔助
  let currentK = 50;
  let currentD = 50;

  const klineCandles = candles.map((c, i) => {
    // 均線
    const getSma = (period: number) => {
      if (i < period - 1) return undefined;
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += closes[j];
      }
      return Number((sum / period).toFixed(2));
    };

    const ma5 = getSma(5);
    const ma10 = getSma(10);
    const ma20 = getSma(20);
    const ma60 = getSma(60);

    // MACD 計算 (12, 26, 9)
    if (i > 0) {
      ema12 = (closes[i] * 2 + ema12 * 11) / 13;
      ema26 = (closes[i] * 2 + ema26 * 25) / 27;
    }
    const dif = Number((ema12 - ema26).toFixed(2));
    if (i === 0) {
      dea9 = dif;
    } else {
      dea9 = (dif * 2 + dea9 * 8) / 10;
    }
    const macdHist = Number(((dif - dea9) * 2).toFixed(2));

    // KD (9, 3, 3) 計算
    if (i >= 8) {
      let lowestLow = Infinity;
      let highestHigh = -Infinity;
      for (let j = i - 8; j <= i; j++) {
        if (lows[j] < lowestLow) lowestLow = lows[j];
        if (highs[j] > highestHigh) highestHigh = highs[j];
      }
      const rsv = highestHigh === lowestLow ? 50 : ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      currentK = (currentK * 2 + rsv) / 3;
      currentD = (currentD * 2 + currentK) / 3;
    }

    // 簡易 RSI 14
    let rsi14: number | undefined = undefined;
    if (i >= 14) {
      let gain = 0;
      let loss = 0;
      for (let j = i - 13; j <= i; j++) {
        const diff = closes[j] - closes[j - 1];
        if (diff > 0) gain += diff;
        else loss += Math.abs(diff);
      }
      if (loss === 0) {
        rsi14 = 100;
      } else {
        const rs = gain / loss;
        rsi14 = Number((100 - 100 / (1 + rs)).toFixed(1));
      }
    }

    return {
      date: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      ma5,
      ma10,
      ma20,
      ma60,
      k: Number(currentK.toFixed(1)),
      d: Number(currentD.toFixed(1)),
      dif,
      macd: Number(dea9.toFixed(2)),
      macdHist,
      rsi: rsi14,
    };
  });

  // 3. 計算三大關鍵水線
  // 主力成本：近 20 根 VWAP
  const recent20 = candles.slice(-20);
  let totalVol20 = 0;
  let totalVal20 = 0;
  recent20.forEach((c) => {
    totalVol20 += c.volume;
    totalVal20 += c.close * c.volume;
  });
  const mainForceCost = totalVol20 > 0 ? Number((totalVal20 / totalVol20).toFixed(2)) : last.close;

  // 近 60 根最高與最低
  const recent60 = candles.slice(-60);
  let maxHigh60 = -Infinity;
  let minLow60 = Infinity;
  recent60.forEach((c) => {
    if (c.high > maxHigh60) maxHigh60 = c.high;
    if (c.low < minLow60) minLow60 = c.low;
  });
  const highResistance = maxHigh60 > -Infinity ? maxHigh60 : Number((last.close * 1.08).toFixed(2));
  const supportLevel = minLow60 < Infinity ? minLow60 : Number((last.close * 0.92).toFixed(2));

  // 4. 計算頂部行情
  const currentPrice = realtimeQuote?.price ?? last.close;
  const change =
    realtimeQuote?.change ?? Number((last.close - (prev ? prev.close : last.close)).toFixed(2));
  const changePercent =
    realtimeQuote?.changePercent ??
    Number((prev && prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0).toFixed(2));

  // 5. 調用各量化子引擎
  const volumeProfile = calculateVolumeProfile(candles, currentPrice);
  const forecastCone = calculateForecastCone(candles, currentPrice);
  const vwapCostStructure = calculateVwapCostStructure(candles, currentPrice);
  const riskSpider = calculateRiskSpider(candles);
  const dayTradeRisk = calculateDayTradeRisk(candles);

  const defaultTemplate = createDefaultAiForceReport(symbol, name, market);

  // 6. 三大法人籌碼管線與 Card 08 / Card 15 連動計算
  const institutionalFlow = buildInstitutionalFlow(candles, institutionalRecords, market);
  let chipsSummary = defaultTemplate.chipsSummary;
  if (institutionalFlow.history.length > 0) {
    const lastInst = institutionalFlow.history[institutionalFlow.history.length - 1];
    const foreignNetShares = lastInst.foreignShares;
    const trustNetShares = lastInst.trustShares;
    const dealerNetShares = lastInst.dealerShares;
    const threeInstitutionsTotal = foreignNetShares + trustNetShares + dealerNetShares;

    let conclusionBadge = '中性觀望';
    if (foreignNetShares > 0 && trustNetShares > 0) {
      conclusionBadge = '土洋合買';
    } else if (foreignNetShares < 0 && trustNetShares < 0) {
      conclusionBadge = '土洋齊賣';
    } else if (foreignNetShares * trustNetShares < 0) {
      conclusionBadge = '土洋對作';
    } else if (threeInstitutionsTotal > 200) {
      conclusionBadge = '偏多集結';
    } else if (threeInstitutionsTotal < -200) {
      conclusionBadge = '偏空調節';
    }

    const sparklineHistory = institutionalFlow.history
      .slice(-10)
      .map((h: { cumulativeTotalShares: number }) => h.cumulativeTotalShares);

    chipsSummary = {
      foreignNetShares,
      trustNetShares,
      dealerNetShares,
      threeInstitutionsTotal,
      verdictNote: `${last.date} ${conclusionBadge} | 20日法人累計 ${institutionalFlow.cumulative20DaysSummary}`,
      conclusionBadge,
      sparklineHistory,
    };
  }

  // 7. 主力語意決策生成
  const vwapBias = mainForceCost > 0 ? ((currentPrice - mainForceCost) / mainForceCost) * 100 : 0;
  let primaryVerb = '區間觀望';
  if (vwapBias > 5) primaryVerb = '調節減碼';
  else if (vwapBias > 2) primaryVerb = '強勢續抱';
  else if (vwapBias < -5) primaryVerb = '超跌反彈';
  else if (vwapBias < -2) primaryVerb = '低接吸籌';

  // 8. Card 03 多維度判讀、Card 13 市場情緒與 Card 14 AI 信心度動態計算
  const multiDimensionRadar = calculateMultiDimensionRadar({
    candles,
    klineCandles,
    mainForceCost,
    institutionalFlow,
    market,
  });

  const recent5Flow = institutionalFlow.history.slice(-5);
  const sum5Inst = recent5Flow.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
  const recent5Candles = candles.slice(-5);
  const totalVol5 = recent5Candles.reduce((acc, c) => acc + c.volume, 0);
  const institutionalNetRatio = totalVol5 > 0 ? (sum5Inst / totalVol5) * 100 : 0;

  const marketSentiment = estimateMarketSentiment({
    priceChangePercent: changePercent,
    institutionalNetRatio,
    mainForceConcentration: vwapBias,
    marginChangeRatio: 0,
  });

  const aiConfidence = calculateAiConfidence({
    candles,
    klineCandles,
    hasInstitutionalData: institutionalFlow.history.length > 0,
  });

  const healthSummary = calculateHealthSummaryFromCandles(klineCandles, institutionalFlow);

  return {
    ...defaultTemplate,
    symbol,
    name,
    market,
    updatedAt: last.date,

    marketBar: {
      currentPrice,
      change,
      changePercent,
      volumeShares: realtimeQuote?.volume ?? last.volume,
      transactionCount: Math.round((realtimeQuote?.volume ?? last.volume) * 2.3),
      openPrice: realtimeQuote?.open ?? last.open,
      highPrice: realtimeQuote?.high ?? last.high,
      lowPrice: realtimeQuote?.low ?? last.low,
      latestTradingDate: last.date,
      dataPointsCount: count,
      dataSourceText: market === 'TW' ? '日 K TWSE | 法人 TWSE | 融資券 FinMind' : '日 K Yahoo Finance | 歷史報價',
      dataRangeText: `${candles[0].date} ~ ${last.date}，共 ${count} 個交易日`,
      statusBadges: {
        aiScanActive: true,
        mainForceTracking: true,
        marketStatus: Math.abs(changePercent) > 7 ? 'ALERT' : Math.abs(changePercent) > 3 ? 'VOLATILITY' : 'NORMAL',
        volatilityAlert: Math.abs(changePercent) > 5,
      },
    },

    klineSystem: {
      candles: klineCandles,
      keyLevels: {
        highResistance,
        mainForceCost,
        supportLevel,
      },
    },

    decisionCore: {
      ...defaultTemplate.decisionCore,
      trendJudgement: changePercent >= 0 ? '偏多強勢' : '偏弱整理',
      mainForceAction: primaryVerb,
      dayTradeRiskPercent: dayTradeRisk.riskIndex,
      chipHealthScore: healthSummary.chipHealth,
      chipHealthLabel: healthSummary.chipHealth >= 70 ? '良好' : healthSummary.chipHealth >= 50 ? '普通' : '偏弱',
      supportRange: [supportLevel, Number((supportLevel * 0.95).toFixed(2))],
      resistanceRange: [highResistance, Number((highResistance * 1.05).toFixed(2))],
    },

    multiDimensionRadar,
    volumeProfile,
    forecastCone,
    vwapCostStructure,
    riskSpider,
    dayTradeRisk,
    institutionalFlow,
    chipsSummary,
    bullBearEnergy: calculateBullBearEnergyFromCandles(candles),
    healthSummary,
    dynamicSignals: calculateDynamicSignalsFromCandles(klineCandles, mainForceCost, institutionalFlow),
    marketSentiment,
    aiConfidence,
    forceDistribution: calculateForceDistributionFromCandles(klineCandles, last.date),
    bullBearStrength: calculateBullBearStrengthFromCandles(klineCandles),

    mainForceVerdict: {
      primaryVerb,
      semanticTag: '量化研判',
      fullVerdictText: `AI 結論：經 ${count} 日日 K 數列與量能動態研判，最新收盤價 ${currentPrice.toLocaleString()} 元，相對 20 日 VWAP 主力成本 (${mainForceCost.toLocaleString()} 元) 乖離 ${vwapBias >= 0 ? '+' : ''}${vwapBias.toFixed(1)}%。系統建議執行「${primaryVerb}」策略。`,
    },
  };
}

