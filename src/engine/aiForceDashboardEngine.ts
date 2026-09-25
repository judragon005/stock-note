import { MarketType } from '../types/stock';
import { AiForceDashboardReport } from '../types/aiForceDashboard';
import { calculateVolumeProfile } from './volumeProfileEngine';

export { calculateVolumeProfile };

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
        { name: '多頭突破區', biasLabel: '>+5%', percentage: 35, color: '#ef4444' },
        { name: '大量成交區', biasLabel: '+2~5%', percentage: 25, color: '#f59e0b' },
        { name: '主力成本區', biasLabel: '±2%', percentage: 25, color: '#3b82f6' },
        { name: '套牢區', biasLabel: '-2~-5%', percentage: 15, color: '#10b981' },
      ],
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
