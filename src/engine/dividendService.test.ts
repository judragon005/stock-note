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

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res1 = await fetchCompanyDividendHistory('2454', 'TW');
    const res2 = await fetchCompanyDividendHistory('2454', 'TW');

    expect(res1).toEqual(res2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
