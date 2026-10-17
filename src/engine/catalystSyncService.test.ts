import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseTwseExDividendForecast,
  parseTwseInvestorBriefing,
  syncExternalCatalystsAsync,
} from './catalystSyncService';

describe('外部免費財經催化劑同步服務 (catalystSyncService)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. TWSE OpenAPI 解析器', () => {
    it('應能正確將 TWSE 除權息預告表轉換為 UpcomingCatalyst 格式', () => {
      const mockTwseData = [
        {
          Date: '115/10/22', // 民國 115 年 = 2026 年
          Code: '2330',
          Name: '台積電',
          Dividend: '7.00',
        },
      ];

      const parsed = parseTwseExDividendForecast(mockTwseData);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('twse-div-2330-2026-10-22');
      expect(parsed[0].date).toBe('2026-10-22');
      expect(parsed[0].name).toContain('台積電 (2330) 除權息預告');
      expect(parsed[0].category).toBe('EARNINGS_DIVIDEND');
      expect(parsed[0].impact).toBe('MEDIUM');
      expect(parsed[0].targetMarket).toBe('TW');
    });

    it('應能正確將 TWSE 上市公司法說會日程轉換為 UpcomingCatalyst 格式', () => {
      const mockBriefingData = [
        {
          出刊日期: '20261019',
          公司代號: '2454',
          公司名稱: '聯發科',
          法說會日期: '2026/10/29',
          法說會時間: '14:00',
        },
      ];

      const parsed = parseTwseInvestorBriefing(mockBriefingData);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('twse-conf-2454-2026-10-29');
      expect(parsed[0].date).toBe('2026-10-29');
      expect(parsed[0].name).toContain('聯發科 (2454) 法人說明會');
      expect(parsed[0].category).toBe('EARNINGS_DIVIDEND');
      expect(parsed[0].impact).toBe('MEDIUM');
      expect(parsed[0].targetMarket).toBe('TW');
    });
  });

  describe('2. 外部同步流程與優雅降級', () => {
    it('遭遇網路異常或 HTTP 500 時，應靜默降級回傳空陣列，不拋出未捕獲例外', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network offline or CORS blocked'))
      );

      const result = await syncExternalCatalystsAsync({ forceRefresh: true });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('當外部端點正常回傳時，應能成功解析並存入本地快取', async () => {
      const mockRawData = [
        {
          Date: '115/11/05',
          Code: '2454',
          Name: '聯發科',
          Dividend: '20.0',
        },
      ];

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockRawData,
        } as Response)
      );

      const result = await syncExternalCatalystsAsync({ forceRefresh: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('twse-div-2454-2026-11-05');
      expect(result[0].date).toBe('2026-11-05');
    });
  });
});
