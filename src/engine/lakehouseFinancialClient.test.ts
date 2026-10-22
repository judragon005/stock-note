import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchLakehouseFinancials,
  backfillLakehouseFinancials,
  mapLakehouseRowToQuarterlyRecord,
  mapQuarterlyRecordToLakehouseRow,
} from './lakehouseFinancialClient';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('lakehouseFinancialClient (TDD Seam)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleRecord: QuarterlyFinancialRecord = {
    symbol: '2330',
    market: 'TW',
    year: 2024,
    quarter: 3,
    periodDate: '2024-09-30',
    income: {
      revenue: 759692,
      grossProfit: 439265,
      operatingIncome: 360000,
      netIncome: 325258,
      eps: 12.54,
    },
    balanceSheet: {
      totalAssets: 6000000,
      totalLiabilities: 2000000,
      totalEquity: 4000000,
      accountsReceivable: 250000,
      inventory: 300000,
      cashAndEquivalents: 1800000,
      shortTermDebt: 50000,
      longTermDebt: 100000,
    },
    cashFlow: {
      operatingCashFlow: 400000,
      capitalExpenditure: 200000,
      dividendPaid: 80000,
    },
    updatedAt: 1700000000000,
  };

  it('1. mapQuarterlyRecordToLakehouseRow 與 mapLakehouseRowToQuarterlyRecord 應能無失真雙向轉換', () => {
    const row = mapQuarterlyRecordToLakehouseRow(sampleRecord, 'TWSE');
    expect(row.symbol).toBe('2330');
    expect(row.year).toBe(2024);
    expect(row.quarter).toBe(3);
    expect(row.revenue).toBe(759692);
    expect(row.source).toBe('TWSE');

    const restored = mapLakehouseRowToQuarterlyRecord(row, 'TW');
    expect(restored.symbol).toBe('2330');
    expect(restored.market).toBe('TW');
    expect(restored.income.netIncome).toBe(325258);
    expect(restored.balanceSheet.totalAssets).toBe(6000000);
    expect(restored.cashFlow.operatingCashFlow).toBe(400000);
  });

  it('2. fetchLakehouseFinancials 呼叫 /api/market/financials/:symbol 成功時回傳記錄', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        symbol: '2330',
        count: 1,
        data: [mapQuarterlyRecordToLakehouseRow(sampleRecord, 'TWSE')],
      }),
    } as any);

    const result = await fetchLakehouseFinancials('2330', 'TW');
    expect(fetchSpy).toHaveBeenCalledWith('/api/market/financials/2330');
    expect(result).toHaveLength(1);
    expect(result![0].symbol).toBe('2330');
    expect(result![0].income.revenue).toBe(759692);
  });

  it('3. fetchLakehouseFinancials 若中介層回傳空或 404 應回傳 null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ symbol: '9999', count: 0, data: [] }),
    } as any);

    const result = await fetchLakehouseFinancials('9999', 'TW');
    expect(result).toBeNull();
  });

  it('4. backfillLakehouseFinancials 應發送 POST /api/market/financials', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inserted: 1 }),
    } as any);

    const ok = await backfillLakehouseFinancials([sampleRecord], 'FinMind');
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/market/financials',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
});
