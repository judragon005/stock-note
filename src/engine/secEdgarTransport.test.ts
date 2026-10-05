import { describe, it, expect, vi } from 'vitest';
import {
  normalizeCik,
  resolveTickerToCik,
  getSecEdgarHeaders,
  fetchSecCompanyFacts,
} from './secEdgarTransport';

describe('Ticket 07: SEC EDGAR User-Agent Transport and Rate Limiter', () => {
  it('1. normalizeCik 應將數字或代碼標準化為 10 位數 CIK 字串', () => {
    expect(normalizeCik(320193)).toBe('0000320193');
    expect(normalizeCik('320193')).toBe('0000320193');
    expect(normalizeCik('0000320193')).toBe('0000320193');
  });

  it('2. resolveTickerToCik 應正確解析知名美股標的之 CIK', () => {
    expect(resolveTickerToCik('AAPL')).toBe('0000320193');
    expect(resolveTickerToCik('NVDA')).toBe('0001045810');
    expect(resolveTickerToCik('TSLA')).toBe('0001318605');
    expect(resolveTickerToCik('MSFT')).toBe('0000789019');
    expect(resolveTickerToCik('UNKNOWN_XYZ')).toBeNull();
  });

  it('3. getSecEdgarHeaders 必須包含符合 SEC 規範之 User-Agent', () => {
    const headers = getSecEdgarHeaders();
    expect(headers['User-Agent']).toBeTruthy();
    expect(headers['User-Agent']).toContain('StockTracker');
    expect(headers['Accept-Encoding']).toBe('gzip, deflate');
  });

  it('4. fetchSecCompanyFacts 應成功發出合規請求並回傳資料', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ cik: 320193, entityName: 'Apple Inc.', facts: {} }),
    });

    const data = await fetchSecCompanyFacts('AAPL', mockFetcher);
    expect(data.entityName).toBe('Apple Inc.');
    expect(mockFetcher).toHaveBeenCalledWith(
      'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('StockTracker'),
        }),
      })
    );
  });
});
