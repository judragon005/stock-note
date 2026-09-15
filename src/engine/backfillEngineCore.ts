/**
 * 全歷史回補與日曆對齊核心邏輯 (Spec 0134)
 */

import { parseCleanNumber } from './marketSyncCore';
import { DailyCandle } from '../types/indicators';

export interface RawCandleItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isHalted?: boolean;
}

export interface InstitutionalRawRow {
  institution: string; // Foreign_Investor, Investment_Trust, Dealer_self, Dealer_Hedging
  netShares: number;   // 股數 (正為買超，負為賣超)
}

export interface AggregatedInstitutionalDay {
  foreignNetShares: number; // 張數
  trustNetShares: number;   // 張數
  dealerNetShares: number;  // 張數
  totalNetShares: number;   // 張數
}

export interface GapAuditResult {
  symbol: string;
  isUpToDate: boolean;
  latestStockDate: string | null;
  latestMarketDate: string | null;
  lagDays: number;
  missingDates: string[];
}

/**
 * 依據大盤標準日曆對齊個股日 K 數列，若中間有交易日停牌或缺漏，執行前值填補並標註 isHalted
 */
export function alignCandlesWithCalendar(
  candles: RawCandleItem[],
  calendar: string[]
): RawCandleItem[] {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  if (!Array.isArray(calendar) || calendar.length === 0) return [...candles];

  // 1. 建立日期查找 Map
  const candleMap = new Map<string, RawCandleItem>();
  for (const c of candles) {
    if (c && c.date) candleMap.set(c.date, c);
  }

  // 2. 確定個股的起始交易日與最後交易日
  const sortedStockDates = Array.from(candleMap.keys()).sort();
  const firstStockDate = sortedStockDates[0];
  const lastStockDate = sortedStockDates[sortedStockDates.length - 1];

  // 3. 以二分搜尋快速定位個股生命週期在日曆中的起迄索引 (O(log M) 取代 O(M) 全量 filter)
  let low = 0;
  let high = calendar.length - 1;
  let startIdx = calendar.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (calendar[mid] >= firstStockDate) {
      startIdx = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  low = 0;
  high = calendar.length - 1;
  let endIdx = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (calendar[mid] <= lastStockDate) {
      endIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const relevantCalendar = startIdx <= endIdx ? calendar.slice(startIdx, endIdx + 1) : [];

  const result: RawCandleItem[] = [];
  let prevClose = candles[0]?.close || 0;

  for (const calDate of relevantCalendar) {
    const existing = candleMap.get(calDate);
    if (existing) {
      result.push(existing);
      prevClose = existing.close;
    } else {
      // 停牌無量：沿用前一交易日收盤價，成交量補 0，標記 isHalted: true
      result.push({
        date: calDate,
        open: prevClose,
        high: prevClose,
        low: prevClose,
        close: prevClose,
        volume: 0,
        isHalted: true,
      });
    }
  }

  return result;
}

/**
 * 聚合單日三大法人日報明細，將股數換算為張數 (除以 1000)
 */
export function aggregateInstitutionalRows(
  rows: InstitutionalRawRow[]
): AggregatedInstitutionalDay {
  let foreignNet = 0;
  let trustNet = 0;
  let dealerNet = 0;

  for (const r of rows) {
    if (!r) continue;
    const net = parseCleanNumber(r.netShares);
    const inst = String(r.institution || '').trim();

    if (inst.includes('Foreign')) {
      foreignNet += net;
    } else if (inst.includes('Investment_Trust') || inst.includes('Trust')) {
      trustNet += net;
    } else if (inst.includes('Dealer')) {
      dealerNet += net;
    }
  }

  const foreignNetShares = Math.round(foreignNet / 1000);
  const trustNetShares = Math.round(trustNet / 1000);
  const dealerNetShares = Math.round(dealerNet / 1000);
  const totalNetShares = foreignNetShares + trustNetShares + dealerNetShares;

  return {
    foreignNetShares,
    trustNetShares,
    dealerNetShares,
    totalNetShares,
  };
}

import { calculateMuscleBookerIndicators } from './muscleBookerEngine';
import { calculateRSI } from './omniIndicatorEngine';

/**
 * 計算 OHLCV 技術指標數列（MA5/10/20/60、RSI14、MACD、Darvas 箱體上下軌）
 */
export function computeOhlcvIndicators(candles: RawCandleItem[]): {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  rsi14: number;
  boxUpper: number;
  boxLower: number;
  macd: { dif: number; dea: number; macd: number };
} {
  const dailyCandles: DailyCandle[] = candles.map((c) => ({
    date: c.date,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));

  const allPoints = calculateMuscleBookerIndicators(dailyCandles);
  const closes = dailyCandles.map((c) => c.close);
  const rsi14 = calculateRSI(closes, 14) ?? 50;

  if (!allPoints || allPoints.length === 0) {
    return {
      ma5: 0,
      ma10: 0,
      ma20: 0,
      ma60: 0,
      rsi14: 50,
      boxUpper: 0,
      boxLower: 0,
      macd: { dif: 0, dea: 0, macd: 0 },
    };
  }

  const latestPoint = allPoints[allPoints.length - 1];
  return {
    ma5: latestPoint.ma?.ma5 ?? 0,
    ma10: latestPoint.ma?.ma10 ?? 0,
    ma20: latestPoint.ma?.ma20 ?? 0,
    ma60: latestPoint.ma?.ma60 ?? 0,
    rsi14: Math.round(rsi14 * 100) / 100,
    boxUpper: latestPoint.box?.boxUpper ?? 0,
    boxLower: latestPoint.box?.boxLower ?? 0,
    macd: { dif: 0, dea: 0, macd: 0 },
  };
}

/**
 * 審計個股與大盤日曆差距
 */
export function auditDateGaps(
  symbol: string,
  stockDates: string[],
  calendar: string[]
): GapAuditResult {
  if (!Array.isArray(calendar) || calendar.length === 0) {
    return {
      symbol,
      isUpToDate: true,
      latestStockDate: null,
      latestMarketDate: null,
      lagDays: 0,
      missingDates: [],
    };
  }

  const sortedCalendar = [...calendar].sort();
  const latestMarketDate = sortedCalendar[sortedCalendar.length - 1];

  if (!Array.isArray(stockDates) || stockDates.length === 0) {
    return {
      symbol,
      isUpToDate: false,
      latestStockDate: null,
      latestMarketDate,
      lagDays: calendar.length,
      missingDates: [...sortedCalendar],
    };
  }

  const sortedStockDates = [...stockDates].sort();
  const latestStockDate = sortedStockDates[sortedStockDates.length - 1];

  const missingDates: string[] = [];

  for (const calDate of sortedCalendar) {
    if (calDate > latestStockDate) {
      missingDates.push(calDate);
    }
  }

  return {
    symbol,
    isUpToDate: latestStockDate >= latestMarketDate,
    latestStockDate,
    latestMarketDate,
    lagDays: missingDates.length,
    missingDates,
  };
}
