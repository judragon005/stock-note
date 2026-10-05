/**
 * 美國證券交易委員會 (SEC EDGAR) 合規傳輸層 (Spec 0167 / Ticket 07)
 * SEC EDGAR Transport with User-Agent & Rate Limit Compliance
 */

import { logger } from '../utils/logger';

// 內建熱門美股代碼至 CIK 對照表 (亦可動態載入全市場清單)
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
 * 將 CIK 標準化為 10 位數字串
 */
export function normalizeCik(cik: number | string): string {
  const clean = String(cik).replace(/^CIK/i, '').trim();
  return clean.padStart(10, '0');
}

/**
 * 查詢標的代碼之 10 位數 CIK
 */
export function resolveTickerToCik(symbol: string): string | null {
  const upper = symbol.toUpperCase().trim();
  return TICKER_CIK_MAP[upper] || null;
}

/**
 * 取得符合 SEC EDGAR 官方政策規範之請求標頭
 * 官方規定：User-Agent 格式必須為 `Sample Company Name AdminContact@<sample company domain>.com`
 * 頻率上限：不超過 10 requests / second
 */
export function getSecEdgarHeaders(): Record<string, string> {
  return {
    'User-Agent': 'StockTracker/1.0 (local-quant-dev@stocknote.org)',
    'Accept-Encoding': 'gzip, deflate',
    Accept: 'application/json',
  };
}

/**
 * 抓取指定標的之公司事實 (Company Facts) 原始財務 JSON
 */
export async function fetchSecCompanyFacts(
  symbol: string,
  fetcher: typeof fetch = fetch
): Promise<any> {
  const cik = resolveTickerToCik(symbol);
  if (!cik) {
    throw new Error(`[SEC EDGAR] 找不到標的 ${symbol} 的對應 CIK 代碼`);
  }

  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  const headers = getSecEdgarHeaders();

  const response = await fetcher(url, { headers });
  if (!response.ok) {
    if (response.status === 429) {
      logger.warn(`[SEC EDGAR] 請求過於頻繁 (429 Too Many Requests)，請放慢調用速度！`);
    }
    throw new Error(`[SEC EDGAR] 請求失敗，HTTP 狀態碼: ${response.status}`);
  }

  return response.json();
}
