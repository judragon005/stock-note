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

  it('3. 當本地快取屬於殘缺舊資料 (CFO 與資產全為 0) 時，應自動判定為無效快取並觸發遠端重撈自癒', async () => {
    // 模擬先前舊版存留之單表殘缺快取 (無 CFO，無資產負債)
    const staleRecord: QuarterlyFinancialRecord = {
      ...dummyRecord,
      balanceSheet: {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        accountsReceivable: 0,
        inventory: 0,
        cashAndEquivalents: 0,
      },
      cashFlow: {
        operatingCashFlow: 0,
        capitalExpenditure: 0,
      },
    };

    vi.spyOn(db, 'getStoredFinancialRecords').mockResolvedValue([staleRecord]);
    const fetchSpy = vi.spyOn(twPipeline, 'fetchTaiwanQuarterlyFinancials').mockResolvedValue([dummyRecord]);
    const saveSpy = vi.spyOn(db, 'saveFinancialRecords').mockResolvedValue();

    const report = await loadOrFetchFinancialReport('2330', 'TW', '台積電', { forceRefresh: false });

    // 應識別舊快取殘缺，自動發起遠端拉取以自癒
    expect(fetchSpy).toHaveBeenCalledWith('2330', undefined);
    expect(saveSpy).toHaveBeenCalledWith([dummyRecord]);
    expect(report.trafficLights.cashFlow).not.toBe('GRAY');
  });

  it('4. 當遠端 API 拋出 429 或網路斷線時，若本地有既有資料應降級回傳，絕不拋錯白屏 (Spec 0202 - Ticket 04)', async () => {
    vi.spyOn(db, 'getStoredFinancialRecords').mockResolvedValue([dummyRecord]);
    // 強制刷新以觸發遠端請求，但遠端模擬 429 限流拋錯
    vi.spyOn(twPipeline, 'fetchTaiwanQuarterlyFinancials').mockRejectedValue(new Error('HTTP 429: Too Many Requests'));

    const report = await loadOrFetchFinancialReport('2330', 'TW', '台積電', { forceRefresh: true });

    // 應捕捉錯誤並降級回退既有快取，保證報告可用
    expect(report.symbol).toBe('2330');
    expect(report.historicalRecords).toHaveLength(1);
    expect(report.overallScore).toBeGreaterThan(0);
  });

  it('5. 當遠端 API 失敗且完全無本地快取時，應優雅回傳安全保底空報告，防止畫面崩潰', async () => {
    vi.spyOn(db, 'getStoredFinancialRecords').mockResolvedValue([]);
    vi.spyOn(twPipeline, 'fetchTaiwanQuarterlyFinancials').mockRejectedValue(new Error('Network Offline / 429'));

    const report = await loadOrFetchFinancialReport('2330', 'TW', '台積電');

    expect(report.symbol).toBe('2330');
    expect(report.historicalRecords).toHaveLength(0);
    expect(report.overallScore).toBe(0);
  });
});
