import { describe, it, expect, vi } from 'vitest';
import { probeApiKey } from './apiKeyHealthProbe';

describe('Ticket 06: API Key Health Probe Engine', () => {
  it('1. 當端點回傳 200 時應回傳 HEALTHY', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ status: 200 });
    const result = await probeApiKey('finmind', 'valid_token', mockFetcher as any);
    expect(result.status).toBe('HEALTHY');
    expect(result.httpStatus).toBe(200);
    expect(result.message).toContain('連線成功');
  });

  it('2. 當端點回傳 429 時應回傳 COOLING_DOWN', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ status: 429 });
    const result = await probeApiKey('fred', 'rate_limited_key', mockFetcher as any);
    expect(result.status).toBe('COOLING_DOWN');
    expect(result.httpStatus).toBe(429);
  });

  it('3. 當端點回傳 401 時應回傳 INVALID', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ status: 401 });
    const result = await probeApiKey('finnhub', 'bad_key', mockFetcher as any);
    expect(result.status).toBe('INVALID');
    expect(result.httpStatus).toBe(401);
  });

  it('4. 當在 30 秒冷卻期內重複測試時，應觸發冷卻保護避免消耗 API 額度', async () => {
    const { getProbeCooldownRemaining, resetProbeCooldownForTest } = await import('./apiKeyHealthProbe');
    resetProbeCooldownForTest();

    const mockFetcher = vi.fn().mockResolvedValue({ status: 200 });
    // 第一次呼叫 (啟用冷卻保護選項)
    const res1 = await probeApiKey('fmp' as any, 'test_fmp_key', mockFetcher as any, { enforceCooldown: true });
    expect(res1.status).toBe('HEALTHY');
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // 立即進行第二次呼叫，應直接攔截進入 COOLING_DOWN，不發送遠端請求
    const res2 = await probeApiKey('fmp' as any, 'test_fmp_key', mockFetcher as any, { enforceCooldown: true });
    expect(res2.status).toBe('COOLING_DOWN');
    expect(res2.message).toContain('測試間隔冷卻中');
    expect(mockFetcher).toHaveBeenCalledTimes(1); // 依然只呼叫 1 次

    const remaining = getProbeCooldownRemaining('fmp' as any, 'test_fmp_key');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(30);
  });
});
