import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalysisMetricView } from './AnalysisMetricView';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';

describe('AnalysisMetricView Zero-Mock & Accounting Engine (Tickets 08 ~ 18)', () => {
  const dummyEmptyRecord = {
    year: 2026,
    quarter: 2,
    income: {
      revenue: 0,
      grossProfit: 0,
      operatingIncome: 0,
      netIncome: 0,
      eps: 0,
    },
    balanceSheet: {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      cashAndEquivalents: 0,
      accountsReceivable: 0,
      inventory: 0,
      shortTermDebt: 0,
      longTermDebt: 0,
    },
    cashFlow: {
      operatingCashFlow: 0,
      capitalExpenditure: 0,
    },
  } as unknown as QuarterlyFinancialRecord;

  const normalRecords = [
    {
      year: 2025,
      quarter: 1,
      income: { revenue: 2000000000, grossProfit: 800000000, operatingIncome: 500000000, netIncome: 400000000, eps: 1.0 },
      balanceSheet: { totalAssets: 10000000000, totalLiabilities: 4000000000, totalEquity: 6000000000, accountsReceivable: 500000000, inventory: 600000000, cashAndEquivalents: 1000000000, shortTermDebt: 0, longTermDebt: 0 },
      cashFlow: { operatingCashFlow: 450000000, capitalExpenditure: 150000000 },
    },
    {
      year: 2025,
      quarter: 2,
      income: { revenue: 2000000000, grossProfit: 800000000, operatingIncome: 500000000, netIncome: 400000000, eps: 1.0 },
      balanceSheet: { totalAssets: 10000000000, totalLiabilities: 4000000000, totalEquity: 6000000000, accountsReceivable: 500000000, inventory: 600000000, cashAndEquivalents: 1000000000, shortTermDebt: 0, longTermDebt: 0 },
      cashFlow: { operatingCashFlow: 450000000, capitalExpenditure: 150000000 },
    },
    {
      year: 2025,
      quarter: 3,
      income: { revenue: 2000000000, grossProfit: 800000000, operatingIncome: 500000000, netIncome: 400000000, eps: 1.0 },
      balanceSheet: { totalAssets: 10000000000, totalLiabilities: 4000000000, totalEquity: 6000000000, accountsReceivable: 500000000, inventory: 600000000, cashAndEquivalents: 1000000000, shortTermDebt: 0, longTermDebt: 0 },
      cashFlow: { operatingCashFlow: 450000000, capitalExpenditure: 150000000 },
    },
    {
      year: 2025,
      quarter: 4,
      income: { revenue: 2000000000, grossProfit: 800000000, operatingIncome: 500000000, netIncome: 400000000, eps: 1.0 },
      balanceSheet: { totalAssets: 10000000000, totalLiabilities: 4000000000, totalEquity: 6000000000, accountsReceivable: 500000000, inventory: 600000000, cashAndEquivalents: 1000000000, shortTermDebt: 0, longTermDebt: 0 },
      cashFlow: { operatingCashFlow: 450000000, capitalExpenditure: 150000000 },
    },
  ] as unknown as QuarterlyFinancialRecord[];

  it('Ticket 08: turnover_days 缺失資料時應展示空狀態，絕不可輸出 42 天、56 天、68 天假數值', () => {
    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="profitability"
        subTab="turnover_days"
        records={[dummyEmptyRecord]}
        currentPrice={100}
        annualDividends={[]}
        stockName="測試股"
        symbol="9999"
      />
    );

    expect(html).not.toContain('42 天');
    expect(html).not.toContain('56 天');
    expect(html).not.toContain('68 天');
  });

  it('Ticket 09: debt_structure 無借款科目時，絕不可輸出台泥假數值 227.6 億 或 1,454.2 億', () => {
    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="key_metrics"
        subTab="debt_structure"
        records={[dummyEmptyRecord]}
        currentPrice={100}
        annualDividends={[]}
        stockName="測試股"
        symbol="9999"
      />
    );

    expect(html).not.toContain('227.6 億');
    expect(html).not.toContain('1,454.2 億');
  });

  it('Ticket 10: cash_conversion 無法計算時，絕不可輸出 68 天假數值', () => {
    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="key_metrics"
        subTab="cash_conversion"
        records={[dummyEmptyRecord]}
        currentPrice={100}
        annualDividends={[]}
        stockName="測試股"
        symbol="9999"
      />
    );

    expect(html).not.toContain('68天');
  });

  it('Ticket 11: dividend_payout 現金股利發放率應採用全年度 4 季累計 EPS (4.0元) 計算，而非單季 EPS', () => {
    // 2025 全年 4 季累計 EPS = 4.0 元，配發現金股利 2.0 元 => 發放率應為 50%
    const dividends = [
      { year: 2025, cashDividend: 2.0, stockDividend: 0, totalDividend: 2.0 },
    ];

    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="profitability"
        subTab="dividend_payout"
        records={normalRecords}
        currentPrice={100}
        annualDividends={[]}
        companyDividends={dividends}
        stockName="測試股"
        symbol="9999"
      />
    );

    expect(html).toContain('50%');
    expect(html).not.toContain('200%');
  });

  it('Ticket 12: dupont 杜邦分析總資產週轉率應正確年化 (0.80次)，而非單季 0.20次', () => {
    // 單季營收 20 億，年化 80 億，總資產 100 億 => 週轉率應為 0.80 次
    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="profitability"
        subTab="dupont"
        records={normalRecords}
        currentPrice={100}
        annualDividends={[]}
        stockName="測試股"
        symbol="9999"
      />
    );

    expect(html).toContain('0.80次');
  });

  it('Ticket 14: 美股季配息標的應自動年化 (x4) 計算真實殖利率', () => {
    // 美股 AAPL 季配息 0.25 USD，股價 25 USD => 年化股息 1.0 USD，年化殖利率 4.00%
    const usDividends = [
      { year: 2025, cashDividend: 0.25, stockDividend: 0, totalDividend: 0.25 },
    ];

    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="valuation"
        subTab="dividend_yield"
        records={normalRecords}
        currentPrice={25}
        annualDividends={[]}
        companyDividends={usDividends}
        stockName="蘋果"
        symbol="AAPL"
      />
    );

    expect(html).toContain('4.00%');
  });

  it('Ticket 16: 金融保險股查詢時，負債比率應獲專業豁免，不標註高風險紅字警報', () => {
    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="solvency"
        subTab="capital_structure"
        records={normalRecords}
        currentPrice={100}
        annualDividends={[]}
        stockName="富邦金"
        symbol="2881"
      />
    );

    expect(html).toContain('金融保險業');
  });

  it('Ticket 17: 景氣循環股 (如台泥 1101) 在本益比河流圖應展示 P/B 優先引導警示', () => {
    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="valuation"
        subTab="pe_river"
        records={normalRecords}
        currentPrice={32}
        annualDividends={[]}
        stockName="台泥"
        symbol="1101"
      />
    );

    expect(html).toContain('景氣循環');
    expect(html).toContain('股價淨值比 P/B 河流圖');
  });

  it('Ticket 18: forensic_warning 五大排雷排毒燈模組應正確評估財務健康度', () => {
    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="key_metrics"
        subTab="forensic_warning"
        records={normalRecords}
        currentPrice={100}
        annualDividends={[]}
        stockName="正常標的"
        symbol="2330"
      />
    );

    expect(html).toContain('法務會計五大排雷排毒燈');
    expect(html).toContain('應收帳款剪刀差');
    expect(html).toContain('獲利純度');
    expect(html).toContain('自由現金流造血能力');
  });

  it('Ticket 18: 當 CFO 遠低於淨利 (獲利虛胖) 時應觸發紅燈警報', () => {
    const fraudRecords = [
      {
        year: 2025,
        quarter: 1,
        income: { revenue: 1000, grossProfit: 400, operatingIncome: 200, netIncome: 200, eps: 1.0 },
        balanceSheet: { totalAssets: 5000, totalLiabilities: 2000, totalEquity: 3000, accountsReceivable: 300, inventory: 300, cashAndEquivalents: 100 },
        cashFlow: { operatingCashFlow: 20, capitalExpenditure: 100 }, // CFO 20 / NI 200 = 10% < 80%
      },
    ] as unknown as QuarterlyFinancialRecord[];

    const html = renderToStaticMarkup(
      <AnalysisMetricView
        primaryTab="key_metrics"
        subTab="forensic_warning"
        records={fraudRecords}
        currentPrice={100}
        annualDividends={[]}
        stockName="虛胖標的"
        symbol="9998"
      />
    );

    expect(html).toContain('獲利純度不足');
  });
});
