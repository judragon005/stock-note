/**
 * trading-calendar-engine.cjs
 * 台灣/美國證券市場法定演算法交易日曆引擎 (Spec 0170 / Spec 0190)
 * 100% 依賴 SSOT JSON 字典與純演算法，零外部套件依賴
 */

const fs = require('fs');
const path = require('path');

// 讀取單一真理來源 (SSOT) JSON 字典
const holidaysJsonPath = path.resolve(__dirname, '../../src/data/market-holidays.json');
let MARKET_HOLIDAYS = { TW: {}, US: {} };

try {
  if (fs.existsSync(holidaysJsonPath)) {
    MARKET_HOLIDAYS = JSON.parse(fs.readFileSync(holidaysJsonPath, 'utf-8'));
  }
} catch (e) {
  console.warn('[trading-calendar-engine] 無法讀取 market-holidays.json:', e.message);
}

/**
 * 2023 ~ 2030 年台股 (TWSE / TPEx) 法定休市日常數集合 (向後相容導出)
 */
const TW_STATUTORY_HOLIDAYS = new Set(Object.keys(MARKET_HOLIDAYS.TW || {}));

/**
 * 將 Date 物件或字串正規化為 YYYY-MM-DD
 * @param {Date|string} dateInput
 * @returns {string}
 */
function normalizeDateStr(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    return dateInput.trim().slice(0, 10);
  }
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * 判斷指定日期在指定市場是否為交易營業日 (排除週末與法定/天災休市日)
 * @param {Date|string} dateInput 
 * @param {'TW' | 'US'} [market='TW']
 * @returns {boolean}
 */
function isTradingDay(dateInput, market = 'TW') {
  const dateStr = normalizeDateStr(dateInput);
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dateObj.getUTCDay();

  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  const holidays = market === 'US' ? (MARKET_HOLIDAYS.US || {}) : (MARKET_HOLIDAYS.TW || {});
  if (Object.prototype.hasOwnProperty.call(holidays, dateStr)) {
    return false;
  }

  return true;
}

/**
 * 取得指定日期的休市原因 (若為正常營業日則回傳 null)
 * @param {Date|string} dateInput
 * @param {'TW' | 'US'} [market='TW']
 * @returns {string | null}
 */
function getHolidayReason(dateInput, market = 'TW') {
  const dateStr = normalizeDateStr(dateInput);
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dateObj.getUTCDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return '週末休市';
  }

  const holidays = market === 'US' ? (MARKET_HOLIDAYS.US || {}) : (MARKET_HOLIDAYS.TW || {});
  if (Object.prototype.hasOwnProperty.call(holidays, dateStr)) {
    return holidays[dateStr];
  }

  return null;
}

/**
 * 判斷指定日期是否為台股正常交易日 (向後相容)
 * @param {Date|string} dateInput 
 * @returns {boolean}
 */
function isTwTradingDay(dateInput) {
  return isTradingDay(dateInput, 'TW');
}

/**
 * 往前倒推 N 個合法交易日
 * @param {Date|string} dateInput 
 * @param {number} [offsetDays=1] 
 * @param {'TW' | 'US'} [market='TW']
 * @returns {string} YYYY-MM-DD
 */
function getPreviousTradingDay(dateInput, offsetDays = 1, market = 'TW') {
  const dateStr = normalizeDateStr(dateInput);
  if (!dateStr) return '';

  const [y, m, d] = dateStr.split('-').map(Number);
  let cursor = new Date(Date.UTC(y, m - 1, d));
  let count = 0;
  const target = Math.max(1, offsetDays);

  while (count < target) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (isTradingDay(cursorStr, market)) {
      count++;
      if (count === target) {
        return cursorStr;
      }
    }
  }
  return cursor.toISOString().slice(0, 10);
}

/**
 * 往後推算 N 個合法交易日
 * @param {Date|string} dateInput 
 * @param {number} [offsetDays=1] 
 * @param {'TW' | 'US'} [market='TW']
 * @returns {string} YYYY-MM-DD
 */
function getNextTradingDay(dateInput, offsetDays = 1, market = 'TW') {
  const dateStr = normalizeDateStr(dateInput);
  if (!dateStr) return '';

  const [y, m, d] = dateStr.split('-').map(Number);
  let cursor = new Date(Date.UTC(y, m - 1, d));
  let count = 0;
  const target = Math.max(1, offsetDays);

  while (count < target) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (isTradingDay(cursorStr, market)) {
      count++;
      if (count === target) {
        return cursorStr;
      }
    }
  }
  return cursor.toISOString().slice(0, 10);
}

/**
 * 計算交易日之款券交割結算日 (台股 T+2 / 美股 T+1，自動略過週末與休市日)
 * @param {Date|string} tradeDateInput
 * @param {'TW' | 'US'} [market='TW']
 * @returns {string} YYYY-MM-DD
 */
function getSettlementDate(tradeDateInput, market = 'TW') {
  const targetOffset = market === 'US' ? 1 : 2;
  return getNextTradingDay(tradeDateInput, targetOffset, market);
}

