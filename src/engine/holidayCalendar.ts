import marketHolidaysData from '../data/market-holidays.json';

export type MarketType = 'TW' | 'US';

/**
 * 台股 (TWSE / TPEx) 法定證券市場休市日曆集合 (2023 ~ 2030)
 * 來源：src/data/market-holidays.json (SSOT)
 */
export const TW_MARKET_HOLIDAYS: ReadonlySet<string> = new Set<string>(
  Object.keys(marketHolidaysData.TW || {})
);

/**
 * 美股 (NYSE / NASDAQ / SIFMA) 法定證券市場休市日曆集合 (2023 ~ 2030)
 * 來源：src/data/market-holidays.json (SSOT)
 */
export const US_MARKET_HOLIDAYS: ReadonlySet<string> = new Set<string>(
  Object.keys(marketHolidaysData.US || {})
);

/**
 * 檢查給定日期 (YYYY-MM-DD) 是否為特定市場之法定休市日 (不含週末)
 */
export function isMarketHoliday(dateStr: string, market: MarketType = 'TW'): boolean {
  if (!dateStr || dateStr.length !== 10) return false;
  const holidays = market === 'US' ? US_MARKET_HOLIDAYS : TW_MARKET_HOLIDAYS;
  return holidays.has(dateStr);
}

/**
 * 取得指定日期的休市原因 (若為正常營業日則回傳 null)
 */
export function getHolidayReason(dateStr: string, market: MarketType = 'TW'): string | null {
  if (!dateStr || dateStr.length !== 10) return null;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));
  if (isNaN(d.getTime())) return null;

  const dayOfWeek = d.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return '週末休市';
  }

  const holidays = market === 'US' ? marketHolidaysData.US : marketHolidaysData.TW;
  if (Object.prototype.hasOwnProperty.call(holidays, dateStr)) {
    return (holidays as Record<string, string>)[dateStr];
  }

  return null;
}

/**
 * 檢查給定日期是否為半日市 (如美股黑色星期五 13:00 收盤)
 */
export function isEarlyCloseDay(dateStr: string, market: MarketType = 'TW'): boolean {
  if (!dateStr || dateStr.length !== 10) return false;
  const earlyCloseMap = (marketHolidaysData as any).EARLY_CLOSE?.[market];
  if (!earlyCloseMap) return false;
  return Object.prototype.hasOwnProperty.call(earlyCloseMap, dateStr);
}

/**
 * 檢查給定日期是否為特定市場之有效營業日 (非週末 且 非法定/天災休市日)
 */

export function isBusinessDay(dateStr: string, market: MarketType = 'TW'): boolean {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));

  if (isNaN(d.getTime())) return false;

  const dayOfWeek = d.getUTCDay();
  // 0: Sunday, 6: Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  return !isMarketHoliday(dateStr, market);
}

/**
 * isTradingDay 作為 isBusinessDay 之 alias，對齊後端語意
 */
export const isTradingDay = isBusinessDay;

/**
 * 取得給定日期之後的下一個有效營業日
 * @param dateStr 基準日期 YYYY-MM-DD
 * @param market 市場類別 TW | US
 * @param offsetDays 往後推移之營業日數 (預設 1)
 */
export function getNextBusinessDay(dateStr: string, market: MarketType = 'TW', offsetDays: number = 1): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));

  if (isNaN(d.getTime())) return dateStr;

  let count = 0;
  const target = Math.max(1, offsetDays);

  while (count < target) {
    d.setUTCDate(d.getUTCDate() + 1);
    const currentDateStr = d.toISOString().split('T')[0];
    if (isBusinessDay(currentDateStr, market)) {
      count++;
      if (count === target) {
        return currentDateStr;
      }
    }
  }

  return d.toISOString().split('T')[0];
}

/**
 * 計算交易日之款券交割結算日 (台股 T+2 / 美股 T+1，自動略過週末與休市日)
 */
export function getSettlementDate(tradeDateStr: string, market: MarketType = 'TW'): string {
  const targetOffset = market === 'US' ? 1 : 2;
  return getNextBusinessDay(tradeDateStr, market, targetOffset);
}

/**
 * 計算兩日期之間橫跨之實際日曆天數 (供券商融資計息使用)
 */
export function getHoldingInterestDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const sUtc = Date.UTC(sy, sm - 1, sd);
  const eUtc = Date.UTC(ey, em - 1, ed);

  const diffMs = eUtc - sUtc;
  return Math.max(0, Math.round(diffMs / (24 * 3600 * 1000)));
}

/**
 * 判定指定日期是否為台美衍生品結算日 (台指期每月第 3 個週三 / 美股月選第 3 個週五，3/6/9/12月為四巫日)
 */
export function isDerivativesExpiryDay(
  dateStr: string,
  market: MarketType = 'TW'
): { isExpiry: boolean; isQuadrupleWitching?: boolean; type?: string } {
  if (!dateStr || dateStr.length !== 10) {
    return { isExpiry: false };
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dateObj.getUTCDay();

  // 每月第 3 個星期必落在 15 ~ 21 號之間
  const isThirdWeek = d >= 15 && d <= 21;

  if (market === 'TW') {
    if (dayOfWeek === 3 && isThirdWeek) {
      return { isExpiry: true, type: 'TXF_MONTHLY' };
    }
  } else {
    if (dayOfWeek === 5 && isThirdWeek) {
      const isQuadWitching = m === 3 || m === 6 || m === 9 || m === 12;
      return {
        isExpiry: true,
        isQuadrupleWitching: isQuadWitching,
        type: isQuadWitching ? 'QUADRUPLE_WITCHING' : 'US_MONTHLY_OPTIONS',
      };
    }
  }

  return { isExpiry: false };
}
