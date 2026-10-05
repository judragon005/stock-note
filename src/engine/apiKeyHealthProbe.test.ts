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
});
