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

  it('Ticket #553: 同年度多次配息合併時，應保留各期除息日與發放日於 payoutEvents 且不遺失日期', async () => {
    const mockData = {
      data: [
        {
          date: '2026-03-19',
          CashEarningsDistribution: 4.0,
          CashExDividendTradingDate: '2026-03-19',
          CashDividendPaymentDate: '2026-04-09',
        },
        {
          date: '2026-06-18',
          CashEarningsDistribution: 4.5,
          CashExDividendTradingDate: '2026-06-18',
          CashDividendPaymentDate: '2026-07-09',
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      if (String(input).includes('/api/market/corporate-actions/')) {
        return { ok: false, status: 404 } as Response;
      }
      return { ok: true, json: async () => mockData } as Response;
    });

    const res = await fetchCompanyDividendHistory('2330_MULTI', 'TW');
    expect(res).toHaveLength(1);
    expect(res[0].cashDividend).toBe(8.5);
    expect(res[0].payoutEvents).toHaveLength(2);
    expect(res[0].payoutEvents?.[0]).toMatchObject({
      exDividendDate: '2026-03-19',
      payDate: '2026-04-09',
      cashDividend: 4.0,
    });
    expect(res[0].payoutEvents?.[1]).toMatchObject({
      exDividendDate: '2026-06-18',
      payDate: '2026-07-09',
      cashDividend: 4.5,
    });
  });

  it('Ticket #553: Lakehouse 本地 API 成功路徑、HTTP 429/500 異常與 MAX_CACHE_ENTRIES 驅逐驗證', async () => {
    // 1. Lakehouse 成功路徑
    const lakehouseActions = [{ year: 2025, cashDividend: 10, stockDividend: 0, totalDividend: 10 }];
    const spyOk = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ actions: lakehouseActions }),
    } as Response);
    const resLk = await fetchCompanyDividendHistory('LK_SUCCESS', 'TW');
    expect(resLk).toEqual(lakehouseActions);
    expect(spyOk).toHaveBeenCalledTimes(1);

    // 2. HTTP 429 / 500 異常安全回退
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 429 } as Response);
    const res429 = await fetchCompanyDividendHistory('ERR_429', 'TW');
    expect(res429).toEqual([]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response);
    const res500 = await fetchCompanyDividendHistory('ERR_500', 'TW');
    expect(res500).toEqual([]);

    // 3. MAX_CACHE_ENTRIES (100) 驅逐驗證：寫入 101 個不重複代碼後，第一個應被驅逐重發 fetch
    const fetchCalls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.includes('/api/market/corporate-actions/')) {
        return {
          ok: true,
          json: async () => ({ actions: [{ year: 2025, cashDividend: 1, stockDividend: 0, totalDividend: 1 }] }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    for (let i = 0; i <= 100; i++) {
      await fetchCompanyDividendHistory(`CACHE_SYM_${i}`, 'TW');
    }
    const callsBeforeRefetch = fetchCalls.length;
    await fetchCompanyDividendHistory('CACHE_SYM_0', 'TW');
    expect(fetchCalls.length).toBeGreaterThan(callsBeforeRefetch);
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
