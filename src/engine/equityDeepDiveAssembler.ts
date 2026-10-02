/**
 * 個股 7 步深度投研數據裝配器與跨市場適配 (Spec 0156 / Ticket 06, 07, 08)
 */

import { MarketType } from '../types/stock';
import {
  EquityDeepDiveInput,
  EquityDeepDiveStep1Data,
  EquityDeepDiveStep2Data,
  EquityDeepDiveStep3Data,
  EquityDeepDiveStep4Data,
  EquityDeepDiveStep5Data,
  EquityDeepDiveStep6Data,
} from '../types/equityDeepDive';

/**
 * Ticket 06: 行情與估值數據裝配
 */
export function assembleQuoteValuationData(
  candles: Array<{ close: number }> = [],
  quote?: { price?: number; pe?: number; pb?: number; dividendYield?: number },
  _market: MarketType = 'TW'
): { currentPrice: number; pe?: number; pb?: number; dividendYield?: number } {
  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const currentPrice = quote?.price ?? lastClose;

  return {
    currentPrice,
    pe: quote?.pe,
    pb: quote?.pb,
    dividendYield: quote?.dividendYield,
  };
}

/**
 * Ticket 07: 籌碼與箱體防線裝配
 */
export function assembleChipsAndBoxData(
  institutionalRecords: Array<{
    date: string;
    foreignShares: number;
    trustShares: number;
    dealerShares: number;
  }> = [],
  boxFloorPrice?: number,
  boxCeilingPrice?: number,
  market: MarketType = 'TW',
  _candles: Array<{ close: number; volume: number }> = []
): EquityDeepDiveStep6Data {
  if (market === 'US') {
    // Ticket 08: 美股替代籌碼分析
    return {
      symbol: '',
      name: '',
      market: 'US',
      boxFloorPrice,
      boxCeilingPrice,
      microstructureSummary: '美股量能分佈與近期價格動能（以 VWAP 與換手率為核心評估，無官方三大法人數據）',
    };
  }

  // 台股法人累加
  let foreignNet = 0;
  let trustNet = 0;
  let dealerNet = 0;

  for (const r of institutionalRecords) {
    foreignNet += r.foreignShares || 0;
    trustNet += r.trustShares || 0;
    dealerNet += r.dealerShares || 0;
  }

  const totalNet = foreignNet + trustNet + dealerNet;

  return {
    symbol: '',
    name: '',
    market: 'TW',
    foreignNetShares20D: foreignNet,
    trustNetShares20D: trustNet,
    dealerNetShares20D: dealerNet,
    totalNetShares20D: totalNet,
    boxFloorPrice,
    boxCeilingPrice,
  };
}

/**
 * Ticket 08: 全量數據聚合與雙市場適配
 */
export function assembleAllDeepDiveData(input: EquityDeepDiveInput): {
  step1: EquityDeepDiveStep1Data;
  step2: EquityDeepDiveStep2Data;
  step3: EquityDeepDiveStep3Data;
  step4: EquityDeepDiveStep4Data;
  step5: EquityDeepDiveStep5Data;
  step6: EquityDeepDiveStep6Data;
} {
  const { symbol, name, market, candles = [], quote, institutionalRecords = [], boxFloorPrice, boxCeilingPrice, statusTag = 'NORMAL' } = input;

  const quoteValuation = assembleQuoteValuationData(candles, quote, market);
  const chipsAndBox = assembleChipsAndBoxData(institutionalRecords, boxFloorPrice, boxCeilingPrice, market, candles);

  const step1: EquityDeepDiveStep1Data = {
    symbol,
    name,
    market,
  };

  const step2: EquityDeepDiveStep2Data = {
    symbol,
    name,
    pe: quoteValuation.pe,
    pb: quoteValuation.pb,
    dividendYield: quoteValuation.dividendYield,
  };

  const step3: EquityDeepDiveStep3Data = {
    symbol,
    name,
    market,
  };

  const step4: EquityDeepDiveStep4Data = {
    symbol,
    name,
    market,
    statusTag,
    volatilityText: market === 'US' ? '美股 Beta 與盤後高波動性警示' : undefined,
  };

  const step5: EquityDeepDiveStep5Data = {
    symbol,
    name,
    currentPrice: quoteValuation.currentPrice,
    currency: market === 'US' ? 'USD' : 'TWD',
  };

  const step6: EquityDeepDiveStep6Data = {
    ...chipsAndBox,
    symbol,
    name,
  };

  return {
    step1,
    step2,
    step3,
    step4,
    step5,
    step6,
  };
}
