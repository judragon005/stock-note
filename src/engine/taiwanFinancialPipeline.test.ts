import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseTaiwanFinancialStatements,
  fetchTaiwanQuarterlyFinancials,
} from './taiwanFinancialPipeline';
import * as db from '../utils/db';

describe('Taiwan Financial Ingestion Pipeline (TDD Seam)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockFinmindRawData = [
    // 損益表
    { date: '2025-06-30', type: 'Revenue', value: 600000 },
    { date: '2025-06-30', type: 'GrossProfit', value: 320000 },
    { date: '2025-06-30', type: 'OperatingIncome', value: 250000 },
    { date: '2025-06-30', type: 'NetIncome', value: 210000 },
    { date: '2025-06-30', type: 'EPS', value: 8.1 },
    // 資產負債表
    { date: '2025-06-30', type: 'TotalAssets', value: 5000000 },
    { date: '2025-06-30', type: 'TotalLiabilities', value: 2000000 },
    { date: '2025-06-30', type: 'TotalEquity', value: 3000000 },
    { date: '2025-06-30', type: 'AccountsReceivable', value: 200000 },
    { date: '2025-06-30', type: 'Inventories', value: 250000 },
    { date: '2025-06-30', type: 'CashAndCashEquivalents', value: 1500000 },
    // 現金流量表
    { date: '2025-06-30', type: 'OperatingCashFlow', value: 300000 },
    { date: '2025-06-30', type: 'CapitalExpenditures', value: 150000 },
    { date: '2025-06-30', type: 'CashDividendsPaid', value: 90000 },
  ];

  it('1. parseTaiwanFinancialStatements 應能正確聚合各類別數據為標準 16 欄位契約', () => {
    const records = parseTaiwanFinancialStatements('2330', mockFinmindRawData);

    expect(records).toHaveLength(1);
    const rec = records[0];
    expect(rec.symbol).toBe('2330');
    expect(rec.market).toBe('TW');
    expect(rec.year).toBe(2025);
    expect(rec.quarter).toBe(2);
    expect(rec.income.revenue).toBe(600000);
    expect(rec.income.grossProfit).toBe(320000);
    expect(rec.income.netIncome).toBe(210000);
    expect(rec.balanceSheet.totalAssets).toBe(5000000);
    expect(rec.balanceSheet.cashAndEquivalents).toBe(1500000);
    expect(rec.cashFlow.operatingCashFlow).toBe(300000);
    expect(rec.cashFlow.capitalExpenditure).toBe(150000);
    expect(rec.auditInfo?.opinionType).toBe('UNQUALIFIED');
  });

  it('2. fetchTaiwanQuarterlyFinancials 若本地已有快取應優先讀取，不觸發網路請求', async () => {
    const mockCached = [
      {
        symbol: '2330',
        market: 'TW' as const,
        year: 2025,
        quarter: 2,
        periodDate: '2025-06-30',
        income: { revenue: 600000, grossProfit: 320000, operatingIncome: 250000, netIncome: 210000, eps: 8.1 },
        balanceSheet: { totalAssets: 5000000, totalLiabilities: 2000000, totalEquity: 3000000, accountsReceivable: 200000, inventory: 250000, cashAndEquivalents: 1500000 },
        cashFlow: { operatingCashFlow: 300000, capitalExpenditure: 150000 },
        updatedAt: Date.now(),
      },
    ];

    vi.spyOn(db, 'getStoredFinancialRecords').mockResolvedValue(mockCached);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await fetchTaiwanQuarterlyFinancials('2330');

    expect(result).toEqual(mockCached);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