/**
 * 計算兩日期之間橫跨之實際日曆天數 (供券商融資計息使用)
 * @param {Date|string} startDateInput
 * @param {Date|string} endDateInput
 * @returns {number}
 */
function getHoldingInterestDays(startDateInput, endDateInput) {
  const sStr = normalizeDateStr(startDateInput);
  const eStr = normalizeDateStr(endDateInput);
  if (!sStr || !eStr) return 0;

  const [sy, sm, sd] = sStr.split('-').map(Number);
  const [ey, em, ed] = eStr.split('-').map(Number);
  const sUtc = Date.UTC(sy, sm - 1, sd);
  const eUtc = Date.UTC(ey, em - 1, ed);

  const diffMs = eUtc - sUtc;
  return Math.max(0, Math.round(diffMs / (24 * 3600 * 1000)));
}

/**
 * 台灣券商融資標準年利率基準 (6.45%)
 */
const DEFAULT_MARGIN_ANNUAL_INTEREST_RATE = 0.0645;

/**
 * 計算融資利息金額 (公式: 融資金額 * 年利率 * (計息天數 / 365)，取整數)
 * @param {number} borrowAmount - 融資借貸本金
 * @param {number} days - 計息日曆天數
 * @param {number} [annualRate=0.0645] - 融資年利率
 * @returns {number} 融資利息金額 (元)
 */
function calculateMarginInterest(borrowAmount, days, annualRate = DEFAULT_MARGIN_ANNUAL_INTEREST_RATE) {
  if (!borrowAmount || borrowAmount <= 0 || !days || days <= 0) return 0;
  return Math.floor(borrowAmount * annualRate * (days / 365));
}

/**
 * 判定指定日期是否為台美衍生品結算日 (台指期每月第 3 個週三 / 美股月選第 3 個週五，3/6/9/12月為四巫日)
 * @param {Date|string} dateInput
 * @param {'TW' | 'US'} [market='TW']
 * @returns {{ isExpiry: boolean, isQuadrupleWitching?: boolean, type?: string }}
 */
function isDerivativesExpiryDay(dateInput, market = 'TW') {
  const dateStr = normalizeDateStr(dateInput);
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { isExpiry: false };
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dateObj.getUTCDay();

  // 每月第 3 個星期必落在 15 ~ 21 號之間
  const isThirdWeek = d >= 15 && d <= 21;

  if (market === 'TW') {
    // 3 = Wednesday
    if (dayOfWeek === 3 && isThirdWeek) {
      return { isExpiry: true, type: 'TXF_MONTHLY' };
    }
  } else {
    // 5 = Friday
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

/**
 * 計算指定時間點當前最新已發布結算之 TDCC 集保基準日
 * 規則：原則為每週五 21:00 結算發布。
 * 若週五為國定假日或天災停市日，法規提前至「該週最後一個交易營業日 (如週四)」發布。
 * @param {Date} [now=new Date()]
 * @returns {string} YYYY-MM-DD
 */
function getLatestTdccPublishDate(now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + 3600000 * 8); // 台北時間 UTC+8
  const day = local.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const hours = local.getHours();
  const minutes = local.getMinutes();
  const totalMins = hours * 60 + minutes;

  // 定位到本週五
  const thisFriday = new Date(local);
  const diffToFriday = 5 - day;
  thisFriday.setDate(thisFriday.getDate() + diffToFriday);

  // 判斷本週五是否已經過去 (或若是週五且已過 21:00)
  const isPastPublishTime = day > 5 || (day === 5 && totalMins >= 21 * 60);

  // 若尚未到本週五 21:00，基準週往前推一週 (上週)
  if (!isPastPublishTime) {
    thisFriday.setDate(thisFriday.getDate() - 7);
  }

  // 從該週五開始，若為休市日，自動往前回溯至該週最後一個有效交易日
  const friStr = normalizeDateStr(thisFriday);
  if (isTradingDay(friStr, 'TW')) {
    return friStr;
  }
  return getPreviousTradingDay(friStr, 1, 'TW');
}

/**
 * 計算指定年份月份之上市櫃公司月營收法定申報截止日
 * 規則：次月 10 日 17:30 截止申報。
 * 若 10 號遇非營業日 (週末或國定/天災休市)，依法順延至次一有效交易營業日。
 * @param {number} year 營收所屬年份
 * @param {number} month 營收所屬月份 (1~12)
 * @returns {string} YYYY-MM-DD
 */
function getRevenueDeadlineDate(year, month) {
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const tenthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`;
  if (isTradingDay(tenthStr, 'TW')) {
    return tenthStr;
  }
  return getNextTradingDay(tenthStr, 1, 'TW');
}

module.exports = {
  TW_STATUTORY_HOLIDAYS,
  MARKET_HOLIDAYS,
  isTradingDay,
  isTwTradingDay,
  getHolidayReason,
  getPreviousTradingDay,
  getNextTradingDay,
  getSettlementDate,
  getHoldingInterestDays,
  DEFAULT_MARGIN_ANNUAL_INTEREST_RATE,
  calculateMarginInterest,
  isDerivativesExpiryDay,
  getLatestTdccPublishDate,
  getRevenueDeadlineDate,
  normalizeDateStr,
};





