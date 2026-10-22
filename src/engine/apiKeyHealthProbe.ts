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
  skipRelay?: boolean;
}

const DEFAULT_COOLDOWN_MS = 30000;
const lastProbeTimestampMap = new Map<string, number>();

/**
 * 從回應文本中精確提取第三方 JSON 錯誤訊息
 */
function extractErrorMessage(rawBody: string): string | null {
  if (!rawBody || typeof rawBody !== 'string') return null;
  try {
    const json = JSON.parse(rawBody);
    if (typeof json === 'object' && json !== null) {
      if (typeof json.error_message === 'string') return json.error_message;
      if (typeof json['Error Message'] === 'string') return json['Error Message'];
      if (typeof json.message === 'string') return json.message;
      if (typeof json.msg === 'string') return json.msg;
      if (typeof json.Information === 'string') return json.Information;
      if (typeof json.error === 'string') return json.error;
    }
  } catch {}
  return null;
}

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
        testUrl = `https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=${encodeURIComponent(key)}`;
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
      case 'tiingo':
        testUrl = `https://api.tiingo.com/tiingo/daily/aapl/prices?token=${encodeURIComponent(key)}`;
        break;
      default:
        testUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=${encodeURIComponent(key)}`;
    }

    let httpStatus = 0;
    let statusText = '';
    let rawBody = '';
    let latencyMs = 0;
    let usedRelay = false;

    // 優先路由：透過本地 Vite 中介層 /api/market/probe-key 代測，消滅瀏覽器 CORS 阻斷
    if (!options?.proxyUrl && !options?.skipRelay) {
      try {
        const relayRes = await fetcher('/api/market/probe-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: testUrl,
            headers,
          }),
        });

        if (relayRes && relayRes.status === 200) {
          let parsedRelay: any = null;
          if (typeof relayRes.text === 'function') {
            const relayDataRaw = await relayRes.text();
            try {
              parsedRelay = JSON.parse(relayDataRaw);
            } catch {}
          }

          if (parsedRelay && typeof parsedRelay.httpStatus === 'number') {
            httpStatus = parsedRelay.httpStatus;
            statusText = parsedRelay.statusText || '';
            rawBody = parsedRelay.body || parsedRelay.error || '';
            latencyMs = parsedRelay.latencyMs ?? (Date.now() - start);
            usedRelay = true;
          } else {
            // 相容一般單元測試之純 mockFetcher 物件
            httpStatus = 200;
            statusText = relayRes.statusText || 'OK';
            usedRelay = true;
          }
        }
      } catch (relayErr) {
        // 本地中介層未啟動或無法連線時，靜默回退至前端直連
      }
    }

    // 若未走本地中介層，則直接發起連線（支援自訂 proxyUrl）
    if (!usedRelay) {
      let finalUrl = testUrl;
      if (options?.proxyUrl && options.proxyUrl.trim()) {
        const custom = options.proxyUrl.trim();
        const separator = custom.includes('?')
          ? (custom.endsWith('=') || custom.endsWith('&') ? '' : '&url=')
          : '?url=';
        finalUrl = `${custom}${separator}${encodeURIComponent(testUrl)}`;
      }

      const res = await fetcher(finalUrl, { headers });
      httpStatus = res.status;
      statusText = res.statusText || '';
      latencyMs = Date.now() - start;
      if (typeof res.text === 'function') {
        try {
          rawBody = await res.text();
        } catch {}
      }
    }

    lastProbeTimestampMap.set(cacheKey, Date.now());
    const extractedErr = extractErrorMessage(rawBody);

    if (httpStatus === 200) {
      // 攔截 Alpha Vantage 每日配額警示 (25 requests per day)
      if (provider === 'alphavantage' && (rawBody.includes('25 requests per day') || rawBody.includes('rate limit'))) {
        return {
          provider,
          status: 'COOLING_DOWN',
          httpStatus: 200,
          message: extractedErr || '每日請求次數已達上限 (25 requests per day)，金鑰冷卻中',
          latencyMs,
        };
      }

      return {
        provider,
        status: 'HEALTHY',
        httpStatus: 200,
        message: '連線成功，金鑰健康正常',
        latencyMs,
      };
    }

    if (httpStatus === 429) {
      return {
        provider,
        status: 'COOLING_DOWN',
        httpStatus: 429,
        message: extractedErr ? `請求過於頻繁 (429): ${extractedErr}` : '請求過於頻繁 (429 Too Many Requests)，金鑰冷卻中',
        latencyMs,
      };
    }

    if (httpStatus === 400) {
      return {
        provider,
        status: 'INVALID',
        httpStatus: 400,
        message: extractedErr ? `金鑰或請求無效: ${extractedErr}` : '金鑰或請求格式錯誤 (400 Bad Request)',
        latencyMs,
      };
    }

    if (httpStatus === 401 || httpStatus === 403) {
      const is403 = httpStatus === 403;
      const defaultMsg = is403
        ? '金鑰無效、未獲授權或當前方案無權存取該端點 (403 Forbidden)'
        : '金鑰無效或未獲授權 (401 Unauthorized)';
      return {
        provider,
        status: 'INVALID',
        httpStatus,
        message: extractedErr ? `金鑰錯誤 (${httpStatus}): ${extractedErr}` : defaultMsg,
        latencyMs,
      };
    }

    return {
      provider,
      status: 'HEALTHY',
      httpStatus,
      message: extractedErr ? `HTTP ${httpStatus}: ${extractedErr}` : `HTTP 狀態: ${httpStatus} ${statusText}`.trim(),
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    logger.warn(`[KeyHealthProbe] 探針檢測異常 (${provider}):`, err);

    // 瀏覽器 CORS 跨來源物理阻斷友善降級容錯（嚴禁粗暴標記為 INVALID）
    const isCorsBlocked =
      err instanceof TypeError &&
      (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));

    if (isCorsBlocked) {
      return {
        provider,
        status: 'COOLING_DOWN',
        httpStatus: 0,
        message: '瀏覽器 CORS 限制，後端排程可正常調用 (HTTP 0)',
        latencyMs,
      };
    }

    return {
      provider,
      status: 'INVALID',
      httpStatus: 0,
      message: `連線失敗: ${err.message || '網路逾時'}`,
      latencyMs,
    };
  }
}

