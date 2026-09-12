import { describe, it, expect } from 'vitest';
import {
  resolveDisplayTitle,
  filterHistoricalRecordsByQuarter,
} from './FinancialForensicModal';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';

describe('FinancialForensicModal (Modal Integration & Helper Tests)', () => {
  const sampleRecords: QuarterlyFinancialRecord[] = [
    {
      symbol: '2330',
      market: 'TW',
      year: 2024,
      quarter: 1,
      periodDate: '2024-03-31',
      income: { revenue: 592644, grossProfit: 314000, operatingIncome: 249000, netIncome: 225485, eps: 8.7 },
      balanceSheet: { totalAssets: 5500000, totalLiabilities: 1800000, totalEquity: 3700000, accountsReceivable: 220000, inventory: 280000, cashAndEquivalents: 1400000 },
      cashFlow: { operatingCashFlow: 350000, capitalExpenditure: 150000 },
      updatedAt: Date.now(),
    },
    {
      symbol: '2330',
      market: 'TW',
      year: 2024,
      quarter: 2,
      periodDate: '2024-06-30',
      income: { revenue: 673510, grossProfit: 358000, operatingIncome: 286000, netIncome: 247845, eps: 9.56 },
      balanceSheet: { totalAssets: 5700000, totalLiabilities: 1900000, totalEquity: 3800000, accountsReceivable: 230000, inventory: 290000, cashAndEquivalents: 1450000 },
      cashFlow: { operatingCashFlow: 370000, capitalExpenditure: 160000 },
      updatedAt: Date.now(),
    },
  ];

  it('1. 彈窗標題與代碼公司名稱正確解析', () => {
    expect(resolveDisplayTitle('2330', '台積電')).toBe('2330 台積電 穿透式財報戰情室');
    expect(resolveDisplayTitle('NVDA')).toBe('NVDA 穿透式財報戰情室');
  });

  it('2. 季度歷史紀錄限制至多 8 季並由遠至近排序', () => {
    const sorted = filterHistoricalRecordsByQuarter(sampleRecords, 8);
    expect(sorted.length).toBe(2);
    expect(sorted[0].quarter).toBe(1);
    expect(sorted[1].quarter).toBe(2);
  });
});
