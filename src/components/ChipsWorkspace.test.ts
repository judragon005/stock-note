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
  describe('Ticket 05 (Spec 0217) - 前端三級瀑布流真實資料管線與 Zero-Mock 清洗', () => {
    it('filterMarketFocusList 在無持倉時優先採用真實收盤價計算漲跌幅，杜絕 idx % 4 假背離', () => {
      const mockChipsMap = {
        '2330': {
          symbol: '2330',
          name: '台積電',
          foreignNetShares: 5000,
          trustNetShares: 2000,
          dealerNetShares: 500,
          totalNetShares: 7500,
          close: 1020,
        },
      };

      const historyReportsMap = {
        '2026-10-29': {
          '2330': {
            symbol: '2330',
            name: '台積電',
            close: 1000,
            totalNetShares: 5000,
          },
        },
        '2026-10-30': {
          '2330': {
            symbol: '2330',
            name: '台積電',
            close: 1020,
            totalNetShares: 7500,
          },
        },
      };

      const res = filterMarketFocusList(
        'TW',
        mockChipsMap as any,
        [],
        ['2026-10-29', '2026-10-30'],
        historyReportsMap as any
      );

      expect(res).toHaveLength(1);
      expect(res[0].symbol).toBe('2330');
      expect(res[0].currentPrice).toBe(1020);
      // (1020 - 1000) / 1000 = +2.0%
      expect(res[0].changePercent).toBe(2);
    });
  
  describe('Ticket 07 (Spec 0217) - 四象限卡片篩選與實戰籌碼作戰明細表', () => {
    it('應支援依象限過濾標的清單', () => {
      const mockBubbles = [
        { symbol: '2330', name: '台積電', quadrant: 'BREAKOUT', totalNetShares: 5000 },
        { symbol: '2454', name: '聯發科', quadrant: 'ACCUMULATION', totalNetShares: 2000 },
        { symbol: '2317', name: '鴻海', quadrant: 'DISTRIBUTION', totalNetShares: -3000 },
        { symbol: '2481', name: '強茂', quadrant: 'LIQUIDATION', totalNetShares: -1000 },
      ];

      const filterByQuadrant = (bubbles: any[], quadrant: string) => {
        if (quadrant === 'ALL') return bubbles;
        return bubbles.filter((b) => b.quadrant === quadrant);
      };

      const breakoutOnly = filterByQuadrant(mockBubbles, 'BREAKOUT');
      expect(breakoutOnly).toHaveLength(1);
      expect(breakoutOnly[0].symbol).toBe('2330');

      const all = filterByQuadrant(mockBubbles, 'ALL');
      expect(all).toHaveLength(4);
    });

    it('filterMarketFocusList 應預設排除 ETF，開啟 includeEtf 時納入 ETF，並完整注入持倉防線與投量比屬性', () => {
      const mockChipsMap = {
        '2330': {
          symbol: '2330',
          name: '台積電',
          close: 1020,
          volumeLots: 20000,
          foreignBuyShares: 6000,
          foreignSellShares: 1000,
          foreignNetShares: 5000,
          trustBuyShares: 2500,
          trustSellShares: 500,
          trustNetShares: 2000,
          dealerNetShares: 500,
          totalNetShares: 7500,
          trustStreak: 3,
          foreignStreak: 2,
        },
        '0050': {
          symbol: '0050',
          name: '元大台灣50',
          close: 195,
          volumeLots: 50000,
          foreignBuyShares: 30000,
          foreignSellShares: 5000,
          foreignNetShares: 25000,
          trustBuyShares: 0,
          trustSellShares: 0,
          trustNetShares: 0,
          dealerNetShares: 0,
          totalNetShares: 25000,
        },
      };

      const mockHoldings: any[] = [
        {
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          shares: 1000,
          isClosed: false,
          avgCost: 900,
          currentPrice: 1020,
          grossMarketValue: 1020000,
          unrealizedPnLPercent: 13.3,
          intent: 'DIVIDEND',
        },
      ];

      // 預設不含 ETF
      const withoutEtf = filterMarketFocusList('TW', mockChipsMap as any, mockHoldings, ['2026-10-30'], undefined, undefined, false);
      expect(withoutEtf.map((x) => x.symbol)).toEqual(['2330']);
      expect(withoutEtf[0].isHolding).toBe(true);
      expect(withoutEtf[0].avgCost).toBe(900);
      expect(withoutEtf[0].unrealizedPnLPercent).toBe(13.3);
      expect(withoutEtf[0].intent).toBe('DIVIDEND');
      expect(withoutEtf[0].trustToVolumeRatio).toBe(10); // 2000 / 20000 * 100 = 10%
      expect(withoutEtf[0].trustStreak).toBe(3);

      // 開啟含 ETF
      const withEtf = filterMarketFocusList('TW', mockChipsMap as any, mockHoldings, ['2026-10-30'], undefined, undefined, true);
      expect(withEtf.map((x) => x.symbol)).toContain('0050');
      expect(withEtf.map((x) => x.symbol)).toContain('2330');
    });
  });

});
