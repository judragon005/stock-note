import { MarketType } from '../types/stock';
import marketHolidaysJson from '../data/market-holidays.json';

const MARKET_HOLIDAYS: { TW: Record<string, string>; US: Record<string, string> } = {
  TW: (marketHolidaysJson as { TW?: Record<string, string> }).TW ?? {},
  US: (marketHolidaysJson as { US?: Record<string, string> }).US ?? {},
};

// Spec 0246 Ticket 01: 與後端 sync-thresholds.cjs 對齊的單一結算門檻常數
export const UNIFIED_SETTLEMENT_CUTOFFS = {
  TW_SETTLE_MINUTES: 15 * 60, // 15:00 Asia/Taipei
  US_SETTLE_MINUTES: 17 * 60, // 17:00 America/New_York
} as const;

export interface MarketSettlementStatus {
  isSettled: boolean; // 是否已結算完成
  anchorTradingDate: string; // 量化分析基準日 (YYYY-MM-DD)
  currentTradingDate?: string; // 當日自然日或交易日 (YYYY-MM-DD) (Spec 0170)
  isTradingDayToday?: boolean; // 當日是否為所在市場法定交易日 (Spec 0246)
  reason?: string; // 尚未結算原因說明
  isTradingHours: boolean; // 是否處於盤中交易時段
}

/**
 * 格式化 UTC Date 物件為 YYYY-MM-DD（不受執行環境本地時區影響）
 */
function formatUtcDateToYMD(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 格式化 Date 為 YYYY-MM-DD
 */
export function formatDateToYMD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 判斷指定 UTC 日期在該市場是否為法定交易日（排除週末與 market-holidays.json 法定休市日）
 */
function isMarketTradingDateUtc(utcDate: Date, market: MarketType): boolean {
  const day = utcDate.getUTCDay();
  if (day === 0 || day === 6) return false;
  const ymd = formatUtcDateToYMD(utcDate);
  const holidays = market === 'US' ? MARKET_HOLIDAYS.US : MARKET_HOLIDAYS.TW;
  return !Object.prototype.hasOwnProperty.call(holidays, ymd);
}

/**
 * 往回尋找最近一個有效交易日（跳過週末與法定休市日，Spec 0246）
 */
function stepBackTradingDaysUtc(baseUtcDate: Date, market: MarketType, count: number = 1): Date {
  const cur = new Date(baseUtcDate.getTime());
  let remaining = Math.max(1, count);
  for (let guard = 0; guard < 40 && remaining > 0; guard++) {
    cur.setUTCDate(cur.getUTCDate() - 1);
    if (isMarketTradingDateUtc(cur, market)) {
      remaining--;
    }
  }
  return cur;
}

/**
 * 解析指定 IANA 時區之日期時間分量（強制 hourCycle: 'h23' 杜絕午夜 hour = 24）
 */
function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  let year = 1970;
  let month = 1;
  let day = 1;
  let weekday = '';
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'weekday') weekday = p.value;
    if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'second') second = parseInt(p.value, 10);
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const totalMinutes = hour * 60 + minute;
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  return {
    year,
    month,
    day,
    weekday,
    hour,
    minute,
    second,
    utcDate,
    ymd,
    totalMinutes,
    isWeekend,
  };
}

/**
 * 取得指定市場與時間之結算狀態與量化定錨交易日
 * @param market 'TW' | 'US'
 * @param referenceDate 基準時間 (預設當前時間)
 */
