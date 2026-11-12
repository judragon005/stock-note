import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DividendKpiSummary } from './DividendKpiSummary';

describe('DividendKpiSummary (四大發光 KPI 摘要面板)', () => {
  const defaultProps = {
    selectedYear: 2026,
    dividendDisplayMode: 'NET' as const,
    onToggleDisplayMode: vi.fn(),
    currentYearGrossTWD: 100000,
    currentYearNetTWD: 95000,
    currentYearTaxTWD: 5000,
    yoyGrowthPercent: 12.5,
    trailing12mDividendsTWD: 120000,
    totalReceivableTWD: 30000,
    receivablePendingCount: 3,
    totalHistoricalNetTWD: 500000,
    nhiAlertCount: 1,
    pendingStockSharesTotal: 500,
    estimatedLoanInterestTWD: 20000,
    totalWireFeesTWD: 40,
  };

  it('應正確呈現實領淨額與毛額對帳資訊', () => {
    const html = renderToStaticMarkup(<DividendKpiSummary {...defaultProps} />);
    expect(html).toContain('NT$ 95,000');
    expect(html).toContain('2026 年度配息總額');
    expect(html).toContain('存摺實領');
    expect(html).toContain('券商對帳');
  });

  it('若有借貸利息支出，應呈現扣除利息後的實質淨現金流', () => {
    const html = renderToStaticMarkup(<DividendKpiSummary {...defaultProps} />);
    // 95000 - 20000 = 75000
    expect(html).toContain('NT$ 75,000');
    expect(html).toContain('扣除質押利息淨現金流');
  });

  it('應正確呈現待入庫股票股利股數與累計匯費', () => {
    const html = renderToStaticMarkup(<DividendKpiSummary {...defaultProps} />);
    expect(html).toContain('500 股');
    expect(html).toContain('NT$ 40');
    expect(html).toContain('累計跨行匯費');
  });

  it('切換為 GROSS 模式時應呈現應發毛額 100,000', () => {
    const html = renderToStaticMarkup(
      <DividendKpiSummary {...defaultProps} dividendDisplayMode="GROSS" />
    );
    expect(html).toContain('NT$ 100,000');
  });
});
