import { UpcomingCatalyst } from '../types/macro';
import { STORAGE_KEY_REMOTE_CATALYSTS_CACHE } from '../utils/catalystStorage';

/**
 * 將台灣民國年或各種斜線格式日期正規化為標準 YYYY-MM-DD
 */
export function normalizeTwDate(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/\./g, '/').replace(/-/g, '/');
  const parts = clean.split('/');
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    if (year < 1900) year += 1911;
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * 解析 TWSE 除權息預告 (TWT48U)
 */
export function parseTwseExDividendForecast(
  data: any[]
): Omit<UpcomingCatalyst, 'daysLeft'>[] {
  if (!Array.isArray(data)) return [];

  const results: Omit<UpcomingCatalyst, 'daysLeft'>[] = [];

  for (const item of data) {
    const rawDate = item.Date || item.除權息日期 || item.除息交易日;
    const date = normalizeTwDate(rawDate);
    const code = item.Code || item.公司代號 || item.股票代號;
    const name = item.Name || item.公司名稱 || item.股票名稱;
    if (!date || !code) continue;

    const divAmount = item.Dividend || item.股利 || item.現金股利;
    const desc = divAmount ? `預估每股配息 ${divAmount} 元` : '除權息日程公告';

    results.push({
      id: `twse-div-${code}-${date}`,
      name: `${name || code} (${code}) 除權息預告`,
      date,
      category: 'EARNINGS_DIVIDEND',
      impact: 'MEDIUM',
      targetMarket: 'TW',
      symbol: `${code}.TW`,
      description: `臺灣證交所官方預告：${name || code} 預計於 ${date} 進行除權息，${desc}。`,
      sourceUrl: 'https://www.twse.com.tw/zh/announcement/ex-dividend.html',
    });
  }

  return results;
}

/**
 * 解析 TWSE 上市公司法人說明會日程 (t187ap04_L)
 */
export function parseTwseInvestorBriefing(
  data: any[]
): Omit<UpcomingCatalyst, 'daysLeft'>[] {
  if (!Array.isArray(data)) return [];

  const results: Omit<UpcomingCatalyst, 'daysLeft'>[] = [];

  for (const item of data) {
    const rawDate = item.法說會日期 || item.Date;
    const date = normalizeTwDate(rawDate);
    const code = item.公司代號 || item.Code;
    const name = item.公司名稱 || item.Name;
    if (!date || !code) continue;

    const time = item.法說會時間 ? ` ${item.法說會時間}` : '';

    results.push({
      id: `twse-conf-${code}-${date}`,
      name: `${name || code} (${code}) 法人說明會`,
      date,
      category: 'EARNINGS_DIVIDEND',
      impact: 'MEDIUM',
      targetMarket: 'TW',
      symbol: `${code}.TW`,
      description: `臺灣證券交易所公告：${name || code} 預計於 ${date}${time} 舉行法人說明會，說明營運成果與前瞻展望。`,
      sourceUrl: 'https://www.twse.com.tw/rwd/zh/announcement/briefing',
    });
  }

  return results;
}

export interface SyncExternalCatalystsOptions {
  forceRefresh?: boolean;
  timeoutMs?: number;
}

/**
 * 非同步外部免費財經事件同步中樞 (具備 24H 本地快取與靜默降級保護)
 */
export async function syncExternalCatalystsAsync(
  options: SyncExternalCatalystsOptions = {}
): Promise<Omit<UpcomingCatalyst, 'daysLeft'>[]> {
  const { forceRefresh = false, timeoutMs = 4000 } = options;

  // 1. 檢查本地快取 (24 小時有效)
  if (!forceRefresh && typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_REMOTE_CATALYSTS_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          if (Array.isArray(parsed.data)) {
            return parsed.data;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const fetchedResults: Omit<UpcomingCatalyst, 'daysLeft'>[] = [];

  try {
    // 2. 請求 TWSE OpenAPI 官方除權息預告表 (優先使用 Vite 代理規避跨域限制)
    const isLocalBrowser =
      typeof window !== 'undefined' &&
      window.location &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const primaryUrl = isLocalBrowser
      ? '/api/twse/v1/exchangeReport/TWT48U'
      : 'https://openapi.twse.com.tw/v1/exchangeReport/TWT48U';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response | null = null;
    try {
      res = await fetch(primaryUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch {
      // 若代理轉發失敗且原先走代理，嘗試官方直連降級
      if (primaryUrl.startsWith('/api/twse')) {
        try {
          res = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/TWT48U', {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });
        } catch {
          // ignore
        }
      }
    }
    clearTimeout(timer);

    if (res && res.ok) {
      const json = await res.json();
      const parsed = parseTwseExDividendForecast(json);
      fetchedResults.push(...parsed);
    }
  } catch {
    // 網路斷線或無法存取時靜默忽略，保證 100% 離線可用
  }

  // 3. 沉澱至本地快取
  if (fetchedResults.length > 0 && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(
        STORAGE_KEY_REMOTE_CATALYSTS_CACHE,
        JSON.stringify({
          timestamp: Date.now(),
          data: fetchedResults,
        })
      );
    } catch {
      // ignore
    }
  }

  return fetchedResults;
}
