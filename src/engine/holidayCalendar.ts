export type MarketType = 'TW' | 'US';

/**
 * 台股 (TWSE / TPEx) 法定證券市場休市日曆表 (2023 ~ 2030)
 * 包含：元旦、春節農曆封關假期、和平紀念日、清明/兒童節、勞動節、端午節、中秋節、國慶日。
 * 附註：金管會規定週六公務補班日證券市場一律休市不交易不交割。
 */
export const TW_MARKET_HOLIDAYS: ReadonlySet<string> = new Set<string>([
  // --- 2023 年 ---
  '2023-01-02', // 元旦補假
  '2023-01-19', '2023-01-20', '2023-01-23', '2023-01-24', '2023-01-25', '2023-01-26', '2023-01-27', // 農曆春節連假
  '2023-02-27', '2023-02-28', // 和平紀念日連假
  '2023-04-03', '2023-04-04', '2023-04-05', // 兒童節與清明節連假
  '2023-05-01', // 勞動節
  '2023-06-22', '2023-06-23', // 端午節連假
  '2023-09-29', // 中秋節
  '2023-10-09', '2023-10-10', // 國慶日連假

  // --- 2024 年 ---
  '2024-01-01', // 元旦
  '2024-02-06', '2024-02-07', '2024-02-08', '2024-02-09', '2024-02-12', '2024-02-13', '2024-02-14', // 農曆春節 (2/5封關後休市)
  '2024-02-28', // 和平紀念日
  '2024-04-04', '2024-04-05', // 兒童節與民族掃墓節
  '2024-05-01', // 勞動節
  '2024-06-10', // 端午節
  '2024-09-17', // 中秋節
  '2024-10-10', // 國慶日

  // --- 2025 年 ---
  '2025-01-01', // 元旦
  '2025-01-23', '2025-01-24', '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', // 農曆春節 (1/22封關後休市)
  '2025-02-28', // 和平紀念日
  '2025-04-03', '2025-04-04', // 兒童節與清明節
  '2025-05-01', // 勞動節
  '2025-05-30', // 端午節連假
  '2025-10-06', // 中秋節
  '2025-10-10', // 國慶日

  // --- 2026 年 ---
  '2026-01-01', '2026-01-02', // 元旦連假
  '2026-02-12', '2026-02-13', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', // 春節連假 (2/11封關後休市)
  '2026-02-27', // 和平紀念日補假
  '2026-04-03', '2026-04-06', // 兒童節與清明節連假
  '2026-05-01', // 勞動節
  '2026-06-19', // 端午節
  '2026-09-25', // 中秋節
  '2026-10-09', // 國慶日補假

  // --- 2027 年 ---
  '2027-01-01', // 元旦
  '2027-02-04', '2027-02-05', '2027-02-08', '2027-02-09', '2027-02-10', '2027-02-11', '2027-02-12', // 春節
  '2027-03-01', // 和平紀念日補假
  '2027-04-02', '2027-04-05', // 兒童節與清明節
  '2027-04-30', // 勞動節補假
  '2027-06-09', // 端午節
  '2027-09-15', // 中秋節
  '2027-10-11', // 國慶日補假

  // --- 2028 年 ---
  '2028-01-25', '2028-01-26', '2028-01-27', '2028-01-28', '2028-01-31', '2028-02-01', '2028-02-02', // 春節
  '2028-02-28', // 和平紀念日
  '2028-04-03', '2028-04-04', // 兒童節與清明節
  '2028-05-01', // 勞動節
  '2028-05-29', // 端午節
  '2028-10-03', // 中秋節
  '2028-10-10', // 國慶日

  // --- 2029 年 ---
  '2029-01-01', // 元旦
  '2029-02-12', '2029-02-13', '2029-02-14', '2029-02-15', '2029-02-16', // 春節
  '2029-02-28', // 和平紀念日
  '2029-04-04', '2029-04-05', // 兒童節與清明節
  '2029-05-01', // 勞動節
  '2029-06-18', // 端午節
  '2029-09-21', // 中秋節
  '2029-10-10', // 國慶日

  // --- 2030 年 ---
  '2030-01-01', // 元旦
  '2030-02-01', '2030-02-04', '2030-02-05', '2030-02-06', '2030-02-07', '2030-02-08', // 春節
  '2030-02-28', // 和平紀念日
  '2030-04-04', '2030-04-05', // 兒童節與清明節
  '2030-05-01', // 勞動節
  '2030-06-05', // 端午節
  '2030-09-12', // 中秋節
  '2030-10-10', // 國慶日
]);

