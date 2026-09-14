import { describe, it, expect } from 'vitest';
import {
  resolveLatestAuditedRecord,
  getGradeInlineStyle,
  getIndustryBadgeInfo,
  getTrafficLightBadgeInfo,
} from './FinancialHeroLayer';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';

describe('FinancialHeroLayer UI Helper Functions (TDD Seam)', () => {
  const mockQuarter2025Q2: QuarterlyFinancialRecord = {
    symbol: '2327',
    market: 'TW',
    year: 2025,
    quarter: 2,
    periodDate: '2025-06-30',
    income: {
      revenue: 30000000000,
      grossProfit: 11000000000,
      operatingIncome: 6000000000,
      netIncome: 5000000000,
      eps: 5.2,
    },
    balanceSheet: {
      totalAssets: 120000000000,
      totalLiabilities: 48000000000,
      totalEquity: 72000000000,
      accountsReceivable: 15000000000,
      inventory: 18000000000,
      cashAndEquivalents: 25000000000,
    },
    cashFlow: {
      operatingCashFlow: 8000000000,
      capitalExpenditure: 3000000000,
    },
    auditInfo: {
      opinionType: 'UNQUALIFIED',
      cpaFirm: '安侯建業聯合會計師事務所',
      isBigFour: true,
    },
    updatedAt: Date.now(),
  };

  const mockShell2026Q2: QuarterlyFinancialRecord = {
    ...mockQuarter2025Q2,
    year: 2026,
    quarter: 2,
    periodDate: '2026-06-30',
    income: {
      revenue: 35000000000,
      grossProfit: 12000000000,
      operatingIncome: 0,
      netIncome: 0,
      eps: 0,
    },
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

  it('1. 當首項為空殼季 2026-Q2 時，resolveLatestAuditedRecord 應自動排除並錨定 2025-Q2', () => {
    const records = [mockShell2026Q2, mockQuarter2025Q2];
    const resolved = resolveLatestAuditedRecord(records, '2025-Q2');
    expect(resolved).not.toBeNull();
    expect(resolved?.year).toBe(2025);
    expect(resolved?.quarter).toBe(2);
    expect(resolved?.balanceSheet.totalAssets).toBe(120000000000);
  });

  it('2. 當未指定 latestPeriod 或該季為空殼時，自動挑選第一筆完整申報季', () => {
    const records = [mockShell2026Q2, mockQuarter2025Q2];
    const resolved = resolveLatestAuditedRecord(records);
    expect(resolved).not.toBeNull();
    expect(resolved?.year).toBe(2025);
    expect(resolved?.quarter).toBe(2);
  });

  it('3. 空紀錄時安全回傳 null', () => {
    expect(resolveLatestAuditedRecord([])).toBeNull();
  });

  it('4. 體質評級樣式對齊正確色彩代碼', () => {
    const exc = getGradeInlineStyle('EXCELLENT');
    expect(exc.color).toBe('#34d399');

    const dan = getGradeInlineStyle('DANGEROUS');
    expect(dan.color).toBe('#fb7185');
  });

  it('5. 金融業產業標籤回傳豁免警語', () => {
    const fin = getIndustryBadgeInfo('FINANCIALS');
    expect(fin.label).toContain('金融保險業');
    expect(fin.exemptNote).toContain('豁免');
  });

  it('6. 體質燈號狀態解析正確', () => {
    const red = getTrafficLightBadgeInfo('RED');
    expect(red.text).toBe('重大風險');
    const green = getTrafficLightBadgeInfo('GREEN');
    expect(green.text).toBe('正常健全');
  });
});
