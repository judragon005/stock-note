import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EightQuarterStatementTable } from './EightQuarterStatementTable';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';

const MOCK_RECORDS: QuarterlyFinancialRecord[] = [
  {
    year: 2025,
    quarter: 3,
    revenue: 500000000,
    grossProfit: 250000000,
    operatingProfit: 150000000,
    netIncome: 120000000,
    eps: 4.5,
    operatingCashFlow: 180000000,
    freeCashFlow: 100000000,
    totalAssets: 2000000000,
    totalLiabilities: 800000000,
    shareholdersEquity: 1200000000,
  },
  {
    year: 2025,
    quarter: 4,
    revenue: 550000000,
    grossProfit: 280000000,
    operatingProfit: 170000000,
    netIncome: 140000000,
    eps: 5.2,
    operatingCashFlow: 200000000,
    freeCashFlow: 120000000,
    totalAssets: 2100000000,
    totalLiabilities: 820000000,
    shareholdersEquity: 1280000000,
  },
];

describe('EightQuarterStatementTable (Spec 0205 / Ticket 04)', () => {
  it('當 records 為空時應呈現暫無歷史數據提示', () => {
    const html = renderToStaticMarkup(
      <EightQuarterStatementTable records={[]} stockName="台積電" symbol="2330" />
    );
    expect(html).toContain('暫無歷史 8 季財務報表數據');
  });

  it('當有 records 時應正確渲染三表切換標籤與財務欄位', () => {
    const html = renderToStaticMarkup(
      <EightQuarterStatementTable records={MOCK_RECORDS} stockName="台積電" symbol="2330" />
    );
    expect(html).toContain('全部三表');
    expect(html).toContain('損益表');
    expect(html).toContain('資產負債表');
    expect(html).toContain('現金流量表');
    expect(html).toContain('營業收入');
    expect(html).toContain('毛利率');
    expect(html).toContain('每股盈餘 EPS (元)');
  });
});
