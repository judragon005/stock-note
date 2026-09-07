import { describe, it, expect } from 'vitest';
import {
  getChipsQuadrantCardStyles,
  buildHoldingHistoricalFlows,
  filterMarketFocusList,
} from './ChipsWorkspace';

describe('ChipsWorkspace 象限卡片動態習慣燈號連動 (ColorThemeMode)', () => {
  it('台股模式 (taiwan): 主力抬轎為紅，割韭菜警戒為綠', () => {
    const styles = getChipsQuadrantCardStyles('taiwan');

    // 主力抬轎區 (多頭)
    expect(styles.breakout.bg).toContain('239, 68, 68');
    expect(styles.breakout.countColor).toBe('#f87171');
    expect(styles.breakout.iconColor).toBe('#f87171');

    // 割韭菜警戒區 (空頭/倒貨)
    expect(styles.distribution.bg).toContain('16, 185, 129');
    expect(styles.distribution.countColor).toBe('#34d399');
    expect(styles.distribution.iconColor).toBe('#34d399');

    // 逢低撿便宜區與冷凍提款區維持標準色
    expect(styles.accumulation.countColor).toBe('#fbbf24');
    expect(styles.liquidation.countColor).toBe('#94a3b8');
  });

  it('國際/美股模式 (international): 主力抬轎為綠，割韭菜警戒為紅', () => {
    const styles = getChipsQuadrantCardStyles('international');

    // 主力抬轎區 (多頭/漲)
    expect(styles.breakout.bg).toContain('16, 185, 129');
    expect(styles.breakout.countColor).toBe('#34d399');
    expect(styles.breakout.iconColor).toBe('#34d399');

    // 割韭菜警戒區 (空頭/跌/倒貨)
    expect(styles.distribution.bg).toContain('239, 68, 68');
    expect(styles.distribution.countColor).toBe('#f87171');
    expect(styles.distribution.iconColor).toBe('#f87171');

    // 逢低撿便宜區與冷凍提款區維持標準色
    expect(styles.accumulation.countColor).toBe('#fbbf24');
    expect(styles.liquidation.countColor).toBe('#94a3b8');
  });

  describe('buildHoldingHistoricalFlows (時序籌碼歷史真實日報對齊與優雅降級)', () => {
    const mockHolding: any = {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      todaysPnLPercent: 2.0,
      currentPrice: 1000,
    };

    const mockTwseData: any = {
      symbol: '2330',
      foreignNetShares: 10000,
      trustNetShares: 2000,
      dealerNetShares: 500,
      totalNetShares: 12500,
    };

    it('當本地歷史日報已補齊時，優先對齊真實歷史法人張數', () => {
      const dates = ['20260901', '20260902'];
      const mockHistoryMap: any = {
        '20260901': {
          '2330': {
            symbol: '2330',
            foreignNetShares: 3300,
            trustNetShares: 400,
            dealerNetShares: 100,
            totalNetShares: 3800,
          },
        },
      };

      const flows = buildHoldingHistoricalFlows(
        mockHolding,
        dates,
        mockTwseData,
        0,
        mockHistoryMap
      );

      expect(flows).toHaveLength(2);
      // 第 0 天命中 20260901 真實日報
      expect(flows[0].foreignNetShares).toBe(3300);
      expect(flows[0].trustNetShares).toBe(400);
      expect(flows[0].dealerNetShares).toBe(100);

      // 第 1 天 (20260902) 缺失歷史日報，優雅降級為係數折算
      expect(flows[1].foreignNetShares).toBe(10000); // factor = 2/2 = 1.0
    });
  });

  describe('filterMarketFocusList (市場篩選嚴格隔離檢驗：美股、台股、全部)', () => {
    const mockTwseChipsMap: any = {
      '2330': { symbol: '2330', name: '台積電', totalNetShares: 5000 },
      '2454': { symbol: '2454', name: '聯發科', totalNetShares: -2000 },
    };

    it('美股模式 (US): 產出清單 100% 均為美股，絕不出現台股', () => {
      const items = filterMarketFocusList('US', mockTwseChipsMap, [], ['T']);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((it) => it.market === 'US')).toBe(true);
      expect(items.some((it) => it.market === 'TW')).toBe(false);
    });

    it('台股模式 (TW): 產出清單 100% 均為台股，絕不出現美股', () => {
      const items = filterMarketFocusList('TW', mockTwseChipsMap, [], ['T']);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((it) => it.market === 'TW')).toBe(true);
      expect(items.some((it) => it.market === 'US')).toBe(false);
    });

    it('全部模式 (ALL): 產出清單應均衡涵蓋台股與美股巨頭', () => {
      const items = filterMarketFocusList('ALL', mockTwseChipsMap, [], ['T']);
      expect(items.some((it) => it.market === 'TW')).toBe(true);
      expect(items.some((it) => it.market === 'US')).toBe(true);
    });
  });
});
