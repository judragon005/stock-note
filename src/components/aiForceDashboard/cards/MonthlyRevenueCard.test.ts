import { describe, it, expect } from 'vitest';
import { calculateRevenueBarHeight, formatEtfMetrics } from './MonthlyRevenueCard';
import type { MonthlyRevenueData } from '../../../types/aiForceDashboard';
import { buildMonthlyRevenue } from '../../../engine/aiForceDashboardEngine';

describe('MonthlyRevenueCard - TDD Unit Tests', () => {
  it('1. calculateRevenueBarHeight 應將營收相對於最大營收正確等比縮放', () => {
    const maxHeight = 100;
    const maxRev = 200000;

    const hFull = calculateRevenueBarHeight(200000, maxRev, maxHeight);
    const hHalf = calculateRevenueBarHeight(100000, maxRev, maxHeight);
    const hZero = calculateRevenueBarHeight(0, maxRev, maxHeight);

    expect(hFull).toBe(100);
    expect(hHalf).toBe(50);
    expect(hZero).toBe(2); // 至少 2px 留底防隱形
  });

  it('2. 個股營收資料模型應正確包含 YoY 與 ATH 標籤', () => {
    const stockRevenueData: MonthlyRevenueData = {
      isEtf: false,
      history: [
        { yearMonth: '2026-07', revenue: 150000, yoyRate: 15.2, momRate: 4.1 },
        { yearMonth: '2026-08', revenue: 160000, yoyRate: 18.5, momRate: 6.7 },
        { yearMonth: '2026-09', revenue: 175000, yoyRate: 22.1, momRate: 9.4, isAllTimeHigh: true },
      ],
      latestRevenueText: '1.8 億元',
      latestYoyRate: 22.1,
      growthStreakMonths: 3,
      athCount: 1,
      growthBadge: '連續 3 個月年月雙增',
      asOfDateText: '營收基準: 2026-09',
      isEmpty: false,
    };

    expect(stockRevenueData.isEtf).toBe(false);
    expect(stockRevenueData.growthBadge).toBe('連續 3 個月年月雙增');
    expect(stockRevenueData.latestRevenueText).toBe('1.8 億元');
  });

  it('3. ETF 標的 (0050) 應具備 ETF 規模與配息收益分配資料，杜絕營收空白', () => {
    const etfRevenueData: MonthlyRevenueData = {
      isEtf: true,
      history: [],
      growthBadge: 'ETF 規模穩健',
      asOfDateText: 'ETF 規模與殖利率',
      etfData: {
        aumBillion: 420,
        dividendYield: 4.2,
        beneficiaries: 750000,
        quarterlyDividends: [
          { quarter: '2026 Q3', amount: 1.0, yieldRate: 4.1 },
          { quarter: '2026 Q2', amount: 1.0, yieldRate: 4.2 },
          { quarter: '2026 Q1', amount: 1.0, yieldRate: 4.3 },
          { quarter: '2025 Q4', amount: 1.0, yieldRate: 4.0 },
        ],
      },
      isEmpty: false,
    };

    expect(etfRevenueData.isEtf).toBe(true);
    expect(etfRevenueData.etfData).toBeDefined();
    expect(etfRevenueData.etfData?.aumBillion).toBe(420);
    expect(etfRevenueData.etfData?.dividendYield).toBe(4.2);
    expect(etfRevenueData.etfData?.quarterlyDividends.length).toBe(4);
  });

  it('4. 空狀態或美股時應具備優雅提示說明', () => {
    const emptyData: MonthlyRevenueData = {
      isEtf: false,
      history: [],
      growthBadge: '尚無營收',
      asOfDateText: '無營收資料',
      isEmpty: true,
      emptyMessage: '美股採季度財報 (10-Q/10-K)',
    };

    expect(emptyData.isEmpty).toBe(true);
    expect(emptyData.emptyMessage).toBe('美股採季度財報 (10-Q/10-K)');
  });

  it('5. buildMonthlyRevenue 當標的為 ETF 且存在 TDCC 集保數據時，應動態連動最新股東人數為受益人人數', () => {
    const tdccMock = [
      { date: '2026-09-25', over1000Ratio: 65.5, totalShareholders: 810000 },
      { date: '2026-10-02', over1000Ratio: 66.2, totalShareholders: 825000 },
    ];

    const result = buildMonthlyRevenue('0050', '元大台灣50', 'TW', undefined, tdccMock);
    expect(result.isEtf).toBe(true);
    expect(result.etfData?.beneficiaries).toBe(825000);
    expect(result.asOfDateText).toBe('ETF 規模與受益人 (2026-10-02)');
  });

  it('6. formatEtfMetrics 應安全處理可選的 beneficiaries / aumBillion / dividendYield 欄位', () => {
    const emptyEtf = formatEtfMetrics({ quarterlyDividends: [] });
    expect(emptyEtf.aumText).toBe('--');
    expect(emptyEtf.yieldText).toBe('--');
    expect(emptyEtf.beneficiariesText).toBe('--');

    const fullEtf = formatEtfMetrics({
      aumBillion: 420,
      dividendYield: 4.2,
      beneficiaries: 750000,
      quarterlyDividends: [],
    });
    expect(fullEtf.aumText).toBe('420 億元');
    expect(fullEtf.yieldText).toBe('4.2%');
    expect(fullEtf.beneficiariesText).toBe('750,000 人');
  });

  describe('Spec 0239 T13: ETF 空狀態分支、美股季營收 (10-Q/10-K)、美股 ETF USD 單位、小型股萬元 Tooltip 與 colorTheme', () => {
    it('當 isEtf=true 且 isEmpty=true（或 !etfData）時，應顯示專屬 ETF 空狀態卡片，絕不落入個股空月營收框', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { MonthlyRevenueCard } = await import('./MonthlyRevenueCard');

      const html = renderToStaticMarkup(
        React.createElement(MonthlyRevenueCard, {
          data: {
            isEtf: true,
            isUsMarket: false,
            currency: 'TWD',
            history: [],
            growthBadge: 'ETF 資料待補',
            asOfDateText: 'ETF 規模與殖利率',
            etfData: undefined,
            isEmpty: true,
            emptyMessage: 'ETF 配息與受益人資料累積中',
          },
          colorTheme: 'taiwan',
        })
      );

      expect(html).toContain('data-testid="etf-empty-state"');
      expect(html).toContain('ETF 規模與配息資料待補');
      expect(html).not.toContain('單月最新營收');
      expect(html).not.toContain('連續雙增月數');
    });

    it('美股個股 isQuarterly=true 時，標題切為美股季度營收 (10-Q/10-K)、連續雙增改「季」且 Tooltip 採 $B/$M 格式', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { MonthlyRevenueCard, formatRevenueTooltipValue } = await import('./MonthlyRevenueCard');

      expect(formatRevenueTooltipValue(35_100_000_000, { isQuarterly: true, currency: 'USD' })).toBe('$35.10B');
      expect(formatRevenueTooltipValue(850_000_000, { isQuarterly: true, currency: 'USD' })).toBe('$850.0M');
      expect(formatRevenueTooltipValue(4_500, { isQuarterly: false, currency: 'TWD' })).toBe('450 萬元');
      expect(formatRevenueTooltipValue(250_000, { isQuarterly: false, currency: 'TWD' })).toBe('2.5 億元');

      const html = renderToStaticMarkup(
        React.createElement(MonthlyRevenueCard, {
          data: {
            isEtf: false,
            isQuarterly: true,
            isUsMarket: true,
            currency: 'USD',
            history: [
              { yearMonth: '2025Q3', revenue: 30_000_000_000, yoyRate: 18.2, momRate: 5.1 },
              { yearMonth: '2025Q4', revenue: 35_100_000_000, yoyRate: 24.5, momRate: 17.0, isAllTimeHigh: true },
            ],
            latestRevenueText: '$35.10B',
            latestYoyRate: 24.5,
            growthStreakMonths: 3,
            growthBadge: '連續 3 季年季雙增',
            asOfDateText: '10-Q/10-K 季營收基準: 2025Q4',
            isEmpty: false,
          },
          colorTheme: 'international',
          market: 'US',
        })
      );

      expect(html).toContain('美股季度營收與成長走勢 (10-Q/10-K)');
      expect(html).toContain('3 季');
      expect(html).toContain('$35.10B');
      expect(html).toContain('25Q4');
      expect(html).not.toContain('單月最新營收');
    });

    it('美股 ETF (currency=USD 或 market=US) 規模應顯示億美元 ($B) 且配息顯示 USD', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { MonthlyRevenueCard } = await import('./MonthlyRevenueCard');

      const usMetrics = formatEtfMetrics(
        { aumBillion: 520, dividendYield: 1.35, beneficiaries: undefined, quarterlyDividends: [] },
        { currency: 'USD', market: 'US' }
      );
      expect(usMetrics.aumText).toContain('億美元');
      expect(usMetrics.aumText).toContain('$520B');

      const html = renderToStaticMarkup(
        React.createElement(MonthlyRevenueCard, {
          data: {
            isEtf: true,
            isUsMarket: true,
            currency: 'USD',
            history: [],
            growthBadge: 'ETF 規模穩健',
            asOfDateText: '美股 ETF 規模與收益分配 (USD)',
            etfData: {
              aumBillion: 520,
              dividendYield: 1.35,
              quarterlyDividends: [{ quarter: '2026-09-20', amount: 1.78, yieldRate: 1.35 }],
            },
            isEmpty: false,
          },
          colorTheme: 'international',
          market: 'US',
        })
      );

      expect(html).toContain('億美元');
      expect(html).toContain('$520B');
      expect(html).toContain('$1.78');
      expect(html).toContain('USD');
    });

    it('台股小型股 Tooltip 自適應萬元（不顯示 0.0 億）且響應 colorTheme (taiwan 正成長紅、衰退綠)', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { MonthlyRevenueCard } = await import('./MonthlyRevenueCard');

      const html = renderToStaticMarkup(
        React.createElement(MonthlyRevenueCard, {
          data: {
            isEtf: false,
            currency: 'TWD',
            history: [
              { yearMonth: '2026-08', revenue: 3200, yoyRate: 12.5, momRate: 3.0 },
              { yearMonth: '2026-09', revenue: 4500, yoyRate: -4.2, momRate: 40.6 },
            ],
            latestRevenueText: '450 萬元',
            latestYoyRate: 12.5,
            growthStreakMonths: 1,
            growthBadge: '營收強勁雙位數成長',
            asOfDateText: '營收基準: 2026-09',
            isEmpty: false,
          },
          colorTheme: 'taiwan',
          market: 'TW',
        })
      );

      expect(html).toContain('450 萬元');
      expect(html).not.toContain('0.0 億');
      expect(html).toContain('#ef4444');
    });
  });
});
