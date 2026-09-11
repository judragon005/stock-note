import { fetchWithCORSProxy } from './priceFetcher';
import { dbGet, dbPut } from '../utils/db';

export interface TwseInstitutionalRow {
  symbol: string;
  name: string;
  foreignBuyShares: number;  // 張數
  foreignSellShares: number; // 張數
  foreignNetShares: number;  // 張數
  trustBuyShares: number;    // 張數
  trustSellShares: number;   // 張數
  trustNetShares: number;    // 張數
  dealerNetShares: number;   // 張數
  totalNetShares: number;    // 張數
}

const parseNumber = (val: any): number => {
  if (!val) return 0;
  const clean = String(val).replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

/**
 * 解析 TWSE 官方 T86 三大法人買賣超日報
 * 將官方股數轉化為張數 (1 張 = 1,000 股)
 */
export function parseTwseT86Report(rawData: any): Record<string, TwseInstitutionalRow> {
  const result: Record<string, TwseInstitutionalRow> = {};
  if (!rawData || rawData.stat !== 'OK' || !Array.isArray(rawData.data)) {
    return result;
  }

  for (const row of rawData.data) {
    if (!Array.isArray(row) || row.length < 12) continue;

    const symbol = String(row[0]).trim();
    const name = String(row[1]).trim();

    // 換算股數至張數
    const foreignBuyShares = Math.round(parseNumber(row[2]) / 1000);
    const foreignSellShares = Math.round(parseNumber(row[3]) / 1000);
    const foreignNetShares = Math.round(parseNumber(row[4]) / 1000);

    const trustBuyShares = Math.round(parseNumber(row[8]) / 1000);
    const trustSellShares = Math.round(parseNumber(row[9]) / 1000);
    const trustNetShares = Math.round(parseNumber(row[10]) / 1000);

    const dealerNetShares = Math.round(parseNumber(row[11]) / 1000);
    const totalNetShares = foreignNetShares + trustNetShares + dealerNetShares;

    result[symbol] = {
      symbol,
      name,
      foreignBuyShares,
      foreignSellShares,
      foreignNetShares,
      trustBuyShares,
      trustSellShares,
      trustNetShares,
      dealerNetShares,
      totalNetShares,
    };
  }

  return result;
}

/**
 * 取得最新可能的交易日日期字串 (YYYYMMDD)
 * 考量每日 15:00 盤後公告與週末跳轉
 */
export function getLatestTradingDateString(referenceDate: Date = new Date()): string {
  // 轉為台北時區 (UTC+8)
  const twOffset = 8 * 60; // 分鐘
  const localOffset = referenceDate.getTimezoneOffset(); // 本地與 UTC 差值 (分鐘)
  const twTime = new Date(referenceDate.getTime() + (twOffset + localOffset) * 60 * 1000);

  let target = new Date(twTime);

  // 若當日小於 15:30，則當日盤後資料尚未公佈，往前推一日
  const totalMinutes = target.getHours() * 60 + target.getMinutes();
  if (totalMinutes < 15 * 60 + 30) {
    target.setDate(target.getDate() - 1);
  }

  // 避開週末 (週日 0, 週六 6)
  const day = target.getDay();
  if (day === 0) {
    // 週日退 2 天到週五
    target.setDate(target.getDate() - 2);
  } else if (day === 6) {
    // 週六退 1 天到週五
    target.setDate(target.getDate() - 1);
  }

  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * 往前推算前一個交易日
 */
export function getPreviousTradingDateString(dateStr: string): string {
  const y = parseInt(dateStr.substring(0, 4), 10);
  const m = parseInt(dateStr.substring(4, 6), 10) - 1;
  const d = parseInt(dateStr.substring(6, 8), 10);

  const cur = new Date(y, m, d);
  cur.setDate(cur.getDate() - 1);

  // 若遇到週末繼續往回推
  while (cur.getDay() === 0 || cur.getDay() === 6) {
    cur.setDate(cur.getDate() - 1);
  }

  const yyyy = cur.getFullYear();
  const mm = String(cur.getMonth() + 1).padStart(2, '0');
  const dd = targetToTwoDigits(cur.getDate());
  return `${yyyy}${mm}${dd}`;
}

const targetToTwoDigits = (num: number) => String(num).padStart(2, '0');

/**
 * 依基準日向前推算產生連續 N 個真實交易日之升冪字串陣列 (供時序回放軸與歷史映射)
 */
export function getRecentTradingDateSequence(endDateStr: string, count = 5): string[] {
  const dates: string[] = [];
  let cur = endDateStr;
  for (let i = 0; i < count; i++) {
    dates.push(cur);
    cur = getPreviousTradingDateString(cur);
  }
  return dates.reverse();
}

/**
 * 將 YYYYMMDD 西元日期字串轉換為民國年日期字串 (如 20260904 -> 115/09/04)
 */
export function toRocDateString(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return '';
  const y = parseInt(dateStr.substring(0, 4), 10) - 1911;
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  return `${y}/${m}/${d}`;
}

/**
 * 解析 TPEx 櫃買中心官方三大法人買賣超日報
 * 將上櫃股票股數轉換為張數 (1 張 = 1,000 股)，解決 8299 群聯等上櫃標的數據為 0 之痛點
 * 支援 TPEx 最新 24 欄位格式 (含外資合計、投信、自營商合計) 與 tables[0].data 結構，並向下相容 12 欄簡化格式
 */
export function parseTpexInstitutionalReport(rawData: any): Record<string, TwseInstitutionalRow> {
  const result: Record<string, TwseInstitutionalRow> = {};
  if (!rawData) return result;

  // 相容 tables[0].data (官方標準回傳)、data 以及 aaData
  const rows = rawData.tables?.[0]?.data || rawData.data || rawData.aaData;
  if (!Array.isArray(rows)) return result;

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 8) continue;

    const symbol = String(row[0]).trim();
    const name = String(row[1]).trim();

    let foreignBuyShares = 0;
    let foreignSellShares = 0;
    let foreignNetShares = 0;
    let trustBuyShares = 0;
    let trustSellShares = 0;
    let trustNetShares = 0;
    let dealerNetShares = 0;
    let totalNetShares = 0;

    if (row.length >= 24) {
      // 官方標準 24 欄格式
      // 外資及陸資合計：買進(8), 賣出(9), 買賣超(10)
      foreignBuyShares = Math.round(parseNumber(row[8]) / 1000);
      foreignSellShares = Math.round(parseNumber(row[9]) / 1000);
      foreignNetShares = Math.round(parseNumber(row[10]) / 1000);

      // 投信：買進(11), 賣出(12), 買賣超(13)
      trustBuyShares = Math.round(parseNumber(row[11]) / 1000);
      trustSellShares = Math.round(parseNumber(row[12]) / 1000);
      trustNetShares = Math.round(parseNumber(row[13]) / 1000);

      // 自營商合計：買賣超(22)
      dealerNetShares = Math.round(parseNumber(row[22]) / 1000);

      // 三大法人合計買賣超(23)
      totalNetShares = row[23] !== undefined ? Math.round(parseNumber(row[23]) / 1000) : (foreignNetShares + trustNetShares + dealerNetShares);
    } else {
      // 簡化或舊版相容格式
      foreignBuyShares = Math.round(parseNumber(row[2]) / 1000);
      foreignSellShares = Math.round(parseNumber(row[3]) / 1000);
      foreignNetShares = Math.round(parseNumber(row[4]) / 1000);

      trustBuyShares = Math.round(parseNumber(row[5]) / 1000);
      trustSellShares = Math.round(parseNumber(row[6]) / 1000);
      trustNetShares = Math.round(parseNumber(row[7]) / 1000);

      dealerNetShares = Math.round(parseNumber(row[10] || row[8] || 0) / 1000);
      totalNetShares = row[11] !== undefined ? Math.round(parseNumber(row[11]) / 1000) : (foreignNetShares + trustNetShares + dealerNetShares);
    }

    result[symbol] = {
      symbol,
      name,
      foreignBuyShares,
      foreignSellShares,
      foreignNetShares,
      trustBuyShares,
      trustSellShares,
      trustNetShares,
      dealerNetShares,
      totalNetShares,
    };
  }

  return result;
}

