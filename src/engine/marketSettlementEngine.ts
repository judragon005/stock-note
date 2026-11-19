import { MarketType } from '../types/stock';

export interface MarketSettlementStatus {
  isSettled: boolean; // 是否已結算完成
  anchorTradingDate: string; // 量化分析基準日 (YYYY-MM-DD)
  currentTradingDate?: string; // 當日自然日或交易日 (YYYY-MM-DD) (Spec 0170)
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
 * 往回推算指定數量的工作日 (跳過週六、週日；使用 UTC 算術避免本機 DST 偏移)
 */
function stepBackWorkingDaysUtc(baseUtcDate: Date, count: number): Date {
  const cur = new Date(baseUtcDate.getTime());
  let remaining = count;
  while (remaining > 0) {
    cur.setUTCDate(cur.getUTCDate() - 1);
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }
  return cur;
}

/**
 * 若為週末，退回最近一個週五 (週六 -1 天、週日 -2 天)
 */
function rewindWeekendToFridayUtc(baseUtcDate: Date): Date {
  const cur = new Date(baseUtcDate.getTime());
  const day = cur.getUTCDay();
  if (day === 0) cur.setUTCDate(cur.getUTCDate() - 2);
  else if (day === 6) cur.setUTCDate(cur.getUTCDate() - 1);
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
    // 台股時段：
    // 開盤交易時段：週一至週五 09:00 ~ 13:30
    const isTradingHours =
      !tp.isWeekend &&
      tp.totalMinutes >= 9 * 60 &&
      tp.totalMinutes <= 13 * 60 + 30;

    // 結算門檻：週一至週五 15:00 (含) 之後
    const isSettledTime = !tp.isWeekend && tp.totalMinutes >= 15 * 60;

    if (isSettledTime) {
      return {
        isSettled: true,
        anchorTradingDate: tp.ymd,
        currentTradingDate: tp.ymd,
        isTradingHours: false,
      };
    }

    // 未達 15:00 結算門檻或週末：
    // 若為週末：退回最近已收盤的週五
    // 若為週一至週五 15:00 前：退回前一個已收盤交易日 (週一退至上週五)
    const anchorDate = tp.isWeekend
      ? rewindWeekendToFridayUtc(tp.utcDate)
      : stepBackWorkingDaysUtc(tp.utcDate, 1);

    let reason = '台股休市中，尚未完成當日盤後籌碼結算';
    if (isTradingHours) {
      reason = '台股尚未完成當日盤後籌碼結算（盤中交易中，每日 15:00 結算）';
    } else if (!tp.isWeekend && tp.totalMinutes < 15 * 60) {
      reason = '台股尚未完成當日盤後籌碼結算（預計 15:00 發布完整法人數據）';
    }

    return {
      isSettled: false,
      anchorTradingDate: formatUtcDateToYMD(anchorDate),
      currentTradingDate: tp.ymd,
      reason,
      isTradingHours,
    };
  }

  // 美股 (US) 市場：以 America/New_York 時區精準自動處理夏冬令 DST，並結合台北 08:00 盤後結算線
  const ny = getTimeZoneParts(referenceDate, 'America/New_York');
  const currentTradingDate = ny.ymd;

  // 1. 美東週末（週六、週日，涵蓋台北週日/週一 00:00~07:59）：上週五已於週六 08:00 結算完畢
  if (ny.isWeekend) {
    const lastFriday = rewindWeekendToFridayUtc(ny.utcDate);
    return {
      isSettled: true,
      anchorTradingDate: formatUtcDateToYMD(lastFriday),
      currentTradingDate,
      isTradingHours: false,
    };
  }

  // 2. 美東平日開盤前 (00:00 ~ 09:29)：前一美東交易日早已完成結算
  if (ny.totalMinutes < 9 * 60 + 30) {
    const prevTradingDay = stepBackWorkingDaysUtc(ny.utcDate, 1);
    return {
      isSettled: true,
      anchorTradingDate: formatUtcDateToYMD(prevTradingDay),
      currentTradingDate,
      isTradingHours: false,
    };
  }

  // 3. 美東正常交易時段 (09:30 ~ 15:59)：盤中交易中，尚未結算，定錨前一美東交易日
  if (ny.totalMinutes < 16 * 60) {
    const prevTradingDay = stepBackWorkingDaysUtc(ny.utcDate, 1);
    return {
      isSettled: false,
      anchorTradingDate: formatUtcDateToYMD(prevTradingDay),
      currentTradingDate,
      reason: '美股盤中交易中，尚未完成當日盤後數據結算（每日台灣時間 08:00 結算）',
      isTradingHours: true,
    };
  }

  // 4. 美東盤後 (16:00 ~ 23:59，對應台北隔日 04:00/05:00 ~ 11:59/12:59)：
  //    台北 08:00 前判定未結算（定錨前一美東交易日）；台北 08:00 (含) 後判定已結算（定錨美東當日）
  if (tp.totalMinutes < 8 * 60) {
    const prevTradingDay = stepBackWorkingDaysUtc(ny.utcDate, 1);
    return {
      isSettled: false,
      anchorTradingDate: formatUtcDateToYMD(prevTradingDay),
      currentTradingDate,
      reason: '美股尚未完成盤後數據結算（每日台灣時間 08:00 結算）',
      isTradingHours: false,
    };
  }

  return {
    isSettled: true,
    anchorTradingDate: currentTradingDate,
    currentTradingDate,
    isTradingHours: false,
  };
}
