import { MarketType } from '../types/stock';

export interface MarketSettlementStatus {
  isSettled: boolean; // 是否已結算完成
  anchorTradingDate: string; // 量化分析基準日 (YYYY-MM-DD)
  currentTradingDate?: string; // 當日自然日或交易日 (YYYY-MM-DD) (Spec 0170)
  reason?: string; // 尚未結算原因說明
  isTradingHours: boolean; // 是否處於盤中交易時段
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
 * 往回推算指定數量的工作日 (跳過週六、週日)
 */
function stepBackWorkingDays(baseDate: Date, count: number): Date {
  const cur = new Date(baseDate.getTime());
  let remaining = count;
  while (remaining > 0) {
    cur.setDate(cur.getDate() - 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }
  return cur;
}

/**
 * 解析台北時區 (Asia/Taipei) 當前日期時間分量
 */
function getTaipeiParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
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
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'second') second = parseInt(p.value, 10);
  }

  // 構造一個台北時區代表的本地日期物件 (方便做加減運算)
  const twDate = new Date(year, month - 1, day);
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
    twDate,
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
  const tp = getTaipeiParts(referenceDate);

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
        anchorTradingDate: formatDateToYMD(tp.twDate),
        currentTradingDate: formatDateToYMD(tp.twDate),
        isTradingHours: false,
      };
    }

    // 未達 15:00 結算門檻或週末：
    // 若為週末：退回最近已收盤的週五
    // 若為週一至週五 15:00 前：退回前一個已收盤交易日 (週一退至上週五)
    let anchorDate: Date;
    if (tp.isWeekend) {
      anchorDate = stepBackWorkingDays(tp.twDate, 0); // 調整週末至週五
      if (anchorDate.getDay() === 0) anchorDate.setDate(anchorDate.getDate() - 2);
      else if (anchorDate.getDay() === 6) anchorDate.setDate(anchorDate.getDate() - 1);
    } else {
      anchorDate = stepBackWorkingDays(tp.twDate, 1);
    }

    let reason = '台股休市中，尚未完成當日盤後籌碼結算';
    if (isTradingHours) {
      reason = '台股尚未完成當日盤後籌碼結算（盤中交易中，每日 15:00 結算）';
    } else if (!tp.isWeekend && tp.totalMinutes < 15 * 60) {
      reason = '台股尚未完成當日盤後籌碼結算（預計 15:00 發布完整法人數據）';
    }

    return {
      isSettled: false,
      anchorTradingDate: formatDateToYMD(anchorDate),
      currentTradingDate: formatDateToYMD(tp.twDate),
      reason,
      isTradingHours,
    };
  }

  // 美股 (US) 市場
  // 結算門檻：台北時間每日早上 08:00 (含) 之後
  // 美股週一至週五交易，對應台北時間週二至週六清晨收盤
  const isSettledAfter8 = tp.totalMinutes >= 8 * 60;

  if (isSettledAfter8) {
    // 台北時間 08:00 後：
    // 若是週二至週六：前一美股交易日（美東週一至週五）已於今晨收盤並完成結算
    // 例如：週四 08:30 -> 對應美東週三收盤 (2026-09-30)
    // 若是週日、週一：美股週末休市，anchorDate 退到前週五
    let anchorDate: Date;
    if (tp.weekday === 'Sun') {
      anchorDate = stepBackWorkingDays(tp.twDate, 1); // 退至週五
    } else if (tp.weekday === 'Mon') {
      anchorDate = stepBackWorkingDays(tp.twDate, 1); // 退至前週五
    } else {
      // 週二至週六：對應前一天的美股交易日
      anchorDate = stepBackWorkingDays(tp.twDate, 1);
    }

    return {
      isSettled: true,
      anchorTradingDate: formatDateToYMD(anchorDate),
      isTradingHours: false,
    };
  } else {
    // 台北時間 08:00 前：美股前日收盤數據未結算完成
    // 例如：週四 07:30 -> 美東週三未結算完成，退回美東週二 (2026-09-29)
    // 週一 07:30 -> 退回前週五 (2026-09-25)
    let anchorDate: Date;
    if (tp.weekday === 'Mon') {
      // 週一清晨 07:30：退回至前週五
      anchorDate = stepBackWorkingDays(tp.twDate, 1);
    } else if (tp.weekday === 'Sun') {
      // 週日清晨 07:30：退回至週五
      anchorDate = stepBackWorkingDays(tp.twDate, 1);
    } else {
      // 週二至週六 08:00 前：因為當日晨間的美股尚未過 08:00 結算線，再退 1 個工作天
      anchorDate = stepBackWorkingDays(tp.twDate, 2);
    }

    return {
      isSettled: false,
      anchorTradingDate: formatDateToYMD(anchorDate),
      reason: '美股尚未完成盤後數據結算（每日台灣時間 08:00 結算）',
      isTradingHours: false,
    };
  }
}
