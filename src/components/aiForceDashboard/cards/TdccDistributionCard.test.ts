import { describe, it, expect } from 'vitest';
import {
  calculateTdccScales,
  projectTdccRatioToY,
  projectTdccShareholdersToY,
} from './TdccDistributionCard';
import type { TdccDistributionData } from '../../../types/aiForceDashboard';

describe('TdccDistributionCard - TDD Unit Tests', () => {
  const mockHistory = [
    { date: '2026-09-04', totalShareholders: 850000, over1000Ratio: 65.2 },
    { date: '2026-09-11', totalShareholders: 848000, over1000Ratio: 65.8 },
    { date: '2026-09-18', totalShareholders: 845000, over1000Ratio: 66.5 },
    { date: '2026-09-25', totalShareholders: 840000, over1000Ratio: 67.4 },
  ];

  it('1. 空數據時 calculateTdccScales 應回傳預設保底範圍', () => {
    const scales = calculateTdccScales([], 200);
    expect(scales.leftMin).toBe(0);
    expect(scales.leftMax).toBe(100);
    expect(scales.rightMin).toBe(0);
    expect(scales.rightMax).toBe(1000000);
  });

  it('2. 正常數據時 calculateTdccScales 應依據大戶比例與股東人數計算極值並預留邊界', () => {
    const scales = calculateTdccScales(mockHistory, 200);
    expect(scales.leftMin).toBeLessThan(65.2);
    expect(scales.leftMax).toBeGreaterThan(67.4);
    expect(scales.rightMin).toBeLessThan(840000);
    expect(scales.rightMax).toBeGreaterThan(850000);
  });

  it('3. projectTdccRatioToY 應將較高持股比例投影為較小的 Y 座標 (靠近 SVG 頂端)', () => {
    const scales = calculateTdccScales(mockHistory, 200);
    const yLow = projectTdccRatioToY(65.2, scales, 200);
    const yHigh = projectTdccRatioToY(67.4, scales, 200);

    expect(yHigh).toBeLessThan(yLow);
    expect(yHigh).toBeGreaterThanOrEqual(10); // 考慮頂部留白
  });

  it('4. projectTdccShareholdersToY 應將較多股東人數投影為較小的 Y 座標', () => {
    const scales = calculateTdccScales(mockHistory, 200);
    const yFew = projectTdccShareholdersToY(840000, scales, 200);
    const yMany = projectTdccShareholdersToY(850000, scales, 200);

    expect(yMany).toBeLessThan(yFew);
  });

  it('5. 驗證完整 TdccDistributionData 結構與空狀態防禦', () => {
    const emptyData: TdccDistributionData = {
      history: [],
      concentrationBadge: '美股不適用',
      asOfDateText: '美股市場',
      isEmpty: true,
      emptyMessage: '美股無集保機制 (採 13F 機構申報)',
    };

    expect(emptyData.isEmpty).toBe(true);
    expect(emptyData.emptyMessage).toBe('美股無集保機制 (採 13F 機構申報)');
  });

  it('6. 當 history 為空或標註 isEmpty 時，應渲染帶有 data-testid="tdcc-empty-state" 的 Honest Empty State 節點', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TdccDistributionCard } = await import('./TdccDistributionCard');

    const emptyData: TdccDistributionData = {
      history: [],
      concentrationBadge: '美股不適用',
      asOfDateText: '美股市場',
      isEmpty: true,
      emptyMessage: '美股無集保機制 (採 13F 機構申報)',
    };

    const html = renderToStaticMarkup(
      React.createElement(TdccDistributionCard, { data: emptyData, colorTheme: 'international' })
    );

    expect(html).toContain('data-testid="tdcc-empty-state"');
    expect(html).toContain('美股無集保機制 (採 13F 機構申報)');
  });

  it('7. Ticket 01A: 當 data.symbol 存在時，標題應顯式包含標的代碼確認 (如 CARD 19 · 2330 TDCC 集保趨勢)', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TdccDistributionCard } = await import('./TdccDistributionCard');

    const data: TdccDistributionData = {
      symbol: '2330',
      history: mockHistory,
      latestOver1000Ratio: 67.4,
      latestShareholders: 840000,
      change4WeeksRatio: 2.2,
      change4WeeksShareholders: -10000,
      concentrationBadge: '籌碼高度集中 (波段起漲)',
      asOfDateText: '集保基準日: 2026-09-25',
      isEmpty: false,
    };

    const html = renderToStaticMarkup(
      React.createElement(TdccDistributionCard, { data, colorTheme: 'taiwan' })
    );

    expect(html).toContain('2330');
    expect(html).toContain('TDCC 集保趨勢');
  });

  it('8. Ticket 01A: 當提供散戶持股比 (under10Ratio) 且大戶增持散戶退場時，應渲染散戶剪刀差狀態', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TdccDistributionCard } = await import('./TdccDistributionCard');

    const data: TdccDistributionData = {
      symbol: '0050',
      history: [
        { date: '2026-09-04', totalShareholders: 850000, over1000Ratio: 65.2, under10Ratio: 18.5 },
        { date: '2026-09-25', totalShareholders: 840000, over1000Ratio: 67.4, under10Ratio: 16.2 },
      ],
      latestOver1000Ratio: 67.4,
      latestUnder10Ratio: 16.2,
      change4WeeksRatio: 2.2,
      change4WeeksUnder10Ratio: -2.3,
      retailScissorsText: '大戶增持·散戶退場 (籌碼集中)',
      latestShareholders: 840000,
      concentrationBadge: '籌碼高度集中 (波段起漲)',
      asOfDateText: '集保基準日: 2026-09-25',
      isEmpty: false,
    };

    const html = renderToStaticMarkup(
      React.createElement(TdccDistributionCard, { data, colorTheme: 'taiwan' })
    );

    expect(html).toContain('散戶持股比 (10張以下)');
    expect(html).toContain('16.20%');
    expect(html).toContain('大戶增持·散戶退場 (籌碼集中)');
  });

  it('9. Ticket 01A: 驗證 buildTdccDistribution 引擎能正確攜帶 symbol 並計算散戶剪刀差指標', async () => {
    const { buildTdccDistribution } = await import('../../../engine/aiForceDashboardEngine');

    const records = [
      { date: '2026-09-04', totalShareholders: 850000, over1000Ratio: 65.2, under10Ratio: 18.5 },
      { date: '2026-09-11', totalShareholders: 848000, over1000Ratio: 65.8, under10Ratio: 18.0 },
      { date: '2026-09-18', totalShareholders: 845000, over1000Ratio: 66.5, under10Ratio: 17.1 },
      { date: '2026-09-25', totalShareholders: 840000, over1000Ratio: 67.4, under10Ratio: 16.2 },
    ];

    const result = buildTdccDistribution(records, 'TW', '2330');

    expect(result.symbol).toBe('2330');
    expect(result.latestOver1000Ratio).toBe(67.4);
    expect(result.latestUnder10Ratio).toBe(16.2);
    expect(result.change4WeeksRatio).toBe(2.2);
    expect(result.change4WeeksUnder10Ratio).toBe(-2.3);
    expect(result.retailScissorsText).toBe('大戶增持·散戶退場 (籌碼集中)');
    expect(result.concentrationBadge).toBe('籌碼高度集中 (波段起漲)');
  });

  it('10. Ticket 01B: 美股模式具備 us13fData 時，標題切換為美股機構持股與放空籌碼，不呈現 empty state', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TdccDistributionCard } = await import('./TdccDistributionCard');

    const data: TdccDistributionData = {
      symbol: 'AAPL',
      isUsMarket: true,
      history: [],
      concentrationBadge: '機構高度控盤',
      asOfDateText: '13F 最新申報',
      isEmpty: false,
      us13fData: {
        institutionalRatio: 62.5,
        shortFloatRatio: 3.2,
        insiderRatio: 7.8,
        publicFloatRatio: 26.5,
        isSqueezeRisk: false,
        asOfQuarterText: 'SEC 13F 季度申報',
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(TdccDistributionCard, { data, colorTheme: 'international' })
    );

    expect(html).not.toContain('data-testid="tdcc-empty-state"');
    expect(html).toContain('美股機構持股與放空籌碼');
    expect(html).toContain('機構持股比 (13F)');
    expect(html).toContain('62.50%');
  });

  it('11. Ticket 01B: 當 Short Float > 10% 時應發出軋空警戒 (Squeeze Alert)', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TdccDistributionCard } = await import('./TdccDistributionCard');

    const data: TdccDistributionData = {
      symbol: 'GME',
      isUsMarket: true,
      history: [],
      concentrationBadge: '軋空警戒 (Squeeze Alert)',
      asOfDateText: 'FINRA 最新結算',
      isEmpty: false,
      us13fData: {
        institutionalRatio: 35.0,
        shortFloatRatio: 22.5,
        insiderRatio: 12.0,
        publicFloatRatio: 30.5,
        isSqueezeRisk: true,
        asOfQuarterText: 'FINRA 放空部位統計',
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(TdccDistributionCard, { data, colorTheme: 'international' })
    );

    expect(html).toContain('軋空警戒');
    expect(html).toContain('22.50%');
    expect(html).toContain('內部人持股比');
  });

  it('12. Ticket 01B: 驗證 buildTdccDistribution 能正確建構美股 13F 與放空籌碼模型', async () => {
    const { buildTdccDistribution } = await import('../../../engine/aiForceDashboardEngine');

    const result = buildTdccDistribution([], 'US', 'NVDA', {
      institutionalRatio: 68.5,
      shortFloatRatio: 1.8,
      insiderRatio: 4.2,
      publicFloatRatio: 27.3,
      isSqueezeRisk: false,
      asOfQuarterText: 'SEC 13F 2026 Q3',
    });

    expect(result.symbol).toBe('NVDA');
    expect(result.isUsMarket).toBe(true);
    expect(result.isEmpty).toBe(false);
    expect(result.us13fData?.institutionalRatio).toBe(68.5);
    expect(result.concentrationBadge).toBe('機構高度控盤');
  });

  it('13. Spec 0238 Ticket 05: 僅有 1 週集保資料時，change4WeeksRatio 應為 undefined (顯示 -- 與首週基準建立)，且 SVG 單柱置中渲染', async () => {
    const { buildTdccDistribution } = await import('../../../engine/aiForceDashboardEngine');
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TdccDistributionCard } = await import('./TdccDistributionCard');

    const singleRecord = [{ date: '2026-11-13', totalShareholders: 3956621, over1000Ratio: 22.35 }];
    const result = buildTdccDistribution(singleRecord, 'TW', '0050');

    expect(result.change4WeeksRatio).toBeUndefined();
    expect(result.concentrationBadge).toBe('首週基準建立');

    const html = renderToStaticMarkup(
      React.createElement(TdccDistributionCard, { data: result, colorTheme: 'taiwan' })
    );
    expect(html).toContain('首週基準建立');
    expect(html).toContain('data-testid="tdcc-single-point-baseline"');
  });

  describe('Spec 0239 T13: colorTheme 語意修正、10週 X 軸疏化、leftMin >= 0 與 13F 歸一防假寬度', () => {
    it('calculateTdccScales 當大戶比例極低時 leftMin 必須鉗制 >= 0', () => {
      const lowRatioHistory = [
        { date: '2026-09-04', totalShareholders: 50000, over1000Ratio: 0.5 },
        { date: '2026-09-11', totalShareholders: 52000, over1000Ratio: 1.8 },
      ];
      const scales = calculateTdccScales(lowRatioHistory, 170);
      expect(scales.leftMin).toBeGreaterThanOrEqual(0);
    });

    it('台股模式下大戶增持 (+2.20%) 與高度集中徽章應顯示紅漲 (#f87171)，美股/國際模式顯示綠漲 (#34d399)', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { TdccDistributionCard } = await import('./TdccDistributionCard');

      const data: TdccDistributionData = {
        symbol: '2330',
        history: mockHistory,
        latestOver1000Ratio: 67.4,
        latestShareholders: 840000,
        change4WeeksRatio: 2.2,
        concentrationBadge: '籌碼高度集中 (波段起漲)',
        asOfDateText: '集保基準日: 2026-09-25',
        isEmpty: false,
      };

      const twHtml = renderToStaticMarkup(
        React.createElement(TdccDistributionCard, { data, colorTheme: 'taiwan' })
      );
      expect(twHtml).toContain('color:#f87171');
      expect(twHtml).not.toContain('color:#34d399');

      const intlHtml = renderToStaticMarkup(
        React.createElement(TdccDistributionCard, { data, colorTheme: 'international' })
      );
      expect(intlHtml).toContain('color:#34d399');
    });

    it('台股 10 週資料 X 軸應隔週疏化防日期文字重疊 (渲染 < 10 個日期標籤)', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { TdccDistributionCard } = await import('./TdccDistributionCard');

      const tenWeeks = Array.from({ length: 10 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        totalShareholders: 800000 - i * 1000,
        over1000Ratio: 60 + i * 0.5,
      }));

      const html = renderToStaticMarkup(
        React.createElement(TdccDistributionCard, {
          data: {
            symbol: '2330',
            history: tenWeeks,
            latestOver1000Ratio: 64.5,
            latestShareholders: 791000,
            change4WeeksRatio: 1.5,
            concentrationBadge: '大戶持續增持',
            asOfDateText: '集保基準日: 2026-08-10',
            isEmpty: false,
          },
          colorTheme: 'taiwan',
        })
      );

      const textMatches = html.match(/<text[^>]*>08-\d\d<\/text>/g) || [];
      expect(textMatches.length).toBeGreaterThanOrEqual(4);
      expect(textMatches.length).toBeLessThanOrEqual(6);
      expect(html).toContain('>08-01</text>');
      expect(html).toContain('>08-10</text>');
    });

    it('美股 13F 當 institutional + insider > 100% 時應歸一總寬 100%，未提供結構比時不硬塞 50%/10% 假寬度，並消費 isSqueezeRisk 與 shortFloat Tooltip', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { TdccDistributionCard, normalizeUs13fOwnership } = await import('./TdccDistributionCard');

      const normalizedOver = normalizeUs13fOwnership({
        institutionalRatio: 92,
        insiderRatio: 20,
        publicFloatRatio: 5,
      });
      expect(normalizedOver.hasStructureData).toBe(true);
      expect(normalizedOver.instWidth + normalizedOver.insiderWidth + normalizedOver.publicWidth).toBeCloseTo(100, 1);
      expect(normalizedOver.publicWidth).toBe(0);

      const normalizedEmpty = normalizeUs13fOwnership({
        shortFloatRatio: 14.5,
        isSqueezeRisk: true,
      });
      expect(normalizedEmpty.hasStructureData).toBe(false);

      const html = renderToStaticMarkup(
        React.createElement(TdccDistributionCard, {
          data: {
            symbol: 'AMC',
            isUsMarket: true,
            history: [],
            concentrationBadge: '軋空警戒 (Squeeze Alert)',
            asOfDateText: 'FINRA',
            isEmpty: false,
            us13fData: {
              shortFloatRatio: 8.5,
              isSqueezeRisk: true,
              asOfQuarterText: 'SEC 13F',
            },
          },
          colorTheme: 'international',
        })
      );

      expect(html).not.toContain('width:50%');
      expect(html).not.toContain('width:10%');
      expect(html).toContain('rgba(239, 68, 68, 0.35)');
      expect(html).toContain('data-testid="us13f-structure-empty"');
    });
  });

  describe('Spec 0245 Seam 4 (T10): 真實 28 天日曆窗大戶變動與 SVG 斷層虛線誠實標示', () => {
    it('含 7 週斷層之 2344 數據 (09-04, 10-22, 11-13, 11-20) 應鎖定 28 天窗之 10-22 (-0.28%) 而非誤用 11 週前之 09-04 (-1.36%)', async () => {
      const { buildTdccDistribution } = await import('../../../engine/aiForceMarketAssembly');

      const gapped2344 = [
        { date: '2026-09-04', totalShareholders: 579356, over1000Ratio: 64.57, under10Ratio: 17.5 },
        { date: '2026-10-22', totalShareholders: 586605, over1000Ratio: 63.49, under10Ratio: 18.0 },
        { date: '2026-11-13', totalShareholders: 586031, over1000Ratio: 63.2, under10Ratio: 18.3 },
        { date: '2026-11-20', totalShareholders: 584901, over1000Ratio: 63.21, under10Ratio: 18.5 },
      ];

      const result = buildTdccDistribution(gapped2344, 'TW', '2344');
      // 11-20 (63.21) - 10-22 (63.49) = -0.28，絕非 -1.36 (11 週差)
      expect(result.change4WeeksRatio).toBeCloseTo(-0.28, 2);
      expect(result.compareSpanWeeks).toBe(4);
      expect(result.compareLabel).toBe('近 4 週大戶變動');
    });

    it('當 21~35 天窗內無任何基準點時，應動態輸出真實跨度週數標籤（例如近 11 週大戶變動）並於 SVG 繪製虛線缺口段', async () => {
      const { buildTdccDistribution } = await import('../../../engine/aiForceMarketAssembly');
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { TdccDistributionCard } = await import('./TdccDistributionCard');

      const wideGap = [
        { date: '2026-09-04', totalShareholders: 579356, over1000Ratio: 64.57, under10Ratio: 17.5 },
        { date: '2026-11-20', totalShareholders: 584901, over1000Ratio: 63.21, under10Ratio: 18.5 },
      ];

      const result = buildTdccDistribution(wideGap, 'TW', '2344');
      expect(result.compareSpanWeeks).toBe(11);
      expect(result.compareLabel).toBe('近 11 週大戶變動');

      const html = renderToStaticMarkup(
        React.createElement(TdccDistributionCard, { data: result, colorTheme: 'taiwan' })
      );
      expect(html).toContain('近 11 週大戶變動');
      expect(html).toContain('data-testid="tdcc-gap-segment"');
      expect(html).toContain('stroke-dasharray');
    });
  });
});




