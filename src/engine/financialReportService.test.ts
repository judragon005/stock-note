import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadOrFetchFinancialReport } from './financialReportService';
import * as db from '../utils/db';
import * as twPipeline from './taiwanFinancialPipeline';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('financialReportService (TDD Seam)', () => {
  const dummyRecord: QuarterlyFinancialRecord = {
    symbol: '2330',
    market: 'TW',
    year: 2024,
    quarter: 4,
    periodDate: '2024-12-31',
    income: {
      revenue: 800000,
      grossProfit: 450000,
      operatingIncome: 350000,
      netIncome: 300000,
      eps: 11.5,
    },
    balanceSheet: {
      totalAssets: 5000000,
      totalLiabilities: 1500000,
      totalEquity: 3500000,
      accountsReceivable: 200000,
      inventory: 250000,
      cashAndEquivalents: 1200000,
      shortTermDebt: 100000,
      longTermDebt: 300000,
    },
    cashFlow: {
      operatingCashFlow: 380000,
      capitalExpenditure: 180000,
    },
    auditInfo: {
      opinionType: 'UNQUALIFIED',
      cpaFirm: '勤業眾信聯合會計師事務所',
      isBigFour: true,
    },
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. 當 IndexedDB 有快取且未強制刷新時，應優先從 DB 讀取且不發起 API 請求', async () => {
    const getStoredSpy = vi.spyOn(db, 'getStoredFinancialRecords').mockResolvedValue([dummyRecord]);
    const fetchSpy = vi.spyOn(twPipeline, 'fetchTaiwanQuarterlyFinancials');

    const report = await loadOrFetchFinancialReport('2330', 'TW', '台積電', { forceRefresh: false });

    expect(getStoredSpy).toHaveBeenCalledWith('2330');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(report.symbol).toBe('2330');
    expect(report.companyName).toBe('台積電');
    expect(report.overallScore).toBeGreaterThan(0);
  });

  it('2. 當 IndexedDB 為空時，應調用遠端管線並寫入 DB 快取', async () => {
    vi.spyOn(db, 'getStoredFinancialRecords').mockResolvedValue([]);
    const fetchSpy = vi.spyOn(twPipeline, 'fetchTaiwanQuarterlyFinancials').mockResolvedValue([dummyRecord]);
    const saveSpy = vi.spyOn(db, 'saveFinancialRecords').mockResolvedValue();

    const report = await loadOrFetchFinancialReport('2330', 'TW', '台積電');

    expect(fetchSpy).toHaveBeenCalledWith('2330', undefined);
    expect(saveSpy).toHaveBeenCalledWith([dummyRecord]);
    expect(report.overallScore).toBeGreaterThan(0);
  });
});