/**
 * 美股 (NYSE / NASDAQ / SIFMA) 法定證券市場休市日曆表 (2023 ~ 2030)
 * 包含：元旦、馬丁路德金紀念日、華盛頓誕辰、耶穌受難日、陣亡將士紀念日、六月節、獨立日、勞動節、感恩節、聖誕節。
 */
export const US_MARKET_HOLIDAYS: ReadonlySet<string> = new Set<string>([
  // --- 2023 年 ---
  '2023-01-02', // New Year's Day (Observed)
  '2023-01-16', // Martin Luther King Jr. Day
  '2023-02-20', // Washington's Birthday (Presidents' Day)
  '2023-04-07', // Good Friday
  '2023-05-29', // Memorial Day
  '2023-06-19', // Juneteenth National Independence Day
  '2023-07-04', // Independence Day
  '2023-09-04', // Labor Day
  '2023-11-23', // Thanksgiving Day
  '2023-12-25', // Christmas Day

  // --- 2024 年 ---
  '2024-01-01', // New Year's Day
  '2024-01-15', // Martin Luther King Jr. Day
  '2024-02-19', // Washington's Birthday
  '2024-03-29', // Good Friday
  '2024-05-27', // Memorial Day
  '2024-06-19', // Juneteenth
  '2024-07-04', // Independence Day
  '2024-09-02', // Labor Day
  '2024-11-28', // Thanksgiving Day
  '2024-12-25', // Christmas Day

  // --- 2025 年 ---
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Washington's Birthday
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving Day
  '2025-12-25', // Christmas Day

  // --- 2026 年 ---
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Washington's Birthday
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (Observed)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving Day
  '2026-12-25', // Christmas Day

  // --- 2027 年 ---
  '2027-01-01', // New Year's Day
  '2027-01-18', // MLK Day
  '2027-02-15', // Washington's Birthday
  '2027-03-26', // Good Friday
  '2027-05-31', // Memorial Day
  '2027-06-18', // Juneteenth (Observed)
  '2027-07-05', // Independence Day (Observed)
  '2027-09-06', // Labor Day
  '2027-11-25', // Thanksgiving Day
  '2027-12-24', // Christmas Day (Observed)

  // --- 2028 年 ---
  '2028-01-17', // MLK Day
  '2028-02-21', // Washington's Birthday
  '2028-04-14', // Good Friday
  '2028-05-29', // Memorial Day
  '2028-06-19', // Juneteenth
  '2028-07-04', // Independence Day
  '2028-09-04', // Labor Day
  '2028-11-23', // Thanksgiving Day
  '2028-12-25', // Christmas Day

  // --- 2029 年 ---
  '2029-01-01', // New Year's Day
  '2029-01-15', // MLK Day
  '2029-02-19', // Washington's Birthday
  '2029-03-30', // Good Friday
  '2029-05-28', // Memorial Day
  '2029-06-19', // Juneteenth
  '2029-07-04', // Independence Day
  '2029-09-03', // Labor Day
  '2029-11-22', // Thanksgiving Day
  '2029-12-25', // Christmas Day

  // --- 2030 年 ---
  '2030-01-01', // New Year's Day
  '2030-01-21', // MLK Day
  '2030-02-18', // Washington's Birthday
  '2030-04-19', // Good Friday
  '2030-05-27', // Memorial Day
  '2030-06-19', // Juneteenth
  '2030-07-04', // Independence Day
  '2030-09-02', // Labor Day
  '2030-11-28', // Thanksgiving Day
  '2030-12-25', // Christmas Day
]);

/**
 * 檢查給定日期 (YYYY-MM-DD) 是否為特定市場之法定休市日 (不含週末)
 */
export function isMarketHoliday(dateStr: string, market: MarketType = 'TW'): boolean {
  if (!dateStr || dateStr.length !== 10) return false;
  const holidays = market === 'US' ? US_MARKET_HOLIDAYS : TW_MARKET_HOLIDAYS;
  return holidays.has(dateStr);
}

/**
 * 檢查給定日期是否為特定市場之有效營業日 (非週末 且 非法定休市日)
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
 * 取得給定日期之後的下一個有效營業日
 * @param dateStr 基準日期 YYYY-MM-DD
 * @param market 市場類別 TW | US
 */
export function getNextBusinessDay(dateStr: string, market: MarketType = 'TW'): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));

  if (isNaN(d.getTime())) return dateStr;

  // 往後尋找下一個營業日
  while (true) {
    d.setUTCDate(d.getUTCDate() + 1);
    const currentDateStr = d.toISOString().split('T')[0];
    if (isBusinessDay(currentDateStr, market)) {
      return currentDateStr;
    }
  }
}
