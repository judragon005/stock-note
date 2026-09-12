import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseUSFinancialStatements,
  fetchUSQuarterlyFinancials,
} from './usFinancialPipeline';
import * as db from '../utils/db';

describe('US Financial Ingestion Pipeline (TDD Seam)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockIncome = [
    {
      date: '2025-03-31',
      calendarYear: '2025',
      period: 'Q1',
      revenue: 900000000,
      grossProfit: 720000000,
      operatingIncome: 180000000,
      netIncome: 150000000,
      eps: 0.08,
    },
  ];

  const mockBalance = [
    {
      date: '2025-03-31',
      totalAssets: 5500000000,
      totalLiabilities: 1100000000,
      totalStockholdersEquity: 4400000000,
      netReceivables: 320000000,
      inventory: 0,
      cashAndCashEquivalents: 4100000000,
      shortTermDebt: 50000000,
      longTermDebt: 200000000,
    },
  ];

  const mockCashFlow = [
    {
      date: '2025-03-31',
      operatingCashFlow: 320000000,
      capitalExpenditure: -25000000,
      stockBasedCompensation: 180000000, // 美股 SBC
      dividendsPaid: 0,
    },
  ];

  it('1. parseUSFinancialStatements 應能整合三表與 SBC 欄位為標準契約', () => {
    const records = parseUSFinancialStatements('PLTR', mockIncome, mockBalance, mockCashFlow);

    expect(records).toHaveLength(1);
    const rec = records[0];
    expect(rec.symbol).toBe('PLTR');
    expect(rec.market).toBe('US');
    expect(rec.year).toBe(2025);
    expect(rec.quarter).toBe(1);
    expect(rec.income.revenue).toBe(900000000);
    expect(rec.cashFlow.stockBasedCompensation).toBe(180000000);
    expect(rec.balanceSheet.inventory).toBe(0);
    expect(rec.balanceSheet.shortTermDebt).toBe(50000000);
    expect(rec.auditInfo?.isBigFour).toBe(true);
  });

  it('2. fetchUSQuarterlyFinancials 若本地有快取應直接回傳快取', async () => {
    const mockCached = [
      {
        symbol: 'PLTR',
        market: 'US' as const,
        year: 2025,
        quarter: 1,
        periodDate: '2025-03-31',
        income: { revenue: 900000000, grossProfit: 720000000, operatingIncome: 180000000, netIncome: 150000000, eps: 0.08 },
        balanceSheet: { totalAssets: 5500000000, totalLiabilities: 1100000000, totalEquity: 4400000000, accountsReceivable: 320000000, inventory: 0, cashAndEquivalents: 4100000000 },
        cashFlow: { operatingCashFlow: 320000000, capitalExpenditure: 25000000, stockBasedCompensation: 180000000 },
        updatedAt: Date.now(),
      },
    ];

    vi.spyOn(db, 'getStoredFinancialRecords').mockResolvedValue(mockCached);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await fetchUSQuarterlyFinancials('PLTR');
    expect(result).toEqual(mockCached);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
