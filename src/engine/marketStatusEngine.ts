import { isTradingDay, getHolidayReason, isEarlyCloseDay } from './holidayCalendar';

export type MarketSessionType = 'OPEN' | 'PRE_MARKET' | 'POST_MARKET' | 'CLOSED' | 'EARLY_CLOSE';

export interface MarketSessionStatus {
  market: 'TW' | 'US';
  dateStr: string;
  status: MarketSessionType;
  statusLabel: string;
  isOpen: boolean;
  isHoliday: boolean;
  isEarlyClose?: boolean;
  holidayReason?: string | null;
  marketTimeFormatted: string; // 當地市場時間 HH:mm
}

/**
 * 取得指定時間在台北時區 (UTC+8) 的年月日與時分
 */
function getTaipeiParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);

  return {
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute,
    timeFormatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

/**
 * 取得指定時間在美東時區 (America/New_York，自動感知夏令冬令) 的年月日與時分
 */
function getNewYorkParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);

  return {
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute,
    timeFormatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

/**
 * 計算台股市場即時營業狀態 (Spec 0190 / Ticket 12)
 */
export function getTwMarketStatus(date = new Date()): MarketSessionStatus {
  const { dateStr, hour, minute, timeFormatted } = getTaipeiParts(date);
  const totalMinutes = hour * 60 + minute;

  const isTrad = isTradingDay(dateStr, 'TW');
  const holidayReason = getHolidayReason(dateStr, 'TW');

  if (!isTrad) {
    return {
      market: 'TW',
      dateStr,
      status: 'CLOSED',
      statusLabel: '休市',
      isOpen: false,
      isHoliday: true,
      holidayReason: holidayReason || '週末休市',
      marketTimeFormatted: timeFormatted,
    };
  }

  // 台股營業時間段：
  // 08:30 ~ 09:00: 盤前試撮 (510 ~ 540)
  // 09:00 ~ 13:30: 盤中交易 (540 ~ 810)
  // 13:30 ~ 14:30: 盤後定價交易 (810 ~ 870)
  // 其餘: 已收盤 (CLOSED)
  if (totalMinutes >= 540 && totalMinutes < 810) {
    return {
      market: 'TW',
      dateStr,
      status: 'OPEN',
      statusLabel: '盤中交易中',
      isOpen: true,
      isHoliday: false,
      marketTimeFormatted: timeFormatted,
    };
  }

  if (totalMinutes >= 510 && totalMinutes < 540) {
    return {
      market: 'TW',
      dateStr,
      status: 'PRE_MARKET',
      statusLabel: '盤前試撮',
      isOpen: false,
      isHoliday: false,
      marketTimeFormatted: timeFormatted,
    };
  }

  if (totalMinutes >= 810 && totalMinutes < 870) {
    return {
      market: 'TW',
      dateStr,
      status: 'POST_MARKET',
      statusLabel: '盤後作業',
      isOpen: false,
      isHoliday: false,
      marketTimeFormatted: timeFormatted,
    };
  }

  return {
    market: 'TW',
    dateStr,
    status: 'CLOSED',
    statusLabel: totalMinutes >= 870 ? '已收盤' : '未開盤',
    isOpen: false,
    isHoliday: false,
    marketTimeFormatted: timeFormatted,
  };
}

/**
 * 計算美股市場即時營業狀態 (Spec 0190 / Ticket 12)
 */
export function getUsMarketStatus(date = new Date()): MarketSessionStatus {
  const { dateStr, hour, minute, timeFormatted } = getNewYorkParts(date);
  const totalMinutes = hour * 60 + minute;

  const isTrad = isTradingDay(dateStr, 'US');
  const holidayReason = getHolidayReason(dateStr, 'US');
  const earlyClose = isEarlyCloseDay(dateStr, 'US');

  if (!isTrad) {
    return {
      market: 'US',
      dateStr,
      status: 'CLOSED',
      statusLabel: '休市',
      isOpen: false,
      isHoliday: true,
      holidayReason: holidayReason || '週末休市',
      marketTimeFormatted: timeFormatted,
    };
  }

  // 美股營業時間 (美東)：
  // 盤前交易: 04:00 ~ 09:30 (240 ~ 570)
  // 正式交易: 09:30 ~ 16:00 (570 ~ 960)；若為半日市則 09:30 ~ 13:00 (570 ~ 780)
  // 盤後交易: 16:00 ~ 20:00 (960 ~ 1200)；若為半日市則 13:00 ~ 17:00 (780 ~ 1020)
  const regularCloseMinute = earlyClose ? 780 : 960;
  const postCloseMinute = earlyClose ? 1020 : 1200;

  if (totalMinutes >= 570 && totalMinutes < regularCloseMinute) {
    return {
      market: 'US',
      dateStr,
      status: earlyClose ? 'EARLY_CLOSE' : 'OPEN',
      statusLabel: earlyClose ? '半日市交易中' : '盤中交易中',
      isOpen: true,
      isHoliday: false,
      isEarlyClose: earlyClose,
      marketTimeFormatted: timeFormatted,
    };
  }

  if (totalMinutes >= 240 && totalMinutes < 570) {
    return {
      market: 'US',
      dateStr,
      status: 'PRE_MARKET',
      statusLabel: '盤前交易',
      isOpen: false,
      isHoliday: false,
      isEarlyClose: earlyClose,
      marketTimeFormatted: timeFormatted,
    };
  }

  if (totalMinutes >= regularCloseMinute && totalMinutes < postCloseMinute) {
    return {
      market: 'US',
      dateStr,
      status: 'POST_MARKET',
      statusLabel: '盤後交易',
      isOpen: false,
      isHoliday: false,
      isEarlyClose: earlyClose,
      marketTimeFormatted: timeFormatted,
    };
  }

  return {
    market: 'US',
    dateStr,
    status: 'CLOSED',
    statusLabel: totalMinutes >= postCloseMinute ? '已收盤' : '未開盤',
    isOpen: false,
    isHoliday: false,
    isEarlyClose: earlyClose,
    marketTimeFormatted: timeFormatted,
  };
}
