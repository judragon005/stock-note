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

  it('5. 當提供 proxyUrl 時，probeApiKey 應將請求正確導向自訂代理端點', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ status: 200 });
    const result = await probeApiKey('fred', 'my_fred_key', mockFetcher as any, {
      proxyUrl: 'https://my-proxy.workers.dev',
    });

    expect(result.status).toBe('HEALTHY');
    expect(mockFetcher).toHaveBeenCalledWith(
      expect.stringContaining('https://my-proxy.workers.dev?url='),
      expect.anything()
    );
    expect(mockFetcher).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('https://api.stlouisfed.org/fred/series')),
      expect.anything()
    );
  });

  it('6. FMP 探針應指向免費相容之 profile 端點以避開付費 403 限制', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '[]',
    });
    await probeApiKey('fmp', 'test_key', mockFetcher as any, { skipRelay: true });

    expect(mockFetcher).toHaveBeenCalledWith(
      expect.stringContaining('financialmodelingprep.com/api/v3/profile/AAPL?apikey=test_key'),
      expect.anything()
    );
  });

  describe('Spec 0203 Ticket 02: 錯誤穿透與本地代理中繼容錯', () => {
    it('7. 探針應優先委託本地代理 /api/market/probe-key 並穿透第三方真實 403 JSON 報錯', async () => {
      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url === '/api/market/probe-key') {
          return {
            status: 200,
            text: async () =>
              JSON.stringify({
                ok: false,
                httpStatus: 403,
                statusText: 'Forbidden',
                body: JSON.stringify({ 'Error Message': 'Invalid API KEY.' }),
                latencyMs: 88,
              }),
          };
        }
        throw new Error('Should use relay');
      });

      const res = await probeApiKey('fmp', 'bad_key', mockFetcher as any);
      expect(res.status).toBe('INVALID');
      expect(res.httpStatus).toBe(403);
      expect(res.message).toContain('Invalid API KEY.');
    });

    it('8. FinMind 回傳 400 (token is invalid) 時應精確識別為 INVALID 並穿透提示', async () => {
      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url === '/api/market/probe-key') {
          return {
            status: 200,
            text: async () =>
              JSON.stringify({
                ok: false,
                httpStatus: 400,
                statusText: 'Bad Request',
                body: JSON.stringify({ msg: 'token is invalid', status: 400 }),
                latencyMs: 50,
              }),
          };
        }
        return { status: 400, text: async () => JSON.stringify({ msg: 'token is invalid' }) };
      });

      const res = await probeApiKey('finmind', 'invalid_token', mockFetcher as any);
      expect(res.status).toBe('INVALID');
      expect(res.httpStatus).toBe(400);
      expect(res.message).toContain('token is invalid');
    });

    it('9. Alpha Vantage 回傳 200 但包含 25 requests per day 配額警示時應識別為 COOLING_DOWN', async () => {
      const mockFetcher = vi.fn().mockImplementation(async () => {
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              Information: 'Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day.',
            }),
        };
      });

      const res = await probeApiKey('alphavantage', 'my_key', mockFetcher as any, { skipRelay: true });
      expect(res.status).toBe('COOLING_DOWN');
      expect(res.message).toContain('25 requests per day');
    });

    it('10. 當無本地代理且前端直連遭遇 CORS (Failed to fetch) 時，應友善降級標註為 COOLING_DOWN 且不誤判為 INVALID', async () => {
      const mockFetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const res = await probeApiKey('fred', 'valid_key', mockFetcher as any, { skipRelay: true });
      expect(res.status).toBe('COOLING_DOWN');
      expect(res.httpStatus).toBe(0);
      expect(res.message).toContain('瀏覽器 CORS 限制，後端排程可正常調用');
    });

    it('11. Tiingo 探針應正確呼叫官方端點並支援 200 成功與 401/403 錯誤穿透 (Spec 0203 Ticket 04)', async () => {
      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('api.tiingo.com/tiingo/daily/aapl/prices')) {
          return {
            status: 200,
            text: async () => JSON.stringify([{ date: '2026-10-21', close: 235.5 }]),
          };
        }
        return { status: 404 };
      });

      const res = await probeApiKey('tiingo', 'test_tiingo_token', mockFetcher as any, { skipRelay: true });
      expect(res.status).toBe('HEALTHY');
      expect(res.httpStatus).toBe(200);
      expect(mockFetcher).toHaveBeenCalledWith(
        expect.stringContaining('https://api.tiingo.com/tiingo/daily/aapl/prices?token=test_tiingo_token'),
        expect.anything()
      );
    });
  });
});