const CACHE_KEY_PREFIX = 'TWSE_TPEX_CHIPS_V4_';

/**
 * 驗證籌碼資料是否涵蓋上市（以 2330 台積電為健康指標哨兵）
 */
function isMarketCoverageValid(data: Record<string, TwseInstitutionalRow> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  // 若包含 2330 台積電，證明上市資料成功納入；若無 2330 則可能是純上櫃殘缺快取
  return Boolean(data['2330']);
}

/**
 * 雙軌並行抓取臺灣證交所 (TWSE) 與 櫃檯買賣中心 (TPEx) 三大法人日報並合併
 */
async function fetchCombinedTwseAndTpex(
  dateStr: string,
  customFetch: (url: string, timeoutMs?: number) => Promise<any>
): Promise<Record<string, TwseInstitutionalRow>> {
  const twseUrl = `https://www.twse.com.tw/rwd/zh/fund/T86?response=json&date=${dateStr}&selectType=ALLBUT0999`;
  const rocDate = toRocDateString(dateStr);
  const tpexUrl = `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&o=json&se=EW&t=D&d=${rocDate}`;

  const [twseRes, tpexRes] = await Promise.allSettled([
    customFetch(twseUrl, 6000),
    customFetch(tpexUrl, 6000),
  ]);

  const twseData = twseRes.status === 'fulfilled' ? parseTwseT86Report(twseRes.value) : {};
  const tpexData = tpexRes.status === 'fulfilled' ? parseTpexInstitutionalReport(tpexRes.value) : {};

  return { ...twseData, ...tpexData };
}

