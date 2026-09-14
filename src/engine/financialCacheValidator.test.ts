import { describe, it, expect } from 'vitest';
import { isFinancialRecordsCacheValid } from './financialCacheValidator';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('financialCacheValidator (TDD Seam)', () => {
  const validRecord: QuarterlyFinancialRecord = {
    symbol: '1101',
    market: 'TW',
    year: 2025,
    quarter: 2,
    periodDate: '2025-06-30',
    income: { revenue: 35000000000, grossProfit: 6000000000, operatingIncome: 2500000000, netIncome: 1800000000, eps: 0.25 },
    balanceSheet: {
      totalAssets: 500000000000,
      totalLiabilities: 250000000000,
      totalEquity: 250000000000,
      accountsReceivable: 20000000000,
      inventory: 25000000000,
      cashAndEquivalents: 70000000000,
      currentAssets: 150000000000,
      currentLiabilities: 100000000000,
      capitalStock: 75000000000,
    },
    cashFlow: {
      operatingCashFlow: 8000000000,
      capitalExpenditure: 3000000000,
    },
    updatedAt: Date.now(),
  };

  it('1. 具備三大表科目完整且權益與負債均非 0 之快取應判定為有效', () => {
    expect(isFinancialRecordsCacheValid([validRecord])).toBe(true);
  });

  it('2. 空陣列快取應判定為無效', () => {
    expect(isFinancialRecordsCacheValid([])).toBe(false);
  });

  it('3. 當所有紀錄的總負債皆為 0 時（舊版單表殘缺毒害快取），應判定為無效以觸發自癒', () => {
    const poisonedRecord: QuarterlyFinancialRecord = {
      ...validRecord,
      balanceSheet: {
        ...validRecord.balanceSheet,
        totalLiabilities: 0,
      },
    };
    expect(isFinancialRecordsCacheValid([poisonedRecord])).toBe(false);
  });

  it('4. 當所有紀錄的股東權益皆為 0 時，應判定為無效以觸發自癒', () => {
    const poisonedRecord: QuarterlyFinancialRecord = {
      ...validRecord,
      balanceSheet: {
        ...validRecord.balanceSheet,
        totalEquity: 0,
      },
    };
    expect(isFinancialRecordsCacheValid([poisonedRecord])).toBe(false);
  });

  it('5. 當無現金流量且無資產負債時，應判定為無效', () => {
    const emptyRecord: QuarterlyFinancialRecord = {
      ...validRecord,
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
    expect(isFinancialRecordsCacheValid([emptyRecord])).toBe(false);
  });
});
