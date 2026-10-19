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
});




