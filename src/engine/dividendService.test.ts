import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCompanyDividendHistory } from './dividendService';

describe('fetchCompanyDividendHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('應該成功解析 FinMind TaiwanStockDividend 資料並加總年度股利', async () => {
    const mockData = {
      data: [
        {
          date: '2023-07-01',
          CashEarningsDistribution: 1.5,
          CashStatutorySurplus: 0.5,
          StockEarningsDistribution: 0.2,
          StockStatutorySurplus: 0,
          CashExDividendTradingDate: '2023-07-15',
          CashDividendPaymentDate: '2023-08-15',
        },
        {
          date: '2022-07-01',
          CashEarningsDistribution: 2.0,
          CashStatutorySurplus: 0,
          StockEarningsDistribution: 0,
          StockStatutorySurplus: 0,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await fetchCompanyDividendHistory('1101', 'TW');
    expect(result.length).toBe(2);
    expect(result[0].year).toBe(2022);
    expect(result[0].cashDividend).toBe(2.0);
    expect(result[1].year).toBe(2023);
    expect(result[1].cashDividend).toBe(2.0); // 1.5 + 0.5
    expect(result[1].stockDividend).toBe(0.2);
    expect(result[1].totalDividend).toBe(2.2);
  });

  it('當 API 傳入民國年格式時能自動容錯校準為西元年', async () => {
    const mockData = {
      data: [
        {
          year: '110年',
          CashEarningsDistribution: 3.5,
          StockEarningsDistribution: 0.5,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await fetchCompanyDividendHistory('2330', 'TW');
    expect(result.length).toBe(1);
    expect(result[0].year).toBe(2021); // 110 + 1911
    expect(result[0].cashDividend).toBe(3.5);
    expect(result[0].stockDividend).toBe(0.5);
    expect(result[0].totalDividend).toBe(4.0);
  });

  it('網路或 API 異常時應返回空陣列且不中斷程式', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await fetchCompanyDividendHistory('9999', 'TW');
    expect(result).toEqual([]);
  });

  it('同標的重複請求時應命中記憶體快取，不重發 fetch 請求', async () => {
    const mockData = {
      data: [
        {
          date: '2023-07-01',
          CashEarningsDistribution: 5.0,
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('/api/market/corporate-actions/')) {
        return { ok: false, status: 404 } as Response;
      }
      return {
        ok: true,
        json: async () => mockData,
      } as Response;
    });

    const res1 = await fetchCompanyDividendHistory('2454', 'TW');
    const res2 = await fetchCompanyDividendHistory('2454', 'TW');

    expect(res1).toEqual(res2);
    // 第一次呼叫抓取（1次本地失敗 + 1次外部成功 = 2次），第二次呼叫直接命中 memoryCache（0次），總共仍為 2 次
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  describe('deriveUsDividendsFromFinancials (Spec 0202 - Ticket 06)', () => {
    it('應能從美股現金流量表 dividendPaid 與推導股數精準反推歷年每股股利', async () => {
      const { deriveUsDividendsFromFinancials } = await import('./dividendService');
      const mockUsRecords: any[] = [
        {
          symbol: 'AAPL',
          market: 'US',
          year: 2024,
          quarter: 4,
          income: { netIncome: 25000000, eps: 2.5 }, // 股數 = 10,000,000 股
          cashFlow: { dividendPaid: 5000000 }, // 每季每股 0.5 元
        },
        {
          symbol: 'AAPL',
          market: 'US',
          year: 2024,
          quarter: 3,
          income: { netIncome: 25000000, eps: 2.5 },
          cashFlow: { dividendPaid: 5000000 },
        },
        {
          symbol: 'AAPL',
          market: 'US',
          year: 2024,
          quarter: 2,
          income: { netIncome: 25000000, eps: 2.5 },
          cashFlow: { dividendPaid: 5000000 },
        },
        {
          symbol: 'AAPL',
          market: 'US',
          year: 2024,
          quarter: 1,
          income: { netIncome: 25000000, eps: 2.5 },
          cashFlow: { dividendPaid: 5000000 },
        },
      ];

      const res = deriveUsDividendsFromFinancials(mockUsRecords);
      expect(res).toHaveLength(1);
      expect(res[0].year).toBe(2024);
      expect(res[0].cashDividend).toBeCloseTo(2.0, 2); // 4 季各 0.5 = 2.0 元
      expect(res[0].totalDividend).toBeCloseTo(2.0, 2);
    });
  });
});
