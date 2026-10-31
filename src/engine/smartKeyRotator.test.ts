import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SmartKeyRotator,
  ensureKeyPoolHydrated,
  buildMacroSyncKeyHeaders,
} from './smartKeyRotator';
import * as apiKeyStorage from './apiKeyStorage';
import * as appStorage from '../utils/storage';

describe('Ticket 02 & 03: SmartKeyRotator Core Engine', () => {
  let rotator: SmartKeyRotator;

  beforeEach(() => {
    rotator = new SmartKeyRotator();
  });

  it('1. 應依據 Round-Robin 均勻輪替派發可用的 API Keys', () => {
    rotator.registerKey('finmind', 'key_1', { dailyQuotaLimit: 100 });
    rotator.registerKey('finmind', 'key_2', { dailyQuotaLimit: 100 });

    const keyA = rotator.acquireKey('finmind');
    const keyB = rotator.acquireKey('finmind');
    const keyC = rotator.acquireKey('finmind');

    expect(keyA?.key).toBe('key_1');
    expect(keyB?.key).toBe('key_2');
    expect(keyC?.key).toBe('key_1');
  });

  it('2. 當單一金鑰達到配額上限時，應自動跳過並挑選下一個健康金鑰', () => {
    rotator.registerKey('finnhub', 'key_exhausted', { dailyQuotaLimit: 2 });
    rotator.registerKey('finnhub', 'key_healthy', { dailyQuotaLimit: 100 });

    // 消耗 key_exhausted 2 次
    rotator.acquireKey('finnhub'); // key_exhausted (req: 1)
    rotator.acquireKey('finnhub'); // key_healthy (req: 1)
    rotator.acquireKey('finnhub'); // key_exhausted (req: 2, 達到上限)

    // 接下來的請求應只有 key_healthy 能被選中
    const nextKey1 = rotator.acquireKey('finnhub');
    const nextKey2 = rotator.acquireKey('finnhub');

    expect(nextKey1?.key).toBe('key_healthy');
    expect(nextKey2?.key).toBe('key_healthy');
  });

  it('3. 當金鑰遭遇 429 限流時，應啟動指數退避冷卻並自輪替池暫時隔離', () => {
    const now = 1000000;
    rotator.registerKey('fred', 'fred_key_1', { dailyQuotaLimit: 50 });
    rotator.registerKey('fred', 'fred_key_2', { dailyQuotaLimit: 50 });

    const key1 = rotator.acquireKey('fred', now);
    expect(key1?.key).toBe('fred_key_1');

    // 回報 429 (第一次失敗，預設冷卻 60 秒)
    rotator.reportStatus(key1!, 429, 60, now);
    expect(key1?.cooldownUntil).toBe(now + 60000);
    expect(key1?.consecutiveFailures).toBe(1);

    // 在冷卻期間內再次取用，應跳過 fred_key_1，取得 fred_key_2
    const key2 = rotator.acquireKey('fred', now + 1000);
    expect(key2?.key).toBe('fred_key_2');

    // 冷卻結束後 (65 秒後)，兩把 Key 均已健康恢復可調用
    const restoredKey = rotator.acquireKey('fred', now + 65000);
    const nextRestoredKey = rotator.acquireKey('fred', now + 65000);
    const keysUsed = [restoredKey?.key, nextRestoredKey?.key].sort();
    expect(keysUsed).toEqual(['fred_key_1', 'fred_key_2']);
  });

  it('4. 當金鑰遭遇 401 或 403 時，應標記為黑名單永久除名', () => {
    rotator.registerKey('polygon', 'bad_key');
    rotator.registerKey('polygon', 'good_key');

    const key = rotator.acquireKey('polygon');
    expect(key?.key).toBe('bad_key');

    // 遭遇 401 Invalid Token
    rotator.reportStatus(key!, 401);
    expect(key?.isBlacklisted).toBe(true);

    // 後續取用永遠不會再拿到 bad_key
    expect(rotator.acquireKey('polygon')?.key).toBe('good_key');
    expect(rotator.acquireKey('polygon')?.key).toBe('good_key');
  });

  it('5. executeWithRotation 應在遭遇 429 時自動切換下一個 Key 重試直到成功', async () => {
    rotator.registerKey('finmind', 'k1');
    rotator.registerKey('finmind', 'k2');

    const mockFetcher = vi.fn();
    // 第一次呼叫 (k1) 回傳 429，第二次呼叫 (k2) 回傳 200 成功
    mockFetcher
      .mockResolvedValueOnce({
        status: 429,
        ok: false,
        text: async () => 'Rate limit exceeded',
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ data: 'success_from_k2' }),
      });

    const result = await rotator.executeWithRotation(
      {
        provider: 'finmind',
        endpointUrl: (key) => `https://api.test.com?token=${key}`,
        fetcher: mockFetcher,
      },
      (text) => JSON.parse(text)
    );

    expect(result).toEqual({ data: 'success_from_k2' });
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('支援 resetGlobalKeyRotatorForTest 重新初始化單例', async () => {
    const { globalKeyRotator, resetGlobalKeyRotatorForTest } = await import('./smartKeyRotator');
    globalKeyRotator.registerKey('finmind', 'singleton-test-key');
    expect(globalKeyRotator.getStatistics('finmind').totalKeys).toBe(1);

    resetGlobalKeyRotatorForTest();
    const { globalKeyRotator: newRotator } = await import('./smartKeyRotator');
    expect(newRotator.getStatistics('finmind').totalKeys).toBe(0);
  });

  it('6. ensureKeyPoolHydrated 應從加密金鑰池與傳統單一金鑰設定載入並註冊金鑰', async () => {
    const poolSpy = vi.spyOn(apiKeyStorage, 'loadEncryptedKeyPool').mockResolvedValue([
      {
        id: 'fred_1',
        provider: 'fred',
        key: 'fred_secret_key',
        dailyQuotaLimit: 1000,
        totalRequestsToday: 0,
        lastUsedTimestamp: 0,
        cooldownUntil: 0,
        consecutiveFailures: 0,
        isBlacklisted: false,
      },
      {
        id: 'finnhub_1',
        provider: 'finnhub',
        key: 'finnhub_secret_key',
        dailyQuotaLimit: 500,
        totalRequestsToday: 0,
        lastUsedTimestamp: 0,
        cooldownUntil: 0,
        consecutiveFailures: 0,
        isBlacklisted: false,
      },
    ] as any);

    const legacySpy = vi.spyOn(appStorage, 'loadApiKeysConfigFromStorage').mockReturnValue({
      finmindToken: 'legacy_finmind_token',
      fmpApiKey: 'legacy_fmp_key',
      alphaVantageKey: 'legacy_av_key',
      tiingoToken: 'legacy_tiingo_token',
    } as any);

    await ensureKeyPoolHydrated(rotator);

    expect(rotator.getKeys('fred').map((k) => k.key)).toEqual(['fred_secret_key']);
    expect(rotator.getKeys('finnhub').map((k) => k.key)).toEqual(['finnhub_secret_key']);
    expect(rotator.getKeys('finmind').map((k) => k.key)).toEqual(['legacy_finmind_token']);
    expect(rotator.getKeys('fmp').map((k) => k.key)).toEqual(['legacy_fmp_key']);
    expect(rotator.getKeys('alphavantage').map((k) => k.key)).toEqual(['legacy_av_key']);
    expect(rotator.getKeys('tiingo').map((k) => k.key)).toEqual(['legacy_tiingo_token']);

    poolSpy.mockRestore();
    legacySpy.mockRestore();
  });

  it('7. buildMacroSyncKeyHeaders 應僅針對有可用金鑰的供應商生成對應 HTTP 標頭並輪替取用', () => {
    rotator.registerKey('fred', 'fred_k1');
    rotator.registerKey('finmind', 'finmind_k1');
    rotator.registerKey('finmind', 'finmind_k2');
    rotator.registerKey('fmp', 'fmp_bad');
    // 將 fmp_bad 拉黑使其不可用
    const badFmp = rotator.acquireKey('fmp');
    rotator.reportStatus(badFmp!, 401);

    const headers1 = buildMacroSyncKeyHeaders(rotator);
    expect(headers1).toEqual({
      'x-fred-key': 'fred_k1',
      'x-finmind-key': 'finmind_k1',
    });
    expect(headers1['x-fmp-key']).toBeUndefined();
    expect(headers1['x-finnhub-key']).toBeUndefined();

    // 第二次產生標頭時，finmind 應輪替至 finmind_k2
    const headers2 = buildMacroSyncKeyHeaders(rotator);
    expect(headers2['x-finmind-key']).toBe('finmind_k2');
  });
});
