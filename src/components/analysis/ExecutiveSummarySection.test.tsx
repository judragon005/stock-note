import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExecutiveSummarySection } from './ExecutiveSummarySection';
import { calculateInstitutionalScoring } from '../../engine/institutionalScoringEngine';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';

describe('Ticket 10 & 11: ExecutiveSummarySection 機構總覽與決策看板', () => {
  const mockRecords = [
    {
      symbol: '2330',
      market: 'TW',
      year: 2024,
      quarter: 4,
      periodDate: '2024-12-31',
      income: {
        revenue: 140000,
        grossProfit: 65000,
        operatingIncome: 38000,
        netIncome: 35000,
        eps: 3.5,
      },
      balanceSheet: {
        totalAssets: 270000,
        totalLiabilities: 75000,
        totalEquity: 195000,
        accountsReceivable: 19000,
        inventory: 15000,
        cashAndEquivalents: 75000,
      },
      cashFlow: {
        operatingCashFlow: 45000,
        capitalExpenditure: -12000,
      },
    },
  ] as unknown as QuarterlyFinancialRecord[];

  const summary = calculateInstitutionalScoring({
    records: mockRecords,
    currentPrice: 120,
    symbol: '2330',
    stockName: '台積電',
    revenueRecords: [
      { yearMonth: '2024-12', revenue: 51000, yoyRate: 21.4, isAllTimeHigh: 1 },
    ],
  });

  it('1. 應渲染總覽看板標題、綜合評級與總分', () => {
    const html = renderToStaticMarkup(
      <ExecutiveSummarySection
        summary={summary}
        symbol="2330"
        stockName="台積電"
        currentPrice={120}
        records={mockRecords}
      />
    );

    expect(html).toContain('01｜機構研究總覽 (Executive Summary)');
    expect(html).toContain('分');
    expect(html).toContain('綜合評級');
  });

  it('2. 應渲染 8 維度透明評分條目', () => {
    const html = renderToStaticMarkup(
      <ExecutiveSummarySection
        summary={summary}
        symbol="2330"
        stockName="台積電"
        currentPrice={120}
        records={mockRecords}
      />
    );

    expect(html).toContain('營收成長品質');
    expect(html).toContain('獲利能力與 ROIC');
    expect(html).toContain('現金流盈餘品質');
    expect(html).toContain('財務安全');
    expect(html).toContain('競爭優勢');
    expect(html).toContain('產業前景');
    expect(html).toContain('估值吸引力');
    expect(html).toContain('催化劑與預期差');
  });

  it('3. 應渲染「財報說了什麼」與「財報沒說什麼」雙對照欄位', () => {
    const html = renderToStaticMarkup(
      <ExecutiveSummarySection
        summary={summary}
        symbol="2330"
        stockName="台積電"
        currentPrice={120}
        records={mockRecords}
      />
    );

    expect(html).toContain('財報說了什麼 (客觀事實)');
    expect(html).toContain('財報沒說什麼 (穿透鑑識)');
  });

  it('4. 應渲染買進觀察區與失效停損條件', () => {
    const html = renderToStaticMarkup(
      <ExecutiveSummarySection
        summary={summary}
        symbol="2330"
        stockName="台積電"
        currentPrice={120}
        records={mockRecords}
      />
    );

    expect(html).toContain('實戰買進觀察區');
    expect(html).toContain('論點失效停損條件');
  });

  it('5. 應包含複製 12 位分析師投研 Prompt 與外部裁決 JSON 貼回釘選介面', () => {
    const html = renderToStaticMarkup(
      <ExecutiveSummarySection
        summary={summary}
        symbol="2330"
        stockName="台積電"
        currentPrice={120}
        records={mockRecords}
      />
    );

    expect(html).toContain('複製 12 位分析師投研 Prompt');
    expect(html).toContain('貼回外部裁決 JSON');
  });
});
