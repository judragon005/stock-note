/**
 * trading-calendar-engine.cjs
 * 台灣證券市場法定演算法交易日曆引擎 (Spec 0170 / Ticket 01)
 * 100% 純演算法與法定規則，零檔案 I/O，零外部網路依賴
 */

/**
 * 2023 ~ 2030 年台股 (TWSE / TPEx) 法定休市日
 * 包含：元旦、春節封關假期、和平紀念日、清明/兒童節、勞動節 5/1、端午節、中秋節、國慶日等。
 * 補班日證券市場一律不交易不交割。
 */
const TW_STATUTORY_HOLIDAYS = new Set([
  // --- 2023 年 ---
  '2023-01-02', '2023-01-19', '2023-01-20', '2023-01-23', '2023-01-24', '2023-01-25', '2023-01-26', '2023-01-27',
  '2023-02-27', '2023-02-28', '2023-04-03', '2023-04-04', '2023-04-05', '2023-05-01', '2023-06-22', '2023-06-23',
  '2023-09-29', '2023-10-09', '2023-10-10',

  // --- 2024 年 ---
  '2024-01-01', '2024-02-06', '2024-02-07', '2024-02-08', '2024-02-09', '2024-02-12', '2024-02-13', '2024-02-14',
  '2024-02-28', '2024-04-04', '2024-04-05', '2024-05-01', '2024-06-10', '2024-09-17', '2024-10-10',

  // --- 2025 年 ---
  '2025-01-01', '2025-01-23', '2025-01-24', '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31',
  '2025-02-28', '2025-04-03', '2025-04-04', '2025-05-01', '2025-05-30', '2025-10-06', '2025-10-10',

  // --- 2026 年 ---
  '2026-01-01', '2026-01-02', '2026-02-12', '2026-02-13', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
  '2026-02-27', '2026-04-03', '2026-04-06', '2026-05-01', '2026-06-19', '2026-09-25', '2026-10-09',

  // --- 2027 年 ---
  '2027-01-01', '2027-02-04', '2027-02-05', '2027-02-08', '2027-02-09', '2027-02-10', '2027-02-11', '2027-02-12',
  '2027-03-01', '2027-04-02', '2027-04-05', '2027-04-30', '2027-06-09', '2027-09-15', '2027-10-11',

  // --- 2028 年 ---
  '2028-01-25', '2028-01-26', '2028-01-27', '2028-01-28', '2028-01-31', '2028-02-01', '2028-02-02',
  '2028-02-28', '2028-04-03', '2028-04-04', '2028-05-01', '2028-05-29', '2028-10-03', '2028-10-10',

  // --- 2029 年 ---
  '2029-01-01', '2029-02-12', '2029-02-13', '2029-02-14', '2029-02-15', '2029-02-16',
  '2029-02-28', '2029-04-04', '2029-04-05', '2029-05-01', '2029-06-18', '2029-09-21', '2029-10-10',

  // --- 2030 年 ---
  '2030-01-01', '2030-02-01', '2030-02-04', '2030-02-05', '2030-02-06', '2030-02-07', '2030-02-08',
  '2030-02-28', '2030-04-04', '2030-04-05', '2030-05-01', '2030-06-05', '2030-09-12', '2030-10-10',
]);

/**
 * 將 Date 物件或字串正規化為 YYYY-MM-DD
 */
function normalizeDateStr(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    // 取前 10 碼
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
 * 判斷指定日期是否為台股正常交易日
 * @param {Date|string} dateInput 
 * @returns {boolean}
 */
function isTwTradingDay(dateInput) {
  const dateStr = normalizeDateStr(dateInput);
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dateObj.getUTCDay();

  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 法定國定休市日
  if (TW_STATUTORY_HOLIDAYS.has(dateStr)) {
    return false;
  }

  return true;
}

/**
 * 往前倒推 N 個合法交易日
 * @param {Date|string} dateInput 
 * @param {number} [offsetDays=1] 
 * @returns {string} YYYY-MM-DD
 */
function getPreviousTradingDay(dateInput, offsetDays = 1) {
  const dateStr = normalizeDateStr(dateInput);
  if (!dateStr) return '';

  const [y, m, d] = dateStr.split('-').map(Number);
  let cursor = new Date(Date.UTC(y, m - 1, d));
  let count = 0;
  const target = Math.max(1, offsetDays);

  while (count < target) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (isTwTradingDay(cursorStr)) {
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
 * @returns {string} YYYY-MM-DD
 */
function getNextTradingDay(dateInput, offsetDays = 1) {
  const dateStr = normalizeDateStr(dateInput);
  if (!dateStr) return '';

  const [y, m, d] = dateStr.split('-').map(Number);
  let cursor = new Date(Date.UTC(y, m - 1, d));
  let count = 0;
  const target = Math.max(1, offsetDays);

  while (count < target) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (isTwTradingDay(cursorStr)) {
      count++;
      if (count === target) {
        return cursorStr;
      }
    }
  }
  return cursor.toISOString().slice(0, 10);
}

module.exports = {
  TW_STATUTORY_HOLIDAYS,
  isTwTradingDay,
  getPreviousTradingDay,
  getNextTradingDay,
  normalizeDateStr,
};