export interface InstitutionalReportResult {
  reportDate: string;        // 確切資料日期 (YYYYMMDD)
  isLiveToday: boolean;       // 是否為今日盤後最新數據
  data: Record<string, TwseInstitutionalRow>;
  totalSymbols: number;       // 涵蓋標的總檔數
}

/**
 * 抓取台灣全市場三大法人日報，支援自動往前重試、IndexedDB 本地歷史快取回溯與詳細狀態封裝 (Spec 0117 Ticket 01)
 */
export async function fetchTwseInstitutionalReportDetailed(
  initialDateStr?: string,
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy,
  maxDaysBack = 5,
  forceRefresh = false
): Promise<InstitutionalReportResult> {
  const latestPossibleDate = getLatestTradingDateString();
  let currentDate = initialDateStr || latestPossibleDate;

  // 判定是否可能為今日盤後 (僅當 latestPossibleDate 為當日且請求目標亦為最新時)
  const isLiveToday = currentDate === latestPossibleDate;

  // 1. 優先嘗試讀取當前目標日期快取 (若 forceRefresh 為 true 則略過)
  if (!forceRefresh) {
    try {
      const cached = await dbGet<any>('settings', `${CACHE_KEY_PREFIX}${currentDate}`);
      if (cached && cached.data && isMarketCoverageValid(cached.data)) {
        return {
          reportDate: currentDate,
          isLiveToday,
          data: cached.data,
          totalSymbols: Object.keys(cached.data).length,
        };
      }
    } catch {
      // 快取讀取失敗則繼續線上請求
    }
  }

  let attempts = 0;
  while (attempts < maxDaysBack) {
    attempts++;
    // 若非首日且未要求強制重整，先嘗試讀取該歷史日之本地快取
    if (attempts > 1 && !forceRefresh) {
      try {
        const cached = await dbGet<any>('settings', `${CACHE_KEY_PREFIX}${currentDate}`);
        if (cached && cached.data && isMarketCoverageValid(cached.data)) {
          return {
            reportDate: currentDate,
            isLiveToday: false,
            data: cached.data,
            totalSymbols: Object.keys(cached.data).length,
          };
        }
      } catch {
        // 忽略快取錯誤
      }
    }

    try {
      const combined = await fetchCombinedTwseAndTpex(currentDate, customFetch);

      if (Object.keys(combined).length > 0) {
        // 請求成功，寫入快取
        try {
          await dbPut('settings', {
            key: `${CACHE_KEY_PREFIX}${currentDate}`,
            date: currentDate,
            data: combined,
            updatedAt: Date.now(),
          });
        } catch {
          // 快取寫入失敗不阻擋主流程
        }
        return {
          reportDate: currentDate,
          isLiveToday: currentDate === latestPossibleDate,
          data: combined,
          totalSymbols: Object.keys(combined).length,
        };
      }
    } catch {
      // 請求失敗，繼續嘗試上一交易日
    }

    currentDate = getPreviousTradingDateString(currentDate);
  }

  // 3. 兜底保障：若嘗試多日線上抓取均失敗，主動向歷史回溯檢索最近 10 個交易日中已有之有效快取 (Last Known Good)
  let fallbackCursor = latestPossibleDate;
  for (let i = 0; i < 10; i++) {
    try {
      const fallbackCached = await dbGet<any>('settings', `${CACHE_KEY_PREFIX}${fallbackCursor}`);
      if (fallbackCached && fallbackCached.data && isMarketCoverageValid(fallbackCached.data)) {
        return {
          reportDate: fallbackCursor,
          isLiveToday: false,
          data: fallbackCached.data,
          totalSymbols: Object.keys(fallbackCached.data).length,
        };
      }
    } catch {
      // 忽略
    }
    fallbackCursor = getPreviousTradingDateString(fallbackCursor);
  }

  // 最終完全查無資料時回傳空結構
  return {
    reportDate: currentDate,
    isLiveToday: false,
    data: {},
    totalSymbols: 0,
  };
}

