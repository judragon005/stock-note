import { describe, it, expect } from 'vitest';
import {
  calculateStackedBandSegments,
  formatBiasMetric,
  buildStackedMountainPaths,
  formatLegendItems,
  resolveVwapCurrentPrice,
} from './VwapCostStructureCard';

describe('VwapCostStructureCard - 主力成本結構分佈元件規範 (Ticket 15 & Spec 0144)', () => {
  const sampleBands = [
    { name: '倉儲區', biasLabel: '>5%', percentage: 38, color: '#f97316' },
    { name: '套牢區', biasLabel: '-2~-5%', percentage: 32, color: '#10b981' },
    { name: '主力成本區', biasLabel: '±2%', percentage: 18, color: '#38bdf8' },
    { name: '大量成交區', biasLabel: '±2~5%', percentage: 12, color: '#1e40af' },
  ];

  it('calculateStackedBandSegments 應正確計算各階層之累計起始與結束百分比', () => {
    const segments = calculateStackedBandSegments(sampleBands);

    expect(segments.length).toBe(4);
    // 第一段：0% ~ 38%
    expect(segments[0].startPct).toBe(0);
    expect(segments[0].endPct).toBe(38);

    // 第二段：38% ~ 70%
    expect(segments[1].startPct).toBe(38);
    expect(segments[1].endPct).toBe(70);

    // 第三段：70% ~ 88%
    expect(segments[2].startPct).toBe(70);
    expect(segments[2].endPct).toBe(88);

    // 第四段：88% ~ 100%
    expect(segments[3].startPct).toBe(88);
    expect(segments[3].endPct).toBe(100);
  });

  it('formatBiasMetric 應響應 colorTheme (台股紅漲綠跌 / 美股綠漲紅跌) 並為正值加號、負值減號', () => {
    const twPos = formatBiasMetric(7.5, 'taiwan');
    expect(twPos.text).toBe('+7.5%');
    expect(twPos.isPositive).toBe(true);
    expect(twPos.color).toBe('#ef4444');

    const twNeg = formatBiasMetric(-3.2, 'taiwan');
    expect(twNeg.text).toBe('-3.2%');
    expect(twNeg.isPositive).toBe(false);
    expect(twNeg.color).toBe('#10b981');

    const usPos = formatBiasMetric(7.5, 'international');
    expect(usPos.text).toBe('+7.5%');
    expect(usPos.color).toBe('#10b981');

    const usNeg = formatBiasMetric(-3.2, 'international');
    expect(usNeg.text).toBe('-3.2%');
    expect(usNeg.color).toBe('#ef4444');

    const zero = formatBiasMetric(0);
    expect(zero.text).toBe('0.0%');
  });

  it('當傳入空陣列時，calculateStackedBandSegments 應安全回傳空陣列', () => {
    const segments = calculateStackedBandSegments([]);
    expect(segments).toEqual([]);
  });

  it('buildStackedMountainPaths (Spec 0144) 應將 4 時點之成本帶數列計算為 4 層平滑閉合面積路徑', () => {
    const sampleTimeNodes = [
      { dateLabel: '06/25', inventoryVol: 15, trappedVol: 15, costVol: 15, heavyVol: 10, totalVolume: 55 },
      { dateLabel: '07/10', inventoryVol: 10, trappedVol: 12, costVol: 10, heavyVol: 8, totalVolume: 40 },
      { dateLabel: '08/10', inventoryVol: 18, trappedVol: 16, costVol: 14, heavyVol: 10, totalVolume: 58 },
      { dateLabel: '08/31', inventoryVol: 8, trappedVol: 10, costVol: 12, heavyVol: 10, totalVolume: 40 },
    ];

    const paths = buildStackedMountainPaths(sampleTimeNodes, 340, 130, { left: 30, right: 10, top: 10, bottom: 25 });

    expect(paths.layer1Path.startsWith('M')).toBe(true);
    expect(paths.layer1Path.endsWith('Z')).toBe(true);
    expect(paths.layer2Path.startsWith('M')).toBe(true);
    expect(paths.layer2Path.endsWith('Z')).toBe(true);
    expect(paths.layer3Path.startsWith('M')).toBe(true);
    expect(paths.layer3Path.endsWith('Z')).toBe(true);
    expect(paths.layer4Path.startsWith('M')).toBe(true);
    expect(paths.layer4Path.endsWith('Z')).toBe(true);
  });

  it('formatLegendItems (Spec 0239 T13) 應 100% 對齊 vwapCostEngine 四層名稱、色碼並攜帶各帶百分比', () => {
    const items = formatLegendItems();
    expect(items.length).toBe(4);
    expect(items[0].label).toContain('突破區');
    expect(items[0].color).toBe('#2563eb');
    expect(items[1].label).toContain('大量成交區');
    expect(items[1].color).toBe('#f97316');
    expect(items[2].label).toContain('主力成本區');
    expect(items[2].color).toBe('#10b981');
    expect(items[3].label).toContain('套牢區');
    expect(items[3].color).toBe('#38bdf8');

    const withPct = formatLegendItems([
      { name: '突破區', biasLabel: '>+5%', percentage: 40, color: '#2563eb' },
      { name: '大量成交區', biasLabel: '+2~+5%', percentage: 25, color: '#f97316' },
      { name: '主力成本區', biasLabel: '±2%', percentage: 20, color: '#10b981' },
      { name: '套牢區', biasLabel: '<-2%', percentage: 15, color: '#38bdf8' },
    ]);
    expect(withPct[0].percentage).toBe(40);
    expect(withPct[3].percentage).toBe(15);
  });

  it('resolveVwapCurrentPrice 應優先使用 currentPrice，其次 mainForceAvgCost / mainForceVwap，絕不回退寫死 1240', () => {
    expect(resolveVwapCurrentPrice({ currentPrice: 850, mainForceAvgCost: 820 })).toBe(850);
    expect(resolveVwapCurrentPrice({ mainForceAvgCost: 820, mainForceVwap: 810 })).toBe(820);
    expect(resolveVwapCurrentPrice({ mainForceVwap: 810 })).toBe(810);
    expect(resolveVwapCurrentPrice({})).toBe(0);
  });

  describe('Spec 0239 T13: 實際百分比 Y 軸、useId、不遮擋圖例、市場幣別與 Honest Empty State', () => {
    it('timeNodes 為空或 mainForceVwap <= 0 時應渲染 Honest Empty State，絕不回退 2131', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { VwapCostStructureCard } = await import('./VwapCostStructureCard');

      const html = renderToStaticMarkup(
        React.createElement(VwapCostStructureCard, {
          data: {
            mainForceVwap: 0,
            biasPercent: 0,
            bands: [],
            timeNodes: [],
          },
          market: 'TW',
        })
      );

      expect(html).toContain('data-testid="vwap-empty-state"');
      expect(html).not.toContain('2,131');
      expect(html).not.toContain('2131');
      expect(html).not.toContain('60k');
    });

    it('正常渲染時應使用 100%/50%/0% Y 軸刻度、動態漸層 ID、圖例呈現各帶百分比且美股顯示 USD 幣別', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { VwapCostStructureCard } = await import('./VwapCostStructureCard');

      const html = renderToStaticMarkup(
        React.createElement(VwapCostStructureCard, {
          data: {
            mainForceVwap: 135.5,
            currentPrice: 142.0,
            biasPercent: 4.8,
            bands: [
              { name: '突破區', biasLabel: '>+5%', percentage: 42, color: '#2563eb' },
              { name: '大量成交區', biasLabel: '+2~+5%', percentage: 28, color: '#f97316' },
              { name: '主力成本區', biasLabel: '±2%', percentage: 18, color: '#10b981' },
              { name: '套牢區', biasLabel: '<-2%', percentage: 12, color: '#38bdf8' },
            ],
            timeNodes: [
              { dateLabel: '06/25', inventoryVol: 300, trappedVol: 200, costVol: 250, heavyVol: 250, totalVolume: 1000 },
              { dateLabel: '07/10', inventoryVol: 220, trappedVol: 180, costVol: 220, heavyVol: 200, totalVolume: 820 },
              { dateLabel: '08/10', inventoryVol: 350, trappedVol: 150, costVol: 240, heavyVol: 210, totalVolume: 950 },
              { dateLabel: '08/31', inventoryVol: 400, trappedVol: 120, costVol: 200, heavyVol: 280, totalVolume: 1000 },
            ],
          },
          colorTheme: 'international',
          market: 'US',
        })
      );

      expect(html).not.toContain('60k');
      expect(html).not.toContain('40k');
      expect(html).toContain('100%');
      expect(html).toContain('50%');
      expect(html).toContain('0%');
      expect(html).not.toContain('id="areaGrad1"');
      expect(html).toContain('data-testid="vwap-legend-bar"');
      expect(html).toContain('42%');
      expect(html).toContain('28%');
      expect(html).toContain('$135.50');
    });
  });
});


