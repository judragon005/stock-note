import { fetchWithCORSProxy } from './priceFetcher';
import { dbGet, dbPut, getSymbolOhlcv, saveSymbolOhlcv } from '../utils/db';
import { parseYahooHistoricalCandlesResponse } from './historicalPriceFetcher';
import { computeChaikinMoneyFlow } from './smartMoneyEngine';
import { DailyCandle } from '../types/signal';

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
 * 具備指數退避之智慧重試抓取函數 (Spec 0120 Ticket 01)
 */
export async function fetchWithRetry<T = any>(
  fetcher: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 600
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (err: any) {
      lastError = err;
      if (err?.message?.includes('404')) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}


/**
 * 金融級雙市場雙哨兵：驗證籌碼資料是否涵蓋上市、上櫃完整深度與非全 0 主力交易量 (Spec 0119 / Spec 0120 Ticket 02)
 * 解決 15:30 證交所 API 釋出半殘日報 (如僅 894 檔或全 0 張) 或單邊市場成功誤判之重大缺陷
 */
export function isInstitutionalReportComplete(
  data: Record<string, TwseInstitutionalRow> | null | undefined,
  minSymbols?: number
): boolean {
  if (!data || typeof data !== 'object') return false;
  const symbols = Object.keys(data);
  if (symbols.length === 0) return false;

  // 1. 活躍交易量哨兵：前 50 大股票三大法人買賣超絕對值總和不得為 0
  let totalVolumeShares = 0;
  const checkCount = Math.min(symbols.length, 50);
  for (let i = 0; i < checkCount; i++) {
    const row = data[symbols[i]];
    if (row) {
      totalVolumeShares += Math.abs(row.foreignNetShares || 0) + Math.abs(row.trustNetShares || 0) + Math.abs(row.dealerNetShares || 0);
    }
  }
  // 若全部檢查標的買賣超全為 0，視為尚未公布結算數據之空日報
  if (totalVolumeShares === 0) return false;

  // 2. 自訂門檻檢驗 (供單元測試或特定市場子集驗證)：
  if (minSymbols !== undefined) {
    return symbols.length >= minSymbols;
  }

  // 3. 真實全市場深度與雙哨兵檢驗 (Spec 0120 Ticket 02):
  // 針對真實全市場環境 (檔數 >= 10)：
  if (symbols.length >= 10) {
    // 3.1 檔數深度門檻：若介於 10 至 1,199 檔之間 (例如僅抓到上櫃 894 檔)，視為分批上傳未齊之殘缺日報
    if (symbols.length < 1200) {
      return false;
    }
    // 3.2 雙市場雙哨兵：若含有真實市場代碼，則上市龍頭 2330 與上櫃龍頭 8299 必須同時存在，任一缺失視為單邊殘缺
    const hasTwseSentinel = Boolean(data['2330']);
    const hasTpexSentinel = Boolean(data['8299']);
    if ((hasTwseSentinel || hasTpexSentinel) && (!hasTwseSentinel || !hasTpexSentinel)) {
      return false;
    }
  }

  return true;
}

/**
 * 雙軌並行抓取臺灣證交所 (TWSE) 與 櫃檯買賣中心 (TPEx) 三大法人日報並以原子性合併 (Spec 0120 Ticket 01, Ticket 02)
 */
export async function fetchCombinedTwseAndTpex(
  dateStr: string,
  customFetch: (url: string, timeoutMs?: number) => Promise<any>
): Promise<Record<string, TwseInstitutionalRow>> {
  const twseUrl = `https://www.twse.com.tw/rwd/zh/fund/T86?response=json&date=${dateStr}&selectType=ALLBUT0999`;
  const rocDate = toRocDateString(dateStr);
  const tpexUrl = `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&o=json&se=EW&t=D&d=${rocDate}`;

  const [twseRes, tpexRes] = await Promise.allSettled([
    fetchWithRetry(() => customFetch(twseUrl, 6000), 2, 400),
    fetchWithRetry(() => customFetch(tpexUrl, 6000), 2, 400),
  ]);

  const twseData = twseRes.status === 'fulfilled' ? parseTwseT86Report(twseRes.value) : {};
  const tpexData = tpexRes.status === 'fulfilled' ? parseTpexInstitutionalReport(tpexRes.value) : {};

  // 原子性原則 (Spec 0120 Ticket 02):
  // 在真實市場規模下 (任一市場檔數 >= 10)，若另一市場為空，合流視為未完整，回傳空字典
  const twseCount = Object.keys(twseData).length;
  const tpexCount = Object.keys(tpexData).length;
  if ((twseCount >= 10 && tpexCount === 0) || (tpexCount >= 10 && twseCount === 0)) {
    return {};
  }

  return { ...twseData, ...tpexData };
}

export interface InstitutionalReportResult {
  reportDate: string;        // 確切資料日期 (YYYYMMDD)
  isLiveToday: boolean;       // 是否為今日盤後最新數據
  fallbackReason?: 'INCOMPLETE_DATA' | 'MARKET_NOT_READY';
  data: Record<string, TwseInstitutionalRow>;
  totalSymbols: number;       // 涵蓋標的總檔數
}

/**
 * 抓取台灣全市場三大法人日報，支援自動往前重試、IndexedDB 本地歷史快取回溯與詳細狀態封裝 (Spec 0117 Ticket 01 / Spec 0119 Ticket 01)
 */
export async function fetchTwseInstitutionalReportDetailed(
  initialDateStr?: string,
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy,
  maxDaysBack = 5,
  forceRefresh = false
): Promise<InstitutionalReportResult> {
  const latestPossibleDate = getLatestTradingDateString();
  const targetDate = initialDateStr || latestPossibleDate;
  let currentDate = targetDate;
  let hadIncompleteAttempt = false;

  // 1. 優先嘗試讀取當前目標日期快取 (若 forceRefresh 為 true 則略過)
  if (!forceRefresh) {
    try {
      const cached = await dbGet<any>('settings', `${CACHE_KEY_PREFIX}${currentDate}`);
      if (cached && cached.data && isInstitutionalReportComplete(cached.data)) {
        return {
          reportDate: currentDate,
          isLiveToday: currentDate === latestPossibleDate,
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
        if (cached && cached.data && isInstitutionalReportComplete(cached.data)) {
          return {
            reportDate: currentDate,
            isLiveToday: false,
            fallbackReason: hadIncompleteAttempt ? 'INCOMPLETE_DATA' : undefined,
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

      // Spec 0119 Ticket 01: 完整性哨兵檢驗
      if (isInstitutionalReportComplete(combined)) {
        // 請求成功且資料完整，寫入快取
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
          isLiveToday: currentDate === latestPossibleDate && !hadIncompleteAttempt,
          fallbackReason: hadIncompleteAttempt ? 'INCOMPLETE_DATA' : undefined,
          data: combined,
          totalSymbols: Object.keys(combined).length,
        };
      } else if (Object.keys(combined).length > 0) {
        // 抓回來的資料檔數不足 (如 894 檔) 或全為 0，標記未完成嘗試，絕不寫入快取污染系統
        hadIncompleteAttempt = true;
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
      if (fallbackCached && fallbackCached.data && isInstitutionalReportComplete(fallbackCached.data)) {
        return {
          reportDate: fallbackCursor,
          isLiveToday: false,
          fallbackReason: hadIncompleteAttempt ? 'INCOMPLETE_DATA' : undefined,
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
    fallbackReason: hadIncompleteAttempt ? 'INCOMPLETE_DATA' : undefined,
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
    // 優先讀取快取 (Spec 0120 Ticket 04: 採用金融級雙哨兵檢驗，自動洗滌舊版殘缺快取)
    let dayData: Record<string, TwseInstitutionalRow> | null = null;
    try {
      const cached = await dbGet<any>('settings', `${CACHE_KEY_PREFIX}${currentDate}`);
      if (cached && cached.data && isInstitutionalReportComplete(cached.data)) {
        dayData = cached.data;
      }
    } catch {
      // 忽視快取錯誤
    }

    if (!dayData) {
      // 線上增量拉取 (上市 + 上櫃原子合併)
      try {
        const combined = await fetchCombinedTwseAndTpex(currentDate, customFetch);
        if (isInstitutionalReportComplete(combined)) {
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

export interface UsRealStockData {
  symbol: string;
  name?: string;
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  volume: number;
  cmf: number;
  candles: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
  historicalDailyFlows: {
    date: string;
    changePercent: number;
    flowScore: number;
    cmf: number;
    netFlowAmount: number;
  }[];
}

/**
 * 抓取並持久化美股真實 20~60 根日 K (OHLCV) 並計算標準 20D CMF (Spec 0120 Ticket 03)
 * 徹底杜絕任何合成模擬日 K，100% 依據真實量價結構入庫與計算
 */
export async function fetchUsMarketRealData(
  symbols: string[],
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy,
  forceRefresh = false
): Promise<Record<string, UsRealStockData>> {
  const result: Record<string, UsRealStockData> = {};
  if (!symbols || symbols.length === 0) return result;

  for (const sym of symbols) {
    const cleanSym = sym.trim().toUpperCase();
    let candles: DailyCandle[] = [];

    // 1. 優先讀取 IndexedDB 快取
    if (!forceRefresh) {
      try {
        const cached = await getSymbolOhlcv(cleanSym);
        if (cached && Array.isArray(cached.candles) && cached.candles.length >= 20) {
          candles = cached.candles;
        }
      } catch {
        // 忽略快取錯誤
      }
    }

    // 2. 若無快取或要求強制更新，透過 Yahoo Finance API 拉取 3 個月日 K
    if (candles.length < 20) {
      try {
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSym)}?interval=1d&range=3mo`;
        const data = await customFetch(targetUrl, 6000);
        const parsed = parseYahooHistoricalCandlesResponse(data);
        if (parsed && parsed.length >= 20) {
          candles = parsed;
          try {
            await saveSymbolOhlcv({
              symbol: cleanSym,
              market: 'US',
              candles: parsed,
              updatedAt: Date.now(),
            });
          } catch {
            // 忽略儲存錯誤
          }
        }
      } catch {
        // 網路錯誤
      }
    }

    // 3. 計算真實金融指標
    if (candles.length >= 20) {
      const latest = candles[candles.length - 1];
      const prev = candles[candles.length - 2] || latest;
      const curPrice = latest.close;
      const prevClose = prev.close;
      const changePercent = prevClose > 0 ? ((curPrice - prevClose) / prevClose) * 100 : 0;
      const cmf = computeChaikinMoneyFlow(candles.slice(-20), 20);

      // 產生過去 5 個交易日之時序位移點
      const historyFlows: UsRealStockData['historicalDailyFlows'] = [];
      const historySliceCount = Math.min(5, candles.length);
      for (let i = candles.length - historySliceCount; i < candles.length; i++) {
        const c = candles[i];
        const windowCandles = candles.slice(Math.max(0, i - 19), i + 1);
        const dayCmf = computeChaikinMoneyFlow(windowCandles, 20);
        const dayPrevClose = i > 0 ? candles[i - 1].close : c.open;
        const dayChangeP = dayPrevClose > 0 ? ((c.close - dayPrevClose) / dayPrevClose) * 100 : 0;

        historyFlows.push({
          date: c.date,
          changePercent: Math.round(dayChangeP * 100) / 100,
          flowScore: Math.round(dayCmf * 100) / 100,
          cmf: Math.round(dayCmf * 100) / 100,
          netFlowAmount: Math.round(dayCmf * 50000000),
        });
      }

      result[cleanSym] = {
        symbol: cleanSym,
        currentPrice: curPrice,
        previousClose: prevClose,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: latest.volume,
        cmf,
        candles,
        historicalDailyFlows: historyFlows,
      };
    }
  }

  return result;
}


