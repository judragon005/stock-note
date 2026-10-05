import { describe, it, expect } from 'vitest';
import { parseSecCompanyFactsToRecords } from './secEdgarParser';

describe('Ticket 08: SEC EDGAR US-GAAP Tri-Statement Parser', () => {
  const mockSecFacts = {
    cik: 320193,
    entityName: 'Apple Inc.',
    facts: {
      'us-gaap': {
        Revenues: {
          label: 'Revenue',
          units: {
            USD: [
              { end: '2025-03-31', val: 90000000000, fy: 2025, fp: 'Q2', form: '10-Q' },
              { end: '2025-06-30', val: 95000000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            ],
          },
        },
        GrossProfit: {
          units: {
            USD: [
              { end: '2025-03-31', val: 42000000000, fy: 2025, fp: 'Q2', form: '10-Q' },
              { end: '2025-06-30', val: 44000000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            ],
          },
        },
        OperatingIncomeLoss: {
          units: {
            USD: [
              { end: '2025-03-31', val: 28000000000, fy: 2025, fp: 'Q2', form: '10-Q' },
              { end: '2025-06-30', val: 30000000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            ],
          },
        },
        NetIncomeLoss: {
          units: {
            USD: [
              { end: '2025-03-31', val: 24000000000, fy: 2025, fp: 'Q2', form: '10-Q' },
              { end: '2025-06-30', val: 25000000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            ],
          },
        },
        Assets: {
          units: {
            USD: [
              { end: '2025-03-31', val: 340000000000, fy: 2025, fp: 'Q2', form: '10-Q' },
              { end: '2025-06-30', val: 350000000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            ],
          },
        },
        Liabilities: {
          units: {
            USD: [
              { end: '2025-03-31', val: 270000000000, fy: 2025, fp: 'Q2', form: '10-Q' },
              { end: '2025-06-30', val: 280000000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            ],
          },
        },
        EarningsPerShareDiluted: {
          units: {
            'USD/shares': [
              { end: '2025-03-31', val: 1.53, fy: 2025, fp: 'Q2', form: '10-Q' },
              { end: '2025-06-30', val: 1.62, fy: 2025, fp: 'Q3', form: '10-Q' },
            ],
          },
        },
      },
    },
  };

  it('1. parseSecCompanyFactsToRecords 應正確將 SEC Facts 聚合為季度紀錄', () => {
    const records = parseSecCompanyFactsToRecords('AAPL', mockSecFacts);
    expect(records.length).toBe(2);

    const q2 = records.find((r) => r.year === 2025 && r.quarter === 2);
    expect(q2).toBeDefined();
    expect(q2?.income.revenue).toBe(90000000000);
    expect(q2?.income.grossProfit).toBe(42000000000);
    expect(q2?.income.operatingIncome).toBe(28000000000);
    expect(q2?.income.netIncome).toBe(24000000000);
    expect(q2?.balanceSheet.totalAssets).toBe(340000000000);
    expect(q2?.balanceSheet.totalLiabilities).toBe(270000000000);
    expect(q2?.balanceSheet.totalEquity).toBe(70000000000); // 3400億 - 2700億
    expect(q2?.income.eps).toBe(1.53);
    expect(q2?.symbol).toBe('AAPL');
    expect(q2?.market).toBe('US');

    const q3 = records.find((r) => r.year === 2025 && r.quarter === 3);
    expect(q3?.income.revenue).toBe(95000000000);
    expect(q3?.income.eps).toBe(1.62);
  });

  it('2. 當輸入空 facts 或無效資料時應回傳空陣列', () => {
    expect(parseSecCompanyFactsToRecords('AAPL', null)).toEqual([]);
    expect(parseSecCompanyFactsToRecords('AAPL', {})).toEqual([]);
    expect(parseSecCompanyFactsToRecords('AAPL', { facts: {} })).toEqual([]);
  });
});