/**
 * 抓取台灣全市場（上市 TWSE + 上櫃 TPEx）三大法人日報 (向下相容純字典介面)
 */
export async function fetchTwseInstitutionalReport(
  initialDateStr?: string,
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy,
  maxDaysBack = 5,
  forceRefresh = false
): Promise<Record<string, TwseInstitutionalRow>> {
  const result = await fetchTwseInstitutionalReportDetailed(
    initialDateStr,
    customFetch,
    maxDaysBack,
    forceRefresh
  );
  return result.data;
}

/**
 * 增量獲取並持久化快取最近 N 個交易日之 TWSE + TPEx 全市場法人日報
 * 以時間換資料：若本地已有快取則直接命中，若缺失則發起增量雙軌拉取並寫入 IndexedDB
 */
export async function fetchRecentTwseReports(
  daysCount = 5,
  initialDateStr?: string,
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy
): Promise<{ date: string; data: Record<string, TwseInstitutionalRow> }[]> {
  const results: { date: string; data: Record<string, TwseInstitutionalRow> }[] = [];
  let currentDate = initialDateStr || getLatestTradingDateString();

  let foundDays = 0;
  let attempts = 0;
  const maxAttempts = daysCount * 3; // 預防連續非交易日

  while (foundDays < daysCount && attempts < maxAttempts) {
    attempts++;
    // 優先讀取快取
    let dayData: Record<string, TwseInstitutionalRow> | null = null;
    try {
      const cached = await dbGet<any>('settings', `${CACHE_KEY_PREFIX}${currentDate}`);
      if (cached && cached.data && isMarketCoverageValid(cached.data)) {
        dayData = cached.data;
      }
    } catch {
      // 忽視快取錯誤
    }

    if (!dayData) {
      // 線上增量拉取 (上市 + 上櫃合併)
      try {
        const combined = await fetchCombinedTwseAndTpex(currentDate, customFetch);
        if (Object.keys(combined).length > 0) {
          dayData = combined;
          try {
            await dbPut('settings', {
              key: `${CACHE_KEY_PREFIX}${currentDate}`,
              date: currentDate,
              data: combined,
              updatedAt: Date.now(),
            });
          } catch {
            // 快取寫入失敗不阻擋主流程
          }
        }
      } catch {
        // 請求失敗
      }
    }

    if (dayData && Object.keys(dayData).length > 0) {
      results.push({ date: currentDate, data: dayData });
      foundDays++;
    }

    currentDate = getPreviousTradingDateString(currentDate);
  }

  // 按日期由舊到新排序 (供時序播放器時序推進)
  return results.reverse();
}

