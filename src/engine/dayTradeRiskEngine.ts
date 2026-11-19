import { DayTradeRiskData } from '../types/aiForceDashboard';

export interface CandleDayTradeInput {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DayTradeQuoteInput {
  turnoverRate?: number;
  dayTradeRatio?: number;
  marginBalance?: number;
  shortBalance?: number;
  dayTradeRate?: number;
  sblBalance?: number;
  marginBalanceChange?: number;
  market?: 'TW' | 'US';
  shortFloatRatio?: number; // 美股空單佔流通比 (%)
}

/**
 * 依據價格與量能特徵計算隔日沖 5 大風險量化指標 (含真實券資比、信用浮額與美股無漲跌幅/軋空評估)
 */
export function calculateDayTradeRisk(
  candles: CandleDayTradeInput[],
  quote?: DayTradeQuoteInput
): DayTradeRiskData {
  if (!candles || candles.length === 0) {
    return {
      abnormalSelling: 0,
      turnoverRate: 0,
      dayTradeRatio: 0,
      pullbackRisk: 0,
      intradayVolatility: 0,
      riskLevel: 'LOW',
      riskIndex: 0,
      marginBalance: quote?.marginBalance,
      shortBalance: quote?.shortBalance,
      shortMarginRatio:
        quote?.marginBalance && quote?.shortBalance && quote.marginBalance > 0
          ? Number(((quote.shortBalance / quote.marginBalance) * 100).toFixed(2))
          : undefined,
      dayTradeRate: quote?.dayTradeRate,
      sblBalance: quote?.sblBalance,
      marginBalanceChange: quote?.marginBalanceChange,
    };
  }

  const latest = candles[candles.length - 1];
  const count = candles.length;

  // 1. 計算近 20 根平均成交量
  let volSum = 0;
  candles.slice(-20).forEach((c) => {
    volSum += c.volume;
  });
  const avgVol = volSum / Math.min(20, count) || 1;
  const volSurgeRatio = latest.volume / avgVol;

  // 2. 主力賣出異常度 (Abnormal Selling)
  // 上影線與總震幅比
  const totalRange = Math.max(0.01, latest.high - latest.low);
  const upperShadow = Math.max(0, latest.high - Math.max(latest.open, latest.close));
  const shadowRatio = upperShadow / totalRange;

  // 若爆量且留長上影線，主力賣出異常度急劇升高
  let abnormalSelling = 35;
  if (shadowRatio > 0.4 && volSurgeRatio > 1.2) {
    abnormalSelling = Math.round(55 + shadowRatio * 30 + Math.min(15, (volSurgeRatio - 1.2) * 10));
  } else if (latest.close < latest.open && volSurgeRatio > 1.5) {
    abnormalSelling = Math.round(50 + (volSurgeRatio - 1.5) * 12);
  } else {
    abnormalSelling = Math.round(25 + shadowRatio * 25);
  }
  abnormalSelling = Math.max(10, Math.min(95, abnormalSelling));

  // 3. 籌碼換手率 (Turnover Rate)
  let turnoverRate = 50;
  if (quote?.turnoverRate !== undefined && quote.turnoverRate > 0) {
    turnoverRate = Math.round(Math.min(95, quote.turnoverRate * 8));
  } else {
    // 依量能突增比推估
    turnoverRate = Math.round(30 + Math.min(65, volSurgeRatio * 20));
  }
  turnoverRate = Math.max(10, Math.min(95, turnoverRate));

  // 4. 沖銷比例 (Day Trade Ratio)
  let dayTradeRatio = 53;
  if (quote?.dayTradeRate !== undefined && quote.dayTradeRate > 0) {
    dayTradeRatio = Math.round(Math.min(95, quote.dayTradeRate));
  } else if (quote?.dayTradeRatio !== undefined && quote.dayTradeRatio > 0) {
    dayTradeRatio = Math.round(Math.min(95, quote.dayTradeRatio));
  } else {
    const intradayAmp = (latest.high - latest.low) / (latest.close > 0 ? latest.close : 1);
    dayTradeRatio = Math.round(35 + Math.min(60, intradayAmp * 500 + volSurgeRatio * 10));
  }
  dayTradeRatio = Math.max(10, Math.min(95, dayTradeRatio));

  // 5. 隔日回檔/凹檔風險 (Pullback Risk)
  // 若衝高後回落幅度大，隔日開盤極易引發多殺多停損賣壓
  let pullbackRisk = 45;
  if (shadowRatio > 0.5) {
    pullbackRisk = Math.round(60 + shadowRatio * 30);
  } else if (latest.close > latest.open * 1.05) {
    // 當日長紅急拉，若無上影線但獲利了結賣壓大
    pullbackRisk = Math.round(45 + volSurgeRatio * 10);
  } else {
    pullbackRisk = Math.round(30 + shadowRatio * 20);
  }

  // 美股或高放空標的：納入 Short Float 軋空/急拉回檔風險評估 (Spec 0239)
  if (
    quote?.shortFloatRatio !== undefined &&
    Number.isFinite(quote.shortFloatRatio) &&
    quote.shortFloatRatio > 0
  ) {
    const squeezeBoost =
      quote.shortFloatRatio >= 20
        ? 25
        : quote.shortFloatRatio >= 10
        ? Math.round(10 + ((quote.shortFloatRatio - 10) / 10) * 15)
        : Math.round(quote.shortFloatRatio * 0.8);
    pullbackRisk += squeezeBoost;
    if (quote.shortFloatRatio >= 10) {
      abnormalSelling = Math.max(10, Math.min(95, abnormalSelling + Math.round(squeezeBoost * 0.4)));
    }
  }
  pullbackRisk = Math.max(10, Math.min(95, pullbackRisk));

  // 6. 日內波動率 (Intraday Volatility)
  const denom = latest.close > 0 ? latest.close : 1;
  const ampPct = (latest.high - latest.low) / denom;
  let intradayVolatility: number;
  if (quote?.market === 'US') {
    // 美股無漲跌幅限制：採自適應振幅刻度 (3%≈45, 6%≈75, 10%+才達95)
    const ampPercent = ampPct * 100;
    if (ampPercent <= 3) {
      intradayVolatility = Math.round(15 + (ampPercent / 3) * 30);
    } else if (ampPercent <= 6) {
      intradayVolatility = Math.round(45 + ((ampPercent - 3) / 3) * 30);
    } else if (ampPercent < 10) {
      intradayVolatility = Math.round(75 + ((ampPercent - 6) / 4) * 20);
    } else {
      intradayVolatility = 95;
    }
  } else {
    intradayVolatility = Math.round(ampPct * 1000);
  }
  intradayVolatility = Math.max(10, Math.min(95, intradayVolatility));

  // 7. 券資比計算 (Ticket 10)
  let shortMarginRatio: number | undefined = undefined;
  if (
    quote?.marginBalance !== undefined &&
    quote?.shortBalance !== undefined &&
    quote.marginBalance > 0
  ) {
    shortMarginRatio = Number(((quote.shortBalance / quote.marginBalance) * 100).toFixed(2));
  }

  // 8. 綜合風險等級 (Risk Level)
  const avgRisk =
    (abnormalSelling + turnoverRate + dayTradeRatio + pullbackRisk + intradayVolatility) / 5;

  let riskLevel: DayTradeRiskData['riskLevel'] = 'MEDIUM';
  if (avgRisk >= 60) {
    riskLevel = 'HIGH';
  } else if (avgRisk >= 40) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return {
    abnormalSelling,
    turnoverRate,
    dayTradeRatio,
    pullbackRisk,
    intradayVolatility,
    riskLevel,
    riskIndex: Math.round(avgRisk),
    marginBalance: quote?.marginBalance,
    shortBalance: quote?.shortBalance,
    shortMarginRatio,
    dayTradeRate: quote?.dayTradeRate ?? dayTradeRatio,
    sblBalance: quote?.sblBalance,
    marginBalanceChange: quote?.marginBalanceChange,
  };
}
