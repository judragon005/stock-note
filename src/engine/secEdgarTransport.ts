/**
 * 美國證券交易委員會 (SEC EDGAR) 合規傳輸層 (Spec 0167 / Spec 0239 T07)
 * SEC EDGAR Transport:
 * - 瀏覽器環境：一律呼叫本地中介層代理 `/api/market/sec-edgar/companyfacts/:symbol`，
 *   徹底移除 Forbidden Header (`User-Agent` / `Accept-Encoding`) 並突破 18 檔靜態 CIK 限制。
 * - Node 環境：保留既有公開介面與伺服器端合規標頭以維持向後相容。
 */

import { logger } from '../utils/logger';

export const SEC_EDGAR_USER_AGENT = 'StockTrackerApp/1.0 (local-analytics@stocktracker.local)';
export const SEC_EDGAR_LOCAL_PROXY_PREFIX = '/api/market/sec-edgar/companyfacts';

export interface SecEdgarHeaderOptions {
  isBrowser?: boolean;
}

export interface FetchSecCompanyFactsOptions {
  useLocalProxy?: boolean;
}

// 內建熱門美股代碼至 CIK 對照表（Node 直接模式與離線備援；瀏覽器端改由本地代理動態解析全美股 CIK）
const TICKER_CIK_MAP: Record<string, string> = {
  AAPL: '0000320193',
  NVDA: '0001045810',
  MSFT: '0000789019',
  GOOGL: '0001652044',
  GOOG: '0001652044',
  AMZN: '0001018724',
  META: '0001326801',
  TSLA: '0001318605',
  BRK_B: '0001067983',
  'BRK.B': '0001067983',
  'BRK-B': '0001067983',
  AMD: '0000002488',
  INTC: '0000050863',
  AVGO: '0001730168',
  QCOM: '0000804328',
  NFLX: '0001065280',
  COST: '0000909832',
  SPY: '0000884394',
  QQQ: '0001067839',
  VOO: '0001498462',
};

/**
 * 判定當前是否執行於瀏覽器環境
 */
export function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

/**
 * 正規化美股代碼（去空白轉大寫，下劃線轉點號；保留 BRK.B / BRK-B 合法格式）
 */
export function normalizeUsTickerSymbol(symbol: string): string {
  const upper = String(symbol || '').trim().toUpperCase();
  if (!upper) return '';
  return upper.replace(/_/g, '.');
}

/**
 * 產生美股代碼雙向別名清單（支援 BRK.B <-> BRK-B <-> BRK_B）
 */
export function buildSecTickerAliases(symbol: string): string[] {
  const upper = String(symbol || '').trim().toUpperCase();
  if (!upper) return [];
  const aliases = new Set<string>([
    upper,
    upper.replace(/[_-]/g, '.'),
    upper.replace(/[._]/g, '-'),
    upper.replace(/[.-]/g, '_'),
  ]);
  return Array.from(aliases);
}

/**
 * 組合瀏覽器端呼叫本地 SEC EDGAR 代理之 API 路徑
 */
export function getSecEdgarProxyUrl(symbol: string): string {
  const normalized = normalizeUsTickerSymbol(symbol);
  return `${SEC_EDGAR_LOCAL_PROXY_PREFIX}/${encodeURIComponent(normalized)}`;
}

/**
 * 將 CIK 標準化為 10 位數字串
 */
export function normalizeCik(cik: number | string): string {
  const clean = String(cik).replace(/^CIK/i, '').trim();
  return clean.padStart(10, '0');
}

/**
 * 查詢標的代碼之 10 位數 CIK（靜態對照，支援 BRK.B <-> BRK-B <-> BRK_B 別名正規化）
 */
export function resolveTickerToCik(symbol: string): string | null {
  for (const alias of buildSecTickerAliases(symbol)) {
    if (TICKER_CIK_MAP[alias]) {
      return TICKER_CIK_MAP[alias];
    }
  }
  return null;
}

/**
 * 取得符合環境安全規範之 SEC EDGAR 請求標頭
 * - 瀏覽器環境：僅回傳 Accept: application/json，徹底移除 Forbidden Header (`User-Agent` / `Accept-Encoding`)
 * - 伺服器 / Node 環境：注入符合 SEC 官方規定之 User-Agent 與 Accept-Encoding
 */
export function getSecEdgarHeaders(options?: SecEdgarHeaderOptions): Record<string, string> {
  const browserEnv = options?.isBrowser ?? isBrowserRuntime();
  if (browserEnv) {
    return {
      Accept: 'application/json',
    };
  }
  return {
    'User-Agent': SEC_EDGAR_USER_AGENT,
    'Accept-Encoding': 'gzip, deflate',
    Accept: 'application/json',
  };
}

/**
 * 抓取指定標的之公司事實 (Company Facts) 原始財務 JSON
 * - 瀏覽器環境：透過本地代理 `/api/market/sec-edgar/companyfacts/:symbol` 取得（全美股動態 CIK + 零 Forbidden Header）
 * - Node 環境：直接請求 SEC 官方端點並帶上合規伺服器標頭
 */
export async function fetchSecCompanyFacts(
  symbol: string,
  fetcher: typeof fetch = fetch,
  options?: FetchSecCompanyFactsOptions
): Promise<any> {
  const useLocalProxy = options?.useLocalProxy ?? isBrowserRuntime();

  if (useLocalProxy) {
    const normalized = normalizeUsTickerSymbol(symbol);
    if (!normalized) {
      throw new Error('[SEC EDGAR] 美股代碼不得為空');
    }
    const url = getSecEdgarProxyUrl(normalized);
    const headers = getSecEdgarHeaders({ isBrowser: true });
    const response = await fetcher(url, { headers });
    if (!response.ok) {
      if (response.status === 429) {
        logger.warn(`[SEC EDGAR] 本地代理請求過於頻繁 (429 Too Many Requests)，請放慢調用速度！`);
      }
      throw new Error(`[SEC EDGAR] 本地代理請求失敗 (${normalized})，HTTP 狀態碼: ${response.status}`);
    }
    return response.json();
  }

  const cik = resolveTickerToCik(symbol);
  if (!cik) {
    throw new Error(`[SEC EDGAR] 找不到標的 ${symbol} 的對應 CIK 代碼`);
  }

  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  const headers = getSecEdgarHeaders({ isBrowser: false });

  const response = await fetcher(url, { headers });
  if (!response.ok) {
    if (response.status === 429) {
      logger.warn(`[SEC EDGAR] 請求過於頻繁 (429 Too Many Requests)，請放慢調用速度！`);
    }
    throw new Error(`[SEC EDGAR] 請求失敗，HTTP 狀態碼: ${response.status}`);
  }

  return response.json();
}
