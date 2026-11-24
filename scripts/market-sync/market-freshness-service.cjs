/**
 * market-freshness-service.cjs
 * 市場交易日結算錨定與資料庫陳舊度評估領域服務 (Spec 0161 / Spec 0239 T02)
 * 解耦中介層依戀，提供獨立純粹的市場新鮮度計算
 */

const {
  MARKET_HEALTH_THRESHOLDS,
  HISTORICAL_MARKET_HEALTH_THRESHOLDS,
  MARKET_SETTLEMENT_CUTOFFS,
} = require('./sync-thresholds.cjs');
const { isTradingDay, getLatestTdccPublishDate } = require('./trading-calendar-engine.cjs');

/**
 * 透過 Intl.DateTimeFormat 解析指定 IANA 時區日期時間分量（自動處理夏冬令 DST，強制 hourCycle: 'h23'）
 * @param {Date} date
 * @param {string} timeZone
 */
function getTimeZoneParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay(); // 0=Sun..6=Sat
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    year,
    month,
    day,
    dayOfWeek,
    hour,
    minute,
    totalMins: hour * 60 + minute,
    utcDate,
    ymd,
  };
}

function formatUtcYMD(utcDate) {
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isMarketTradingDate(utcDate, market) {
  return isTradingDay(formatUtcYMD(utcDate), market);
}

/**
 * 計算指定市場當前已結算之錨定交易日（支援 America/New_York DST 與法定休市日跳過）
 * @param {'TW' | 'US'} [market='TW'] 市場代碼
 * @param {Date} [now=new Date()] 基準時間
 * @returns {string} 格式為 YYYY-MM-DD
 */
function getMarketAnchorDate(market = 'TW', now = new Date()) {
  const timeZone = market === 'US' ? 'America/New_York' : 'Asia/Taipei';
  const settleThresholdMins =
    market === 'US'
      ? MARKET_SETTLEMENT_CUTOFFS.US_SETTLE_MINUTES
      : MARKET_SETTLEMENT_CUTOFFS.TW_SETTLE_MINUTES;
  const tz = getTimeZoneParts(now, timeZone);

  // 若當日為有效交易日且已過盤後結算門檻，錨定當日
  if (isMarketTradingDate(tz.utcDate, market) && tz.totalMins >= settleThresholdMins) {
    return tz.ymd;
  }

  // 否則往回尋找最近一個有效交易日（自動跳過週末與法定休市日）
  const cursor = new Date(tz.utcDate.getTime());
  for (let i = 0; i < 30; i++) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (isMarketTradingDate(cursor, market)) {
      return formatUtcYMD(cursor);
    }
  }
  return formatUtcYMD(cursor);
}

/**
 * 計算指定時間點當前最新已結算之 TDCC 週五基準日 (每週五 21:00 結算)
 * @param {Date} [now=new Date()] 基準時間
 * @returns {string} 格式為 YYYY-MM-DD
 */
function getLatestSettledTdccFriday(now = new Date()) {
  const tz = getTimeZoneParts(now, 'Asia/Taipei');
  const day = tz.dayOfWeek; // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const target = new Date(tz.utcDate.getTime());

  if (day === 5) {
    if (tz.totalMins >= 21 * 60) {
      return tz.ymd;
    }
    target.setUTCDate(target.getUTCDate() - 7);
    return formatUtcYMD(target);
  }

  const daysToFriday = (day + 7 - 5) % 7;
  target.setUTCDate(target.getUTCDate() - daysToFriday);
  return formatUtcYMD(target);
}



/**
 * 計算指定時間點當前最新已結算申報之月營收月份 (每月 10 日 17:30 截止申報)
 * @param {Date} [now=new Date()] 基準時間
 * @returns {string} 格式為 YYYY-MM
 */
