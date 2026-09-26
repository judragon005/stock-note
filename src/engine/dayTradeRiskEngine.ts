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
}

/**
 * 依據價格與量能特徵計算隔日沖 5 大風險量化指標
 */
export function calculateDayTradeRisk(
  candles: CandleDayTradeInput[],
  quote?: DayTradeQuoteInput
): DayTradeRiskData {
  if (!candles || candles.length === 0) {
    return {
      abnormalSelling: 49,
      turnoverRate: 57,
      dayTradeRatio: 53,
      pullbackRisk: 45,
      intradayVolatility: 62,
      riskLevel: 'MEDIUM',
      riskIndex: 53,
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
  if (quote?.dayTradeRatio !== undefined && quote.dayTradeRatio > 0) {
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
  pullbackRisk = Math.max(10, Math.min(95, pullbackRisk));

  // 6. 日內波動率 (Intraday Volatility)
  const denom = latest.close > 0 ? latest.close : 1;
  const ampPct = (latest.high - latest.low) / denom;
  let intradayVolatility = Math.round(ampPct * 1000);
  intradayVolatility = Math.max(10, Math.min(95, intradayVolatility));

  // 7. 綜合風險等級 (Risk Level)
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
  };
}