export function getMarketSettlementStatus(
  market: MarketType = 'TW',
  referenceDate: Date = new Date()
): MarketSettlementStatus {
  const tp = getTimeZoneParts(referenceDate, 'Asia/Taipei');

  if (market === 'TW') {
    const isTwTradingToday = isMarketTradingDateUtc(tp.utcDate, 'TW');
    // 台股開盤交易時段：法定交易日 09:00 ~ 13:30
    const isTradingHours =
      isTwTradingToday &&
      tp.totalMinutes >= 9 * 60 &&
      tp.totalMinutes <= 13 * 60 + 30;

    // 結算門檻：法定交易日 15:00 (含) 之後（與後端 getMarketAnchorDate 完全一致）
    const isSettledTime = isTwTradingToday && tp.totalMinutes >= UNIFIED_SETTLEMENT_CUTOFFS.TW_SETTLE_MINUTES;

    if (isSettledTime) {
      return {
        isSettled: true,
        anchorTradingDate: tp.ymd,
        currentTradingDate: tp.ymd,
        isTradingDayToday: isTwTradingToday,
        isTradingHours: false,
      };
    }

    // 未達 15:00 結算門檻、週末或法定休市日：退回最近一個已結算台股交易日
    const anchorDate = stepBackTradingDaysUtc(tp.utcDate, 'TW', 1);

    let reason = '台股休市中，尚未完成當日盤後籌碼結算';
    if (isTradingHours) {
      reason = '台股尚未完成當日盤後籌碼結算（盤中交易中，每日 15:00 結算）';
    } else if (isTwTradingToday && tp.totalMinutes < UNIFIED_SETTLEMENT_CUTOFFS.TW_SETTLE_MINUTES) {
      reason = '台股尚未完成當日盤後籌碼結算（預計 15:00 發布完整法人數據）';
    }

    return {
      isSettled: false,
      anchorTradingDate: formatUtcDateToYMD(anchorDate),
      currentTradingDate: tp.ymd,
      isTradingDayToday: isTwTradingToday,
      reason,
      isTradingHours,
    };
  }

  // 美股 (US) 市場：以 America/New_York 時區精準自動處理夏冬令 DST，並統一對齊 17:00 美東結算線 + 法定休市日曆
  const ny = getTimeZoneParts(referenceDate, 'America/New_York');
  const currentTradingDate = ny.ymd;
  const isUsTradingToday = isMarketTradingDateUtc(ny.utcDate, 'US');

  // 1. 美東休市日（週末或法定休市日）：前一個已結算交易日已完成結算
  if (!isUsTradingToday) {
    const lastTradingDay = stepBackTradingDaysUtc(ny.utcDate, 'US', 1);
    return {
      isSettled: true,
      anchorTradingDate: formatUtcDateToYMD(lastTradingDay),
      currentTradingDate,
      isTradingDayToday: false,
      isTradingHours: false,
    };
  }

  // 2. 美東平日開盤前 (00:00 ~ 09:29)：前一美東交易日早已完成結算
  if (ny.totalMinutes < 9 * 60 + 30) {
    const prevTradingDay = stepBackTradingDaysUtc(ny.utcDate, 'US', 1);
    return {
      isSettled: true,
      anchorTradingDate: formatUtcDateToYMD(prevTradingDay),
      currentTradingDate,
      isTradingDayToday: true,
      isTradingHours: false,
    };
  }

  // 3. 美東正常交易時段 (09:30 ~ 15:59)：盤中交易中，尚未結算，定錨前一美東交易日
  if (ny.totalMinutes < 16 * 60) {
    const prevTradingDay = stepBackTradingDaysUtc(ny.utcDate, 'US', 1);
    return {
      isSettled: false,
      anchorTradingDate: formatUtcDateToYMD(prevTradingDay),
      currentTradingDate,
      isTradingDayToday: true,
      reason: '美股盤中交易中，尚未完成當日盤後數據結算（每日美東 17:00 結算）',
      isTradingHours: true,
    };
  }

  // 4. 美東盤後未達結算線 (16:00 ~ 16:59 NY)：尚未結算，定錨前一美東交易日
  if (ny.totalMinutes < UNIFIED_SETTLEMENT_CUTOFFS.US_SETTLE_MINUTES) {
    const prevTradingDay = stepBackTradingDaysUtc(ny.utcDate, 'US', 1);
    return {
      isSettled: false,
      anchorTradingDate: formatUtcDateToYMD(prevTradingDay),
      currentTradingDate,
      isTradingDayToday: true,
      reason: '美股尚未完成盤後數據結算（每日美東 17:00 結算）',
      isTradingHours: false,
    };
  }

  return {
    isSettled: true,
    anchorTradingDate: currentTradingDate,
    currentTradingDate,
    isTradingDayToday: true,
    isTradingHours: false,
  };
}
