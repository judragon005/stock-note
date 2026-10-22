import { describe, it, expect } from 'vitest';
import { generateStockForensicMarkdownReport } from './stockReportExporter';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

const mockRecord: QuarterlyFinancialRecord = {
  symbol: '2330',
  market: 'TW',
  year: 2024,
  quarter: 3,
  periodDate: '2024-09-30',
  updatedAt: Date.now(),
  income: {
    revenue: 759690000000,
    grossProfit: 439000000000,
    operatingIncome: 360000000000,
    netIncome: 325260000000,
    eps: 12.54,
  },
  balanceSheet: {
    totalAssets: 5500000000000,
    totalLiabilities: 1800000000000,
    totalEquity: 3700000000000,
    accountsReceivable: 220000000000,
    inventory: 280000000000,
    cashAndEquivalents: 1500000000000,
    shortTermDebt: 100000000000,
    longTermDebt: 800000000000,
  },
  cashFlow: {
    operatingCashFlow: 450000000000,
    capitalExpenditure: 220000000000,
  },
};

describe('stockReportExporter (Ticket 15)', () => {
  it('應正確產生繁體中文 Markdown 深度財報研報，包含標的資訊、財務核心與排雷燈', () => {
    const md = generateStockForensicMarkdownReport({
      symbol: '2330',
      stockName: '台積電',
      market: 'TW',
      currentPrice: 1050,
      records: [mockRecord],
      piotroskiScore: 8,
    });

    expect(md).toContain('# 台積電 (2330) 深度財務與法務會計鑑識研報');
    expect(md).toContain('即時現價: 1050 元');
    expect(md).toContain('**Piotroski F-Score**: 8 / 9 分');
    expect(md).toContain('### 1. 近期核心損益與資產負債摘要');
    expect(md).toContain('2024Q3');
    expect(md).toContain('### 2. 法務會計排雷防雷燈檢驗');
  });

  it('當無財務記錄時，能安全回傳無數據 Markdown 報告', () => {
    const md = generateStockForensicMarkdownReport({
      symbol: '9999',
      stockName: '無資料標的',
      market: 'TW',
      currentPrice: 50,
      records: [],
    });

    expect(md).toContain('# 無資料標的 (9999)');
    expect(md).toContain('暫無足夠之歷史季度財報記錄');
  });
});
