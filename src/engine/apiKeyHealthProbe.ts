/**
 * API 金鑰健康探針與連線檢測模組 (Spec 0167 / Ticket 06)
 * API Key Health Probe Engine
 */

import { ProviderType, KeyHealthStatus } from './apiKeyPoolTypes';
import { logger } from '../utils/logger';

export interface KeyProbeResult {
  provider: ProviderType;
  status: KeyHealthStatus;
  httpStatus: number;
  message: string;
  latencyMs: number;
}

export interface KeyProbeOptions {
  enforceCooldown?: boolean;
  cooldownMs?: number;
  proxyUrl?: string;
}

const DEFAULT_COOLDOWN_MS = 30000;
const lastProbeTimestampMap = new Map<string, number>();

/**
 * 取得特定金鑰探針的剩餘冷卻秒數
 */
export function getProbeCooldownRemaining(
  provider: ProviderType,
  key: string,
  now: number = Date.now(),
  cooldownMs: number = DEFAULT_COOLDOWN_MS
): number {
  const cacheKey = `${provider}:${key}`;
  const lastTime = lastProbeTimestampMap.get(cacheKey) || 0;
  const elapsed = now - lastTime;
  return elapsed < cooldownMs ? Math.ceil((cooldownMs - elapsed) / 1000) : 0;
}

/**
 * 僅供單元測試用途重置探針冷卻快取
 */
export function resetProbeCooldownForTest(): void {
  lastProbeTimestampMap.clear();
}

/**
 * 對特定金鑰進行輕量 Ping 連線檢測
 */
export async function probeApiKey(
  provider: ProviderType,
  key: string,
  fetcher: typeof fetch = fetch,
  options?: KeyProbeOptions
): Promise<KeyProbeResult> {
  const cacheKey = `${provider}:${key}`;
  const cooldownMs = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS;

  if (options?.enforceCooldown) {
    const remainingSec = getProbeCooldownRemaining(provider, key, Date.now(), cooldownMs);
    if (remainingSec > 0) {
      return {
        provider,
        status: 'COOLING_DOWN',
        httpStatus: 429,
        message: `測試間隔冷卻中 (剩餘 ${remainingSec} 秒)，避免過度消耗額度`,
        latencyMs: 0,
      };
    }
  }

  const start = Date.now();

  try {
    let testUrl = '';
    let headers: Record<string, string> = {};

    switch (provider) {
      case 'finmind':
        testUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=${encodeURIComponent(key)}`;
        break;
      case 'finnhub':
        testUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=AAPL&token=${encodeURIComponent(key)}`;
        break;
      case 'fred':
        testUrl = `https://api.stlouisfed.org/fred/series?series_id=DGS10&api_key=${encodeURIComponent(key)}&file_type=json`;
        break;
      case 'fmp':
        testUrl = `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${encodeURIComponent(key)}`;
        break;
      case 'alphavantage':
        testUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${encodeURIComponent(key)}`;
        break;
      case 'coingecko':
        testUrl = `https://api.coingecko.com/api/v3/ping`;
        break;
      case 'polygon':
        testUrl = `https://api.polygon.io/v1/meta/symbols/AAPL/company?apiKey=${encodeURIComponent(key)}`;
        break;
      case 'sec':
        testUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`;
        headers = { 'User-Agent': 'StockTracker/1.0 (local-test@stocknote.org)' };
        break;
      default:
        testUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=${encodeURIComponent(key)}`;
    }

    let finalUrl = testUrl;
    if (options?.proxyUrl && options.proxyUrl.trim()) {
      const custom = options.proxyUrl.trim();
      const separator = custom.includes('?')
        ? (custom.endsWith('=') || custom.endsWith('&') ? '' : '&url=')
        : '?url=';
      finalUrl = `${custom}${separator}${encodeURIComponent(testUrl)}`;
    }

    const res = await fetcher(finalUrl, { headers });
    lastProbeTimestampMap.set(cacheKey, Date.now());
    const latencyMs = Date.now() - start;

    if (res.status === 200) {
      return {
        provider,
        status: 'HEALTHY',
        httpStatus: 200,
        message: '連線成功，金鑰健康正常',
        latencyMs,
      };
    }

    if (res.status === 429) {
      return {
        provider,
        status: 'COOLING_DOWN',
        httpStatus: 429,
        message: '請求過於頻繁 (429 Too Many Requests)，金鑰冷卻中',
        latencyMs,
      };
    }

    if (res.status === 401 || res.status === 403) {
      const is403 = res.status === 403;
      return {
        provider,
        status: 'INVALID',
        httpStatus: res.status,
        message: is403
          ? `金鑰無效、未獲授權或當前方案無權存取該端點 (403 Forbidden)`
          : `金鑰無效或未獲授權 (401 Unauthorized)`,
        latencyMs,
      };
    }

    return {
      provider,
      status: 'HEALTHY',
      httpStatus: res.status,
      message: `HTTP 狀態: ${res.status}`,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    logger.warn(`[KeyHealthProbe] 探針檢測異常 (${provider}):`, err);
    return {
      provider,
      status: 'INVALID',
      httpStatus: 0,
      message: `連線失敗: ${err.message || '網路逾時'}`,
      latencyMs,
    };
  }
}
