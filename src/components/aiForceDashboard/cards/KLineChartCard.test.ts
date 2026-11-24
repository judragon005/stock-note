import { describe, it, expect } from 'vitest';
import {
  calculatePriceRange,
  projectPriceToY,
  buildMaPolylinePoints,
  calculateKeyLevelOverlays,
  sliceCandlesByPeriod,
  findClosestCandleIndex,
  normalizeAndSortCandles,
} from './KLineChartCard';

describe('KLineChartCard - 淘汰偽造數列與單一真實來源規範 (Spec 0152 / Ticket 02)', () => {
  it('當無日 K 資料時，normalizeAndSortCandles 應回傳空陣列，絕不偽造 2100 元或 30 根假 K 棒', () => {
    const emptyCandles = normalizeAndSortCandles([]);
    expect(emptyCandles).toEqual([]);

    const undefinedCandles = normalizeAndSortCandles(undefined);
    expect(undefinedCandles).toEqual([]);
  });


  it('若傳入倒序的蠟燭數列，應自動依據日期校正為升冪排列 (左舊右新)', () => {
    const reversed = [
      { date: '2026-09-30', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
      { date: '2026-09-20', open: 98, high: 101, low: 96, close: 99, volume: 1200 },
      { date: '2026-09-10', open: 95, high: 99, low: 94, close: 97, volume: 1100 },
      { date: '2026-09-01', open: 90, high: 96, low: 89, close: 95, volume: 900 },
      { date: '2026-08-20', open: 88, high: 92, low: 87, close: 90, volume: 850 },
    ];
    const sorted = normalizeAndSortCandles(reversed);
    expect(sorted[0].date).toBe('2026-08-20');
    expect(sorted[sorted.length - 1].date).toBe('2026-09-30');
  });
});

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
    it('應依據滑鼠 X 座標精確計算最近的 K 棒索引（以 K 棒中心點對稱磁吸）', () => {
      // leftPad = 20, candleGap = 10, count = 30
      // 第 0 根中心在 25。在 20~29.9 之間均應穩定磁吸至第 0 根
      expect(findClosestCandleIndex(21, 20, 10, 30)).toBe(0);
      expect(findClosestCandleIndex(25, 20, 10, 30)).toBe(0);
      expect(findClosestCandleIndex(29, 20, 10, 30)).toBe(0);

      // 第 1 根中心在 35。在 30~39.9 之間應磁吸至第 1 根
      expect(findClosestCandleIndex(30, 20, 10, 30)).toBe(1);
      expect(findClosestCandleIndex(35, 20, 10, 30)).toBe(1);
      expect(findClosestCandleIndex(39, 20, 10, 30)).toBe(1);
    });

    it('滑鼠移出左右邊界時應安全 clamp 於 [0, count - 1]', () => {
      expect(findClosestCandleIndex(-10, 20, 10, 30)).toBe(0);
      expect(findClosestCandleIndex(1000, 20, 10, 30)).toBe(29);
    });

    it('當 count <= 0 時應防禦性回傳 -1，避免未定義陣列索引存取', () => {
      expect(findClosestCandleIndex(50, 20, 10, 0)).toBe(-1);
      expect(findClosestCandleIndex(50, 20, 10, -5)).toBe(-1);
    });

    it('當 candleGap <= 0 時應防禦除零錯誤，回傳 0', () => {
      expect(findClosestCandleIndex(50, 20, 0, 10)).toBe(0);
    });
  });

  describe('Ticket 05: 主 K 線圖右上角選項與關鍵價位引線交互規範', () => {
    it('calculateKeyLevelOverlays 應依據傳入之 keyLevels 正確映射三條引線 Y 軸座標並確保在安全可視邊界內', () => {
      const priceRange = { min: 100, max: 200, span: 100 };
      const overlays = calculateKeyLevelOverlays(
        { highResistance: 190, mainForceCost: 150, supportLevel: 110 },
        priceRange,
        300,
        15,
        15
      );

      const resistance = overlays.find((o) => o.type === 'resistance')!;
      const cost = overlays.find((o) => o.type === 'cost')!;
      const support = overlays.find((o) => o.type === 'support')!;

      expect(resistance.price).toBe(190);
      expect(cost.price).toBe(150);
      expect(support.price).toBe(110);

      // Y 座標由上至下 (resistance < cost < support)
      expect(resistance.y).toBeLessThan(cost.y);
      expect(cost.y).toBeLessThan(support.y);

      // 邊界保護：全部介於 topPadding (15) 與 height - bottomPadding (285) 之間
      expect(resistance.y).toBeGreaterThanOrEqual(15);
      expect(support.y).toBeLessThanOrEqual(285);
    });
  });

  describe('Ticket 08: 主 K 線圖 MA250 (年線) 指標演算法與視覺引線實裝 (Spec 0162)', () => {
    it('buildMaPolylinePoints 應能將 250 根 K 棒中的 ma250 序列正確轉為 SVG polyline 折線點陣列', () => {
      // 模擬前 248 根為 undefined，第 249、250 根具有有效 ma250 數值
      const ma250Values: (number | undefined)[] = Array.from({ length: 250 }, (_, i) =>
        i >= 249 ? 150 + (i - 249) * 0.5 : undefined
      );
      const priceRange = { min: 100, max: 200, span: 100 };
      const getX = (idx: number) => idx * 2;
      const height = 220;

      const points = buildMaPolylinePoints(ma250Values, priceRange, getX, height, 15, 15);
      const pointPairs = points.trim().split(' ');

      // 只有具有有效數值的點會被轉為 SVG point
      expect(pointPairs.length).toBe(1);
      expect(pointPairs[0]).toContain('498,');
    });

    it('sliceCandlesByPeriod 支援 250D 期間完整切片 250 根真實蠟燭', () => {
      const mockCandles = Array.from({ length: 300 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(3, '0')}`,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
        ma250: 101.5,
      }));

      const sliced250 = sliceCandlesByPeriod(mockCandles, '250D');
      expect(sliced250.length).toBe(250);
      expect(sliced250[0].date).toBe('2025-01-051');
      expect(sliced250[249].date).toBe('2025-01-300');
    });
  });

  describe('Ticket 06: 主 K 線多週期聚合切換 (日 K / 週 K / 月 K) 與 As-of Date (Spec 0169)', () => {
    const dailyCandles = [
      { date: '2026-09-01', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
      { date: '2026-09-02', open: 102, high: 108, low: 101, close: 106, volume: 1200 },
      { date: '2026-09-03', open: 106, high: 107, low: 103, close: 104, volume: 800 },
      { date: '2026-09-04', open: 104, high: 110, low: 103, close: 109, volume: 1500 },
      { date: '2026-09-07', open: 109, high: 112, low: 107, close: 111, volume: 1100 },
      { date: '2026-09-08', open: 111, high: 115, low: 110, close: 113, volume: 1300 },
    ];

    it('發布基準日 As-of Date 應精確鎖定最新有效交易日', () => {
      const sorted = normalizeAndSortCandles(dailyCandles);
      const latestDate = sorted[sorted.length - 1]?.date;
      expect(latestDate).toBe('2026-09-08');
    });

    it('切片與聚合後的價格極值能正確支撐畫布渲染', () => {
      const sliced = sliceCandlesByPeriod(dailyCandles, '30D');
      const range = calculatePriceRange(sliced);
      expect(range.min).toBeLessThan(98);
      expect(range.max).toBeGreaterThan(115);
      expect(range.span).toBe(range.max - range.min);
    });
  });

  describe('Ticket 07: 券商法人級 MA 均線標準光譜與色相分離 (Spec 0177)', () => {
    it('應定義互斥之高辨識度均線色彩，且 MA20 與 MA250 不可使用相同紫色系', async () => {
      const { KLINE_MA_COLORS } = await import('./KLineChartCard');
      expect(KLINE_MA_COLORS).toBeDefined();
      expect(KLINE_MA_COLORS.ma5).toBe('#eab308');   // 亮黃
      expect(KLINE_MA_COLORS.ma10).toBe('#06b6d4');  // 青藍
      expect(KLINE_MA_COLORS.ma20).toBe('#ec4899');  // 洋紅 (杜絕紫色)
      expect(KLINE_MA_COLORS.ma60).toBe('#f97316');  // 亮橘 (杜絕灰色虛線)
      expect(KLINE_MA_COLORS.ma250).toBe('#a855f7'); // 尊爵紫

      // 驗證 5 種均線顏色完全互斥且無重複
      const uniqueColors = new Set(Object.values(KLINE_MA_COLORS));
      expect(uniqueColors.size).toBe(5);
    });
  });

  describe('Ticket 07 (Spec 0239): SVG 等比視口校正與字級/對比度底線驗收', () => {
    it('KLineChartCard 不得使用 preserveAspectRatio="none" 且不得含 #64748b 與微字級 (<0.75rem / <12px / SVG<12)', async () => {
      // @ts-expect-error 測試環境無 @types/node 型別定義
      const fs = await import('node:fs');
      // @ts-expect-error 測試環境無 @types/node 型別定義
      const path = await import('node:path');
      // @ts-expect-error 測試環境使用 Node __dirname
      const src = fs.readFileSync(path.resolve(__dirname, 'KLineChartCard.tsx'), 'utf-8');

      expect(src).not.toContain('preserveAspectRatio="none"');
      expect(src).not.toMatch(/#64748b/i);

      const remMatches = [...src.matchAll(/fontSize:\s*['"](\d+(?:\.\d+)?)rem['"]/g)];
      for (const m of remMatches) {
        expect(Number(m[1]), `發現過小 rem 字級: ${m[0]}`).toBeGreaterThanOrEqual(0.75);
      }

      const svgFontMatches = [...src.matchAll(/fontSize=["'](\d+(?:\.\d+)?)["']/g)];
      for (const m of svgFontMatches) {
        expect(Number(m[1]), `發現過小 SVG 字級: ${m[0]}`).toBeGreaterThanOrEqual(12);
      }
    });

    it('formatKlinePriceTick 應對低價標的 (<$100) 保留 2 位小數，避免被 toFixed(0) 壓成重複整數 (T12)', async () => {
      const { formatKlinePriceTick } = await import('./KLineChartCard');
      expect(formatKlinePriceTick(4.25)).toBe('4.25');
      expect(formatKlinePriceTick(12.34)).toBe('12.34');
      expect(formatKlinePriceTick(250.5)).toBe('250.5');
      expect(formatKlinePriceTick(1280)).toBe('1280');
    });
  });

  describe('Spec 0245 Seam 2 (T03–T06): O(N) 四維技術序列、盤中零量隔離、體制共鳴大腦與 Card 01B', () => {
    const buildCandles = (count: number, trend: 'UP' | 'DOWN' | 'FLAT' = 'UP') =>
      Array.from({ length: count }, (_, i) => {
        const base =
          trend === 'UP'
            ? 100 + i * 0.8 + Math.sin(i * 0.7) * 2
            : trend === 'DOWN'
              ? 180 - i * 0.9 + Math.sin(i * 0.7) * 2
              : 100 + Math.sin(i * 0.9) * 3;
        const open = Number((base - 0.5).toFixed(2));
        const close = Number((base + (trend === 'DOWN' ? -0.6 : 0.6)).toFixed(2));
        const high = Number((Math.max(open, close) + 1.5).toFixed(2));
        const low = Number((Math.min(open, close) - 1.5).toFixed(2));
        const day = new Date(Date.UTC(2026, 0, 2 + i));
        const date = day.toISOString().slice(0, 10);
        return {
          date,
          open,
          high,
          low,
          close,
          volume: 10_000_000 + (i % 5) * 1_000_000,
        };
      });

    it('T03: enrichCandlesWithOscillators 單趟 O(N) 產出 K/D/J (=3K-2D)、MACD、RSI(14) 與 RSI(6)，且短樣本誠實為 undefined', async () => {
      const { enrichCandlesWithOscillators, resolveVolumeAnchorCandles } = await import(
        '../../../engine/klineOscillatorEngine'
      );

      const enriched = enrichCandlesWithOscillators(buildCandles(40, 'UP'), { requireMinPeriod: true });
      const last = enriched[enriched.length - 1];
      expect(last.k).toBeDefined();
      expect(last.d).toBeDefined();
      expect(last.j).toBeCloseTo(3 * last.k! - 2 * last.d!, 0);
      expect(last.dif).toBeDefined();
      expect(last.macd).toBeDefined();
      expect(last.macdHist).toBeDefined();
      expect(last.rsi).toBeDefined();
      expect(last.rsi6).toBeDefined();

      // 短樣本 (10 根，如月 K 不足 26 期) 誠實不造假 MACD / RSI14
      const shortEnriched = enrichCandlesWithOscillators(buildCandles(10, 'UP'), { requireMinPeriod: true });
      const shortLast = shortEnriched[shortEnriched.length - 1];
      expect(shortLast.k).toBeDefined();
      expect(shortLast.dif).toBeUndefined();
      expect(shortLast.rsi).toBeUndefined();
      expect(shortLast.rsi6).toBeDefined();

      // 盤中零量定錨隔離：末筆為 isIntraday=true & volume=0 時自動退回前一日已結算 K 棒
      const withIntradayZero = [
        ...buildCandles(25, 'UP'),
        { date: '2026-11-24', open: 95.7, high: 95.7, low: 95.7, close: 95.7, volume: 0, isIntraday: true },
      ];
      const anchor = resolveVolumeAnchorCandles(withIntradayZero);
      expect(anchor.isVolumeAnchoredToPrevClose).toBe(true);
      expect(anchor.effectiveVolumeCandles.length).toBe(25);
      expect(anchor.volumeAnchorDate).toBe(withIntradayZero[24].date);
    });

    it('T04: buildTechnicalResonance 正確隔離盤中零量（不誤報窒息量）、換算台股張數並輸出體制權重與四維診斷', async () => {
      const { buildTechnicalResonance } = await import('../../../engine/technicalResonanceEngine');

      const base60 = buildCandles(60, 'DOWN');
      const withIntradayZero = [
        ...base60,
        { date: '2026-11-24', open: 95.7, high: 95.7, low: 95.7, close: 95.7, volume: 0, isIntraday: true },
      ];

      const res = buildTechnicalResonance({
        candles: withIntradayZero,
        dailyCandles: withIntradayZero,
        timeframe: 'DAY',
        market: 'TW',
      });

      expect(res.volume.isVolumeAnchoredToPrevClose).toBe(true);
      expect(res.volume.volumeUnit).toBe('張');
      // 10,000,000+ 股應換算為 ~10,000+ 張，絕不因盤中 0 變成 0 張或窒息量
      expect(res.volume.volumeDisplay).toBeGreaterThanOrEqual(10000);
      expect(res.volume.statusLabel).not.toContain('窒息');
      expect(res.kdj.isAvailable).toBe(true);
      expect(res.kdj.j).toBeDefined();
      expect(res.macd.isAvailable).toBe(true);
      expect(res.rsi.isAvailable).toBe(true);
      expect(res.rsi.rsi6).toBeDefined();
      expect(res.regime.weightHint.length).toBeGreaterThan(5);
      expect(res.summary.actionAdvice.length).toBeGreaterThan(5);
      expect(res.summary.invalidationRule.length).toBeGreaterThan(5);
    });

    it('T05: KLineChartCard 支援受控 subchartMode="KD" 並於查價列呈現 J 值與 J 折線', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { KLineChartCard } = await import('./KLineChartCard');
      const { enrichCandlesWithOscillators } = await import('../../../engine/klineOscillatorEngine');

      const candles = enrichCandlesWithOscillators(buildCandles(40, 'UP'), { requireMinPeriod: false });
      const html = renderToStaticMarkup(
        React.createElement(KLineChartCard, {
          data: {
            candles,
            keyLevels: { highResistance: 140, mainForceCost: 115, supportLevel: 98 },
          },
          colorTheme: 'taiwan',
          market: 'TW',
          timeframe: 'DAY',
          subchartMode: 'KD',
        })
      );

      expect(html).toContain('J:');
      expect(html).toContain('data-testid="kline-kd-j-line"');
    });

    it('T06: TechnicalResonanceCard (Card 01B) 保留 executive-verdict-strip 契約、呈現四宮格與盤中零量定錨提示', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { TechnicalResonanceCard } = await import('./TechnicalResonanceCard');
      const { buildTechnicalResonance } = await import('../../../engine/technicalResonanceEngine');

      const withIntradayZero = [
        ...buildCandles(60, 'UP'),
        { date: '2026-11-24', open: 150, high: 150, low: 150, close: 150, volume: 0, isIntraday: true },
      ];
      const resonance = buildTechnicalResonance({
        candles: withIntradayZero,
        dailyCandles: withIntradayZero,
        timeframe: 'DAY',
        market: 'TW',
      });

      const html = renderToStaticMarkup(
        React.createElement(TechnicalResonanceCard, {
          resonance,
          activeSubchartMode: 'MACD',
          onSelectSubchart: () => {},
          primaryVerb: '鎖碼推升',
          verdictSummary: '外資連買且站上 20 日均線，短線動能偏多。',
          stopLossPrice: 142.5,
          takeProfitPrice: 165.0,
          colorTheme: 'taiwan',
          market: 'TW',
        })
      );

      expect(html).toContain('data-testid="executive-verdict-strip"');
      expect(html).toContain('data-testid="technical-resonance-grid"');
      expect(html).toContain('01B');
      expect(html).toContain('成交量');
      expect(html).toContain('KDJ');
      expect(html).toContain('MACD');
      expect(html).toContain('RSI');
      expect(html).toContain('前收定錨');
      expect(html).toContain('data-active="true"');
      expect(html).toContain('鎖碼推升');
    });

    it('Code Review Fix: K/D/J 統一 [-10,110] Y 軸座標系，K=D=J 時三線點位精確重合', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { KLineChartCard } = await import('./KLineChartCard');

      const candles = buildCandles(10, 'FLAT').map((c) => ({
        ...c,
        k: 80,
        d: 80,
        j: 80,
      }));
      const html = renderToStaticMarkup(
        React.createElement(KLineChartCard, {
          data: {
            candles,
            keyLevels: { highResistance: 110, mainForceCost: 100, supportLevel: 90 },
          },
          colorTheme: 'taiwan',
          market: 'TW',
          timeframe: 'DAY',
          subchartMode: 'KD',
        })
      );

      const kMatch = html.match(/points="([^"]+)"[^>]*stroke="#fbbf24"/);
      const dMatch = html.match(/points="([^"]+)"[^>]*stroke="#38bdf8"/);
      const jMatch = html.match(/data-testid="kline-kd-j-line"\s+points="([^"]+)"/);
      expect(kMatch?.[1]).toBeTruthy();
      expect(dMatch?.[1]).toBe(kMatch?.[1]);
      expect(jMatch?.[1]).toBe(kMatch?.[1]);
    });

    it('Code Review Fix: 不足 20 期時 volRatio20 誠實留空，週 K 時框勝率單位動態顯示「10週勝率」', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { buildTechnicalResonance } = await import('../../../engine/technicalResonanceEngine');
      const { TechnicalResonanceCard } = await import('./TechnicalResonanceCard');

      const shortRes = buildTechnicalResonance({
        candles: buildCandles(12, 'UP'),
        timeframe: 'MONTH',
        market: 'TW',
      });
      expect(shortRes.volume.volRatio5).toBeDefined();
      expect(shortRes.volume.volRatio20).toBeUndefined();

      const weekRes = {
        ...shortRes,
        timeframe: 'WEEK' as const,
        summary: {
          ...shortRes.summary,
          historicalWinRate: {
            signalName: 'MACD 翻紅轉多',
            sampleCount: 5,
            winRatePercent: 80,
            avgReturn10dPercent: 4.2,
            isSufficient: true,
          },
        },
      };
      const html = renderToStaticMarkup(
        React.createElement(TechnicalResonanceCard, {
          resonance: weekRes,
          activeSubchartMode: 'VOL',
          onSelectSubchart: () => {},
          primaryVerb: '順勢觀察',
          verdictSummary: '週線測試摘要',
          colorTheme: 'taiwan',
          market: 'TW',
        })
      );
      expect(html).toContain('10週勝率 80%');
      expect(html).not.toContain('10日勝率');
    });
  });
});