function getLatestSettledRevenueMonth(now = new Date()) {
  const tz = getTimeZoneParts(now, 'Asia/Taipei');
  const dayOfMonth = tz.day;

  const isPastDeadline = dayOfMonth > 10 || (dayOfMonth === 10 && tz.totalMins >= 17 * 60 + 30);
  const monthsOffset = isPastDeadline ? 1 : 2;

  let year = tz.year;
  let month = tz.month - monthsOffset; // 1-indexed

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
  let twChipsCount = null;
  let usLatest = null;
  let tdccLatest = null;
  let revenueLatest = null;

  try {
    const twMaxRow = db
      .prepare("SELECT MAX(date) as maxDate FROM daily_candles WHERE symbol = '0050' OR symbol = '2330'")
      .get();
    twLatest = twMaxRow?.maxDate || null;
    if (twLatest) {
      try {
        const countRow = db.prepare("SELECT COUNT(*) as count FROM tw_institutional_chips WHERE date = ?").get(twLatest);
        twChipsCount = countRow?.count != null ? Number(countRow.count) : null;
      } catch {
        twChipsCount = null;
      }
    }
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

  // Spec 0241 Ticket 02: 最近 5 個台股已結算交易日 7 維欄位覆蓋率與 etf_daily_nav 探針
  const incompleteDatesSet = new Set();
  const missingPlanesSet = new Set();

  if (twLatest) {
    try {
      const recentRows = db
        .prepare("SELECT DISTINCT date FROM daily_candles WHERE symbol IN ('0050','2330') ORDER BY date DESC LIMIT 5")
        .all();
      const recentDates = Array.isArray(recentRows) ? recentRows.map((r) => r?.date).filter(Boolean) : [];

      for (const d of recentDates) {
        const chipCov = db
          .prepare(`
            SELECT
              COUNT(CASE WHEN margin_balance IS NOT NULL THEN 1 END) AS marginCount,
              COUNT(CASE WHEN sbl_balance IS NOT NULL THEN 1 END) AS sblCount,
              COUNT(CASE WHEN day_trade_rate IS NOT NULL THEN 1 END) AS dayTradeCount
            FROM tw_institutional_chips
            WHERE date = ?
          `)
          .get(d);
        const valCov = db
          .prepare('SELECT COUNT(*) AS count FROM tw_valuation_daily WHERE date = ?')
          .get(d);

        const marginCount = Number(chipCov?.marginCount ?? 0);
        const sblCount = Number(chipCov?.sblCount ?? 0);
        const dayTradeCount = Number(chipCov?.dayTradeCount ?? 0);
        const valCount = Number(valCov?.count ?? 0);

        const isLatestDate = d === twLatest;
        const marginMin = isLatestDate
          ? MARKET_HEALTH_THRESHOLDS.MARGIN_COUNT_MIN
          : HISTORICAL_MARKET_HEALTH_THRESHOLDS.TWSE_MARGIN_COUNT_MIN;
        const valuationMin = isLatestDate
          ? MARKET_HEALTH_THRESHOLDS.VALUATION_COUNT_MIN
          : HISTORICAL_MARKET_HEALTH_THRESHOLDS.TWSE_VALUATION_COUNT_MIN;

        let dayIncomplete = false;
        if (marginCount < marginMin) {
          missingPlanesSet.add('margin');
          dayIncomplete = true;
        }
        if (sblCount < MARKET_HEALTH_THRESHOLDS.SBL_COUNT_MIN) {
          missingPlanesSet.add('sbl');
          dayIncomplete = true;
        }
        if (dayTradeCount < MARKET_HEALTH_THRESHOLDS.DAY_TRADE_COUNT_MIN) {
          missingPlanesSet.add('day_trade');
          dayIncomplete = true;
        }
        if (valCount < valuationMin) {
          missingPlanesSet.add('valuation');
          dayIncomplete = true;
        }
        if (dayIncomplete) {
          incompleteDatesSet.add(d);
        }
      }

      // 最新結算日檢查 etf_daily_nav 門檻
      const etfNavCov = db
        .prepare('SELECT COUNT(*) AS count FROM etf_daily_nav WHERE date = ?')
        .get(twLatest);
      if (etfNavCov && Number(etfNavCov.count) < MARKET_HEALTH_THRESHOLDS.ETF_NAV_COUNT_MIN) {
        missingPlanesSet.add('etf_nav');
        incompleteDatesSet.add(twLatest);
      }
    } catch {
      // 容錯降級：舊版 Mock DB 若未實作 .all() 或缺表時不中斷既有邏輯
    }
  }

  const incompleteDates = Array.from(incompleteDatesSet);
  const missingPlanes = Array.from(missingPlanesSet);

  // Spec 0218 Ticket 02 (#435) & Spec 0239 T02:
  // 空庫 (twLatest === null / usLatest === null) 必須判定 isStale = true 觸發首次同步；
  // 若日 K 最新但三大法人有效記錄數未達門檻 (< 1800)，或近 5 日存在半殘日，亦標記 isStale = true
  const isTwStale = Boolean(
    !twLatest ||
    twLatest < twAnchor ||
    (twChipsCount !== null && twChipsCount < MARKET_HEALTH_THRESHOLDS.FRESHNESS_CHIPS_COUNT_MIN) ||
    incompleteDates.length > 0
  );
  const isUsStale = Boolean(!usLatest || usLatest < usAnchor);
  // Spec 0246 Ticket 01: 空表 (null) 必判陳舊，確保全新部署 NAS 會觸發首次週集保與月營收建庫
  const isTdccStale = Boolean(!tdccLatest || tdccLatest < tdccAnchor);
  const isRevenueStale = Boolean(!revenueLatest || revenueLatest < revenueAnchor);

  return {
    tw: {
      latestDate: twLatest,
      anchorDate: twAnchor,
      isStale: isTwStale,
      chipsCount: twChipsCount,
      incompleteDates,
      missingPlanes,
    },
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

