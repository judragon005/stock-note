import { describe, it, expect } from 'vitest';
import {
  calculatePriceRange,
  projectPriceToY,
  buildMaPolylinePoints,
  calculateKeyLevelOverlays,
  sliceCandlesByPeriod,
  findClosestCandleIndex,
} from './KLineChartCard';

describe('KLineChartCard - 主 K 線與均線計算規範 (Ticket 04)', () => {
  describe('calculatePriceRange - 價格極值與安全邊界', () => {
    it('應正確找出最高價與最低價，並增加 5% 上下留白邊界', () => {
      const candles = [
        { high: 2200, low: 2000, close: 2100, open: 2050, volume: 1000, date: '2026-09-01' },
        { high: 2400, low: 2150, close: 2300, open: 2200, volume: 1500, date: '2026-09-02' },
      ];
      const range = calculatePriceRange(candles);
      expect(range.min).toBeLessThan(2000);
      expect(range.max).toBeGreaterThan(2400);
      expect(range.span).toBe(range.max - range.min);
    });

    it('單一平盤價格時應提供預設 ±5% 邊界，防止除零錯誤', () => {
      const candles = [
        { high: 100, low: 100, close: 100, open: 100, volume: 500, date: '2026-09-01' },
      ];
      const range = calculatePriceRange(candles);
      expect(range.span).toBeGreaterThan(0);
      expect(range.min).toBeLessThan(100);
      expect(range.max).toBeGreaterThan(100);
    });
  });

  describe('projectPriceToY - 價格映射到 SVG 座標', () => {
    it('最高價應映射至頂部 (topPadding)，最低價應映射至底部 (height - bottomPadding)', () => {
      const range = { min: 100, max: 200, span: 100 };
      const height = 300;
      const topPadding = 20;
      const bottomPadding = 30;

      const yMax = projectPriceToY(200, range, height, topPadding, bottomPadding);
      expect(yMax).toBe(topPadding);

      const yMin = projectPriceToY(100, range, height, topPadding, bottomPadding);
      expect(yMin).toBe(height - bottomPadding);

      const yMid = projectPriceToY(150, range, height, topPadding, bottomPadding);
      expect(yMid).toBe((topPadding + (height - bottomPadding)) / 2);
    });
  });

  describe('buildMaPolylinePoints - 均線折線 SVG points 產生', () => {
    it('應將有效的 MA 數值轉換為 "x,y x,y" 格式字串，忽略 undefined', () => {
      const values = [undefined, 100, 150, 200];
      const range = { min: 100, max: 200, span: 100 };
      const getX = (idx: number) => idx * 10;
      const height = 200;

      const points = buildMaPolylinePoints(values, range, getX, height, 10, 10);
      const segments = points.trim().split(' ');
      expect(segments.length).toBe(3);
      expect(segments[0]).toContain('10,');
    });
  });
});

describe('KLineChartCard - 三大水平關鍵價位引線計算規範 (Ticket 05)', () => {
  it('應正確產生高檔壓力、主力成本、支撐區之 Y 座標與樣式標籤', () => {
    const keyLevels = {
      highResistance: 2490.0,
      mainForceCost: 2130.65,
      supportLevel: 1875.0,
    };
    const range = { min: 1800, max: 2600, span: 800 };
    const overlays = calculateKeyLevelOverlays(keyLevels, range, 220, 15, 15);

    expect(overlays.length).toBe(3);

    const resistance = overlays.find((o) => o.type === 'resistance')!;
    expect(resistance.label).toBe('高檔壓力區 2,490.00');
    expect(resistance.color).toBe('#ef4444');
    expect(resistance.y).toBeGreaterThan(0);

    const cost = overlays.find((o) => o.type === 'cost')!;
    expect(cost.label).toBe('主力成本 2,130.65');
    expect(cost.color).toBe('#10b981');

    const support = overlays.find((o) => o.type === 'support')!;
    expect(support.label).toBe('支撐區 1,875.00');
    expect(support.color).toBe('#38bdf8');

    // 順序由高至低：高檔壓力 Y < 主力成本 Y < 支撐區 Y
    expect(resistance.y).toBeLessThan(cost.y);
    expect(cost.y).toBeLessThan(support.y);
  });

  it('當特定價位為 0 或缺漏時，應安全略過該引線', () => {
    const keyLevels = {
      highResistance: 0,
      mainForceCost: 2000,
      supportLevel: 0,
    };
    const range = { min: 1800, max: 2200, span: 400 };
    const overlays = calculateKeyLevelOverlays(keyLevels, range, 200);

    expect(overlays.length).toBe(1);
    expect(overlays[0].type).toBe('cost');
  });

  it('當價位高於上限或低於下限時，projectPriceToY 應安全夾取在可用高度內', () => {
    const keyLevels = {
      highResistance: 3000, // 高於 range.max (2500)
      mainForceCost: 2000,
      supportLevel: 1000, // 低於 range.min (1500)
    };
    const range = { min: 1500, max: 2500, span: 1000 };
    const overlays = calculateKeyLevelOverlays(keyLevels, range, 200, 20, 30);

    const resistance = overlays.find((o) => o.type === 'resistance')!;
    const support = overlays.find((o) => o.type === 'support')!;

    // 頂部 padding 是 20，故 resistance.y 應該被限制在 20
    expect(resistance.y).toBe(20);
    // 底部 padding 是 30，高度 200，故 support.y 應該被限制在 200 - 30 = 170
    expect(support.y).toBe(170);
  });
});

describe('KLineChartCard - 專業互動與多功能副圖 (Ticket 35 / Stage 1)', () => {
  describe('sliceCandlesByPeriod - 週期切片視窗選擇器', () => {
    const candles = Array.from({ length: 100 }, (_, i) => ({
      date: `2026-0${Math.floor(i / 30) + 1}-${String((i % 30) + 1).padStart(2, '0')}`,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000 + i * 10,
    }));

    it('30D 週期應精確截取最後 30 根日 K', () => {
      const sliced = sliceCandlesByPeriod(candles, '30D');
      expect(sliced.length).toBe(30);
      expect(sliced[sliced.length - 1].close).toBe(candles[candles.length - 1].close);
    });

    it('60D 週期應精確截取最後 60 根日 K', () => {
      const sliced = sliceCandlesByPeriod(candles, '60D');
      expect(sliced.length).toBe(60);
    });

    it('當總長度小於請求週期（如 100 根請求 250D），應安全回傳全部資料', () => {
      const sliced = sliceCandlesByPeriod(candles, '250D');
      expect(sliced.length).toBe(100);
    });
  });

  describe('findClosestCandleIndex - 十字游標動態吸附計算', () => {
    it('應依據滑鼠 X 座標精確計算最近的 K 棒索引', () => {
      // 假設 leftPad = 20, candleGap = 10, count = 30
      // 點在 x = 25 (落在第 0 根中心 25 處)
      expect(findClosestCandleIndex(25, 20, 10, 30)).toBe(0);
      // 點在 x = 35 (第 1 根)
      expect(findClosestCandleIndex(35, 20, 10, 30)).toBe(1);
      // 點在 x = 115 (第 9 根)
      expect(findClosestCandleIndex(115, 20, 10, 30)).toBe(9);
    });

    it('滑鼠移出左右邊界時應安全 clamp 於 [0, count - 1]', () => {
      expect(findClosestCandleIndex(-10, 20, 10, 30)).toBe(0);
      expect(findClosestCandleIndex(1000, 20, 10, 30)).toBe(29);
    });
  });
});

