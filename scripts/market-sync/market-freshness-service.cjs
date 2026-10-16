/**
 * market-freshness-service.cjs
 * 市場交易日結算錨定與資料庫陳舊度評估領域服務 (Spec 0161)
 * 解耦中介層依戀，提供獨立純粹的市場新鮮度計算
 */

/**
 * 計算指定市場當前已結算之錨定交易日
 * @param {'TW' | 'US'} [market='TW'] 市場代碼
 * @param {Date} [now=new Date()] 基準時間
 * @returns {string} 格式為 YYYY-MM-DD
 */
function getMarketAnchorDate(market = 'TW', now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // 台股 UTC+8，美股夏令時間 UTC-4
  const offsetHours = market === 'TW' ? 8 : -4;
  const local = new Date(utc + 3600000 * offsetHours);
  const day = local.getDay();
  const hours = local.getHours();
  const minutes = local.getMinutes();
  const totalMins = hours * 60 + minutes;

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  const isWeekend = day === 0 || day === 6;

  if (market === 'TW') {
    // 台股 15:00 盤後定錨結算
    if (!isWeekend && totalMins >= 15 * 60) {
      return formatDate(local);
    }
    const target = new Date(local);
    if (day === 0) target.setDate(target.getDate() - 2); // 週日退至週五
    else if (day === 6) target.setDate(target.getDate() - 1); // 週六退至週五
    else if (day === 1) target.setDate(target.getDate() - 3); // 週一盤前/盤中退至上週五 (Spec 0165)
    else target.setDate(target.getDate() - 1); // 其餘平日退至前一交易日
    return formatDate(target);
  } else {
    // 美股 17:00 盤後定錨結算
    if (!isWeekend && totalMins >= 17 * 60) {
      return formatDate(local);
    }
    const target = new Date(local);
    if (day === 0) target.setDate(target.getDate() - 2);
    else if (day === 6) target.setDate(target.getDate() - 1);
    else if (day === 1) target.setDate(target.getDate() - 3); // 週一盤前/盤中退至上週五 (Spec 0165)
    else target.setDate(target.getDate() - 1);
    return formatDate(target);
  }
}


const { getLatestTdccPublishDate } = require('./trading-calendar-engine.cjs');

/**
 * 計算指定時間點當前最新已結算之 TDCC 週五基準日 (每週五 21:00 結算)
 * @param {Date} [now=new Date()] 基準時間
 * @returns {string} 格式為 YYYY-MM-DD
 */
function getLatestSettledTdccFriday(now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + 3600000 * 8); // 台北時間 UTC+8
  const day = local.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const hours = local.getHours();
  const minutes = local.getMinutes();
  const totalMins = hours * 60 + minutes;

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  const target = new Date(local);
  if (day === 5) {
    if (totalMins >= 21 * 60) {
      return formatDate(local);
    } else {
      target.setDate(target.getDate() - 7);
      return formatDate(target);
    }
  }

  const daysToFriday = (day + 7 - 5) % 7;
  target.setDate(target.getDate() - daysToFriday);
  return formatDate(target);
}



/**
 * 計算指定時間點當前最新已結算申報之月營收月份 (每月 10 日 17:30 截止申報)
 * @param {Date} [now=new Date()] 基準時間
 * @returns {string} 格式為 YYYY-MM
 */
function getLatestSettledRevenueMonth(now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + 3600000 * 8); // 台北時間 UTC+8
  const dayOfMonth = local.getDate();
  const hours = local.getHours();
  const minutes = local.getMinutes();
  const totalMins = hours * 60 + minutes;

  const isPastDeadline = dayOfMonth > 10 || (dayOfMonth === 10 && totalMins >= (17 * 60 + 30));
  const monthsOffset = isPastDeadline ? 1 : 2;

  let year = local.getFullYear();
  let month = local.getMonth() + 1 - monthsOffset; // 1-indexed

  while (month <= 0) {
    month += 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * 檢查資料庫中台美股市場資料新鮮度與陳舊狀態 (含日K、TDCC 集保與月營收)
 * @param {object} db SQLite 資料庫連線實例
 * @param {Date} [now=new Date()] 基準時間
 * @returns {{
 *   tw: { latestDate: string | null, anchorDate: string, isStale: boolean },
 *   us: { latestDate: string | null, anchorDate: string, isStale: boolean },
 *   tdcc: { latestDate: string | null, anchorDate: string, isStale: boolean },
 *   revenue: { latestMonth: string | null, anchorMonth: string, isStale: boolean }
 * }}
 */
function checkMarketFreshness(db, now = new Date()) {
  let twLatest = null;
  let usLatest = null;
  let tdccLatest = null;
  let revenueLatest = null;

  try {
    const twMaxRow = db
      .prepare("SELECT MAX(date) as maxDate FROM daily_candles WHERE symbol = '0050' OR symbol = '2330'")
      .get();
    twLatest = twMaxRow?.maxDate || null;
  } catch {
    twLatest = null;
  }

  try {
    const usMaxRow = db
      .prepare("SELECT MAX(date) as maxDate FROM daily_candles WHERE symbol = 'SPY' OR symbol = 'VOO' OR symbol = 'NVDA'")
      .get();
    usLatest = usMaxRow?.maxDate || null;
  } catch {
    usLatest = null;
  }

  try {
    const tdccMaxRow = db
      .prepare("SELECT MAX(date) as maxDate FROM tw_tdcc_distribution")
      .get();
    tdccLatest = tdccMaxRow?.maxDate || null;
  } catch {
    tdccLatest = null;
  }

  try {
    const revMaxRow = db
      .prepare("SELECT MAX(year_month) as maxMonth FROM tw_monthly_revenue")
      .get();
    revenueLatest = revMaxRow?.maxMonth || revMaxRow?.maxDate || null;
  } catch {
    revenueLatest = null;
  }

  const twAnchor = getMarketAnchorDate('TW', now);
  const usAnchor = getMarketAnchorDate('US', now);
  const tdccAnchor = getLatestSettledTdccFriday(now);
  const revenueAnchor = getLatestSettledRevenueMonth(now);

  const isTwStale = Boolean(twLatest && twLatest < twAnchor);
  const isUsStale = Boolean(usLatest && usLatest < usAnchor);
  const isTdccStale = Boolean(tdccLatest && tdccLatest < tdccAnchor);
  const isRevenueStale = Boolean(revenueLatest && revenueLatest < revenueAnchor);

  return {
    tw: { latestDate: twLatest, anchorDate: twAnchor, isStale: isTwStale },
    us: { latestDate: usLatest, anchorDate: usAnchor, isStale: isUsStale },
    tdcc: { latestDate: tdccLatest, anchorDate: tdccAnchor, isStale: isTdccStale },
    revenue: { latestMonth: revenueLatest, anchorMonth: revenueAnchor, isStale: isRevenueStale },
  };
}

module.exports = {
  getMarketAnchorDate,
  getLatestSettledTdccFriday,
  getLatestTdccPublishDate,
  getLatestSettledRevenueMonth,
  checkMarketFreshness,
};

