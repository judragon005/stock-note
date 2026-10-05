import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartKeyRotator } from './smartKeyRotator';

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
});
