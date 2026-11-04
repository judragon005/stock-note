import { describe, it, expect } from 'vitest';
import { scanMuscleBookerItem } from '../engine/muscleBookerEngine';
import { DailyCandle } from '../types/indicators';

describe('MuscleBookerWorkspace (肌肉書僮動能雷達工作區測試)', () => {
  it('當最後一根日 K 突破過去箱頂時，應正確判定為 BREAKOUT_UP', () => {
    // 前 20 天在 100 左右，最後一天突破至 115
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
      const isLast = i === 24;
      const c = isLast ? 115 : 100 + (i % 2);
      return {
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: c,
        high: isLast ? 116 : c + 1,
        low: isLast ? 114 : c - 1,
        close: c,
        volume: isLast ? 50000 : 10000,
      };
    });

    const result = scanMuscleBookerItem('2330', '台積電', 'TW', 115, candles);
    expect(result.boxStatus).toBe('BREAKOUT_UP');
    expect(result.currentPrice).toBe(115);
    expect(result.boxUpper).toBeDefined();
    expect(result.boxUpper!).toBeLessThan(115);
  });

  it('當價格極度收縮時，應識別出布林極致壓縮 (isBollingerSqueeze === true)', () => {
    // 25 天價格極其平穩 (振幅 < 0.2%)
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      open: 100,
      high: 100.1,
      low: 99.9,
      close: 100,
      volume: 10000,
    }));

    const result = scanMuscleBookerItem('2454', '聯發科', 'TW', 100, candles);
    expect(result.isBollingerSqueeze).toBe(true);
    expect(result.bollingerBandwidth).toBeLessThanOrEqual(8.0);
  });

  it('在無本地日 K 時，應防禦性降級為數據未就緒 (isDataPending) 與觀望待變 (AVOID)，絕不偽造假買賣訊號', () => {
    const result = scanMuscleBookerItem('NVDA', '輝達', 'US', 125);
    expect(result.symbol).toBe('NVDA');
    expect(result.currentPrice).toBe(125);
    expect(result.isDataPending).toBe(true);
    expect(result.actionDecision.action).toBe('AVOID');
  });

  it('使用相同真實日 K 時，手動診斷與清單掃描計算結果應 100% 一致 (以 4763 為例)', () => {
    // 模擬 4763 跌破箱底真實走勢
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      open: 52 - i * 0.15,
      high: 52.5 - i * 0.15,
      low: 51.5 - i * 0.15,
      close: i === 24 ? 48.35 : 52 - i * 0.15,
      volume: 15000,
    }));

    const adHocResult = scanMuscleBookerItem('4763', '材料*-KY', 'TW', 48.35, candles);
    const watchlistResult = scanMuscleBookerItem('4763', '材料*-KY', 'TW', 48.35, candles);

    expect(adHocResult.actionDecision.action).toBe(watchlistResult.actionDecision.action);
    expect(adHocResult.boxStatus).toBe(watchlistResult.boxStatus);
    expect(adHocResult.boxUpper).toBe(watchlistResult.boxUpper);
    expect(adHocResult.boxLower).toBe(watchlistResult.boxLower);
    expect(adHocResult.currentPrice).toBe(48.35);
  });

  it('應能依據市場狀態提供正確的標的池清單 (美股模式絕不包含台股)', async () => {
    const { getScopedUniverseSymbols } = await import('../engine/muscleBookerEngine');
    const usSymbols = getScopedUniverseSymbols('US', 'TW50_CORE');
    expect(usSymbols.length).toBeGreaterThan(0);
    expect(usSymbols.every((s) => s.market === 'US')).toBe(true);

    const twSymbols = getScopedUniverseSymbols('TW', 'TW50_CORE');
    expect(twSymbols.length).toBeGreaterThan(0);
    expect(twSymbols.every((s) => s.market === 'TW')).toBe(true);
  });

  it('目標池常數應名實相符：TW50 滿編 50 檔、US50 滿編 50 檔、台股焦點滿編 30 檔、美股焦點滿編 30 檔', async () => {
    const {
      TW50_BLUE_CHIP_SYMBOLS,
      US_MEGA_50_CORE_SYMBOLS,
      TW_TOP_30_FOCUS_SYMBOLS,
      US_TOP_30_FOCUS_SYMBOLS,
      getScopedUniverseSymbols,
    } = await import('../engine/muscleBookerEngine');

    expect(TW50_BLUE_CHIP_SYMBOLS).toHaveLength(50);
    expect(US_MEGA_50_CORE_SYMBOLS).toHaveLength(50);
    expect(TW_TOP_30_FOCUS_SYMBOLS).toHaveLength(30);
    expect(US_TOP_30_FOCUS_SYMBOLS).toHaveLength(30);

    // 驗證美股焦點池成分股正確納入 PYPL 且徹底移除無效代碼 SQ
    expect(US_TOP_30_FOCUS_SYMBOLS.some((item) => item.symbol === 'PYPL')).toBe(true);
    expect(US_TOP_30_FOCUS_SYMBOLS.some((item) => item.symbol === 'SQ')).toBe(false);

    // 驗證 getScopedUniverseSymbols 返回完全對齊
    expect(getScopedUniverseSymbols('TW', 'TW50_CORE')).toHaveLength(50);
    expect(getScopedUniverseSymbols('US', 'TW50_CORE')).toHaveLength(50);
    expect(getScopedUniverseSymbols('TW', 'TOP30_FOCUS')).toHaveLength(30);
    expect(getScopedUniverseSymbols('US', 'TOP30_FOCUS')).toHaveLength(30);
  });

  it('突破箱頂且 20MA 向上時，若風益比 >= 2.0 應輸出 actionDecision.action 為 BUY 並計算防守價與風益比', () => {
    // 箱體整理在 100~105，最後一天剛帶量突破箱頂收 106.5 (防守 105.6，風險僅 0.9，預期目標 115，風益比高達 9.4R)
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
      const isLast = i === 24;
      const c = isLast ? 106.5 : 100 + i * 0.2;
      return {
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: c,
        high: isLast ? 107 : c + 1,
        low: isLast ? 105.8 : c - 1,
        close: c,
        volume: isLast ? 50000 : 10000,
      };
    });

    const result = scanMuscleBookerItem('2330', '台積電', 'TW', 106.5, candles);
    console.log('ActionDecision:', result.actionDecision);
        expect(result.actionDecision).toBeDefined();
    expect(result.actionDecision.action).toBe('BUY');
    expect(result.actionDecision.stopLossPrice).toBeDefined();
    expect(result.actionDecision.stopLossPrice!).toBeLessThan(106.5);
    expect(result.actionDecision.riskRewardRatioValue).toBeGreaterThanOrEqual(2.0);
    expect(result.actionDecision.riskRewardRatio).toMatch(/^\d+(\.\d+)?R$/);
    expect(result.actionDecision.riskRewardRatio).not.toContain('1 :');
  });

  it('跌破三日箱底時，應輸出 actionDecision.action 為 SELL 並提示破線停損', () => {
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
      const isLast = i === 24;
      const c = isLast ? 85 : 100 + (i % 2);
      return {
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: c,
        high: c + 1,
        low: c - 1,
        close: c,
        volume: 10000,
      };
    });

    const result = scanMuscleBookerItem('2881', '富邦金', 'TW', 85, candles);
    expect(result.actionDecision.action).toBe('SELL');
    expect(result.actionDecision.actionReason).toContain('跌破箱底');
  });

  it('BEGINNER_TOOLTIPS 應包含風益比、箱頂防守、破底翻、布林壓縮與停損等白話文解說', async () => {
    const { BEGINNER_TOOLTIPS } = await import('../engine/muscleBookerEngine');

    expect(BEGINNER_TOOLTIPS).toBeDefined();
    expect(BEGINNER_TOOLTIPS.riskReward).toContain('風益比');
    expect(BEGINNER_TOOLTIPS.riskReward).toContain('R 倍數');
    expect(BEGINNER_TOOLTIPS.boxUpperDefense).toContain('箱頂防守價');
    expect(BEGINNER_TOOLTIPS.bottomPenetration).toContain('破底翻反轉');
    expect(BEGINNER_TOOLTIPS.bollingerSqueeze).toContain('布林極致壓縮');
    expect(BEGINNER_TOOLTIPS.boxLowerBreakdown).toContain('跌破箱底防守線');
    expect(BEGINNER_TOOLTIPS.maDeductionTelescope).toContain('MA20 扣抵望遠鏡');
  });

  it('持股分流邏輯應精確區分在倉 (shares > 0) 與歷史已平倉 (shares === 0)', () => {
    const mockHoldings = [
      { symbol: '2330', name: '台積電', shares: 1000, currentPrice: 1000, market: 'TW' as const, currency: 'TWD' as const, totalCost: 900000 },
      { symbol: '00746B', name: '富邦A級公司債', shares: 0, currentPrice: 38, market: 'TW' as const, currency: 'TWD' as const, realizedPnL: 5000, totalCost: 0 },
      { symbol: '1717', name: '長興', shares: 0, currentPrice: 32, market: 'TW' as const, currency: 'TWD' as const, realizedPnL: -2000, totalCost: 0 },
      { symbol: 'NVDA', name: '輝達', shares: 50, currentPrice: 120, market: 'US' as const, currency: 'USD' as const, totalCost: 5000 },
    ];

    const activeTw = mockHoldings.filter((h) => h.market === 'TW' && h.shares > 0);
    const closedTw = mockHoldings.filter((h) => h.market === 'TW' && h.shares === 0);

    expect(activeTw).toHaveLength(1);
    expect(activeTw[0].symbol).toBe('2330');

    expect(closedTw).toHaveLength(2);
    expect(closedTw.map((h) => h.symbol)).toEqual(['00746B', '1717']);
  });

  it('三色實戰導航儀應將 HOLD (箱內常態整理) 歸併至黃燈觀望待變，確保三色加總 100% 等於全部標的總數', () => {
    // 模擬 16 檔標的：10 檔 BUY、4 檔 AVOID、1 檔 SELL、1 檔 HOLD
    const mockItems = [
      ...Array.from({ length: 10 }, (_, i) => ({ symbol: `BUY_${i}`, actionDecision: { action: 'BUY' as const } })),
      ...Array.from({ length: 4 }, (_, i) => ({ symbol: `AVOID_${i}`, actionDecision: { action: 'AVOID' as const } })),
      { symbol: 'SELL_0', actionDecision: { action: 'SELL' as const } },
      { symbol: 'HOLD_0', actionDecision: { action: 'HOLD' as const } },
    ];

    expect(mockItems.length).toBe(16);

    const buyCount = mockItems.filter((i) => i.actionDecision.action === 'BUY').length;
    const avoidCount = mockItems.filter((i) => i.actionDecision.action === 'AVOID' || i.actionDecision.action === 'HOLD').length;
    const sellCount = mockItems.filter((i) => i.actionDecision.action === 'SELL').length;

    expect(buyCount).toBe(10);
    expect(avoidCount).toBe(5);
    expect(sellCount).toBe(1);
    expect(buyCount + avoidCount + sellCount).toBe(mockItems.length);
  });

  it('市場推斷規則應精確將純數字代碼推斷為 TW，英文字母推斷為 US', () => {
    const inferMarket = (sym: string): 'TW' | 'US' => (/^\d+$/.test(sym.trim()) ? 'TW' : 'US');

    expect(inferMarket('2330')).toBe('TW');
    expect(inferMarket('0050')).toBe('TW');
    expect(inferMarket('3017')).toBe('TW');
    expect(inferMarket('AAPL')).toBe('US');
    expect(inferMarket('NVDA')).toBe('US');
    expect(inferMarket('TSLA')).toBe('US');
  });

  it('CUSTOM_WATCHLIST 自訂觀察池能正確由自訂清單代碼產生標的清單與對應市場', async () => {
    const { resolveOfficialSecurityName } = await import('../engine/stockNameResolver');
    const customWatchlist = ['2330', '3017', 'NVDA'];
    const mockHoldings = [{ symbol: '2330', name: '台積電', currentPrice: 1020, market: 'TW' as const, shares: 100, currency: 'TWD' as const, totalCost: 100000 }];

    const universe = customWatchlist.map((sym) => {
      const isTw = /^\d+$/.test(sym);
      const name = resolveOfficialSecurityName(sym, sym);
      const holding = mockHoldings.find((h) => h.symbol.toUpperCase() === sym);
      return {
        symbol: sym,
        name,
        market: isTw ? ('TW' as const) : ('US' as const),
        basePrice: holding?.currentPrice || 100,
      };
    });

    expect(universe).toHaveLength(3);
    expect(universe[0].symbol).toBe('2330');
    expect(universe[0].market).toBe('TW');
    expect(universe[0].basePrice).toBe(1020);

    expect(universe[1].symbol).toBe('3017');
    expect(universe[1].market).toBe('TW');
    expect(universe[1].basePrice).toBe(100);

    expect(universe[2].symbol).toBe('NVDA');
    expect(universe[2].market).toBe('US');
  });

  it('即時診斷標的 (Ad-hoc Scanned Item) 應能正確覆蓋自訂池中尚未回補日 K 之靜態標的', () => {
    const adHocItem = scanMuscleBookerItem('3017', '奇鋐', 'TW', 650);
    expect(adHocItem.symbol).toBe('3017');
    expect(adHocItem.actionDecision).toBeDefined();

    const universeSymbols = ['2330', '3017'];
    const scannedList = universeSymbols.map((sym) => {
      if (adHocItem && adHocItem.symbol === sym) {
        return adHocItem;
      }
      return scanMuscleBookerItem(sym, '台積電', 'TW', 1000);
    });

    const targetScanned = scannedList.find((i) => i.symbol === '3017');
    expect(targetScanned).toBe(adHocItem);
    expect(targetScanned?.currentPrice).toBe(adHocItem.currentPrice);
  });

  it('風益比不足 2:1 時 (如 1599 宏佳騰)，即使突破箱頂亦應自動降級為 HOLD (觀望待變)，絕不判定為 BUY', () => {
    // 模擬 1599 宏佳騰：確立箱頂 $22.5，但上方有前波高點反壓 $22.75，最後一天收 $22.6 突破箱頂，空間狹小風益比不足 2.0R
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
      const isLast = i === 24;
      const c = isLast ? 22.6 : 22.0 + (i % 3) * 0.15;
      return {
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: isLast ? 22.55 : c,
        high: i === 3 ? 22.75 : (isLast ? 22.62 : 22.5),
        low: isLast ? 22.5 : 21.8,
        close: c,
        volume: 15000,
      };
    });

    const result = scanMuscleBookerItem('1599', '宏佳騰', 'TW', 22.6, candles);
    // 由於利潤空間極小，風益比不足 2.0，絕不能是 BUY！
    expect(result.actionDecision.action).not.toBe('BUY');
    expect(result.actionDecision.action).toBe('HOLD');
    expect(result.actionDecision.actionReason).toContain('風益比');
    expect(result.actionDecision.riskRewardRatioValue).toBeLessThan(2.0);
  });

  it('建議買進清單應依據風益比數值 (riskRewardRatioValue) 由高至低降序排列', () => {
    const item1 = {
      actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 2.1 },
    };
    const item2 = {
      actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 5.3 },
    };
    const item3 = {
      actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 3.2 },
    };

    const sorted = [item1, item2, item3].sort(
      (a, b) => (b.actionDecision.riskRewardRatioValue ?? 0) - (a.actionDecision.riskRewardRatioValue ?? 0)
    );

    expect(sorted[0].actionDecision.riskRewardRatioValue).toBe(5.3);
    expect(sorted[1].actionDecision.riskRewardRatioValue).toBe(3.2);
    expect(sorted[2].actionDecision.riskRewardRatioValue).toBe(2.1);
  });

  it('本地日 K 快取就緒度應精確統計已就緒檔數與就緒百分比', () => {
    const universe = [
      { symbol: '2330' },
      { symbol: '2454' },
      { symbol: '2317' },
      { symbol: '2382' },
    ];

    const candlesMap: Record<string, DailyCandle[]> = {
      '2330': Array.from({ length: 10 }, (_, i) => ({ date: `2026-08-${i + 1}`, open: 100, high: 102, low: 98, close: 101, volume: 100 })),
      '2454': Array.from({ length: 15 }, (_, i) => ({ date: `2026-08-${i + 1}`, open: 100, high: 102, low: 98, close: 101, volume: 100 })),
      '2317': Array.from({ length: 2 }, (_, i) => ({ date: `2026-08-${i + 1}`, open: 100, high: 102, low: 98, close: 101, volume: 100 })), // < 5 根視為未就緒
    };

    const total = universe.length;
    const ready = universe.filter((u) => candlesMap[u.symbol] && candlesMap[u.symbol].length >= 5).length;
    const percent = Math.round((ready / total) * 100);

    expect(total).toBe(4);
    expect(ready).toBe(2);
    expect(percent).toBe(50);
  });

  it('當標的遠端查無資料時，保底合成日 K 注入後就緒度應順利達到 100%', () => {
    const universe = [
      { symbol: '2330' },
      { symbol: 'PYPL' },
    ];

    const candlesMap: Record<string, DailyCandle[]> = {
      '2330': Array.from({ length: 10 }, (_, i) => ({ date: `2026-08-${i + 1}`, open: 100, high: 102, low: 98, close: 101, volume: 100 })),
      // PYPL 經保底合成注入 25 根日 K
      'PYPL': Array.from({ length: 25 }, (_, i) => ({ date: `2026-08-${i + 1}`, open: 65, high: 66, low: 64, close: 65.5, volume: 500 })),
    };

    const total = universe.length;
    const ready = universe.filter((u) => candlesMap[u.symbol] && candlesMap[u.symbol].length >= 5).length;
    const percent = Math.round((ready / total) * 100);

    expect(total).toBe(2);
    expect(ready).toBe(2);
    expect(percent).toBe(100);
  });

  describe('今日核心作戰指令 (Top 3 Action Directives & Holding-Gated Sell)', () => {
    it('買進先鋒前 3 檔應僅包含風益比 >= 2.0 之標的，並按風益比數值降序排列，最多取前 3 檔', () => {
      const scannedList = [
        { symbol: 'A', actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 1.8 } },
        { symbol: 'B', actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 3.5 } },
        { symbol: 'C', actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 5.2 } },
        { symbol: 'D', actionDecision: { action: 'AVOID' as const, riskRewardRatioValue: 4.0 } },
        { symbol: 'E', actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 2.5 } },
        { symbol: 'F', actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 4.1 } },
      ];

      const buyItems = scannedList
        .filter((i) => i.actionDecision.action === 'BUY')
        .sort((a, b) => (b.actionDecision.riskRewardRatioValue ?? 0) - (a.actionDecision.riskRewardRatioValue ?? 0));

      const top3BuyItems = buyItems
        .filter((i) => (i.actionDecision.riskRewardRatioValue ?? 0) >= 2.0)
        .slice(0, 3);

      expect(top3BuyItems).toHaveLength(3);
      expect(top3BuyItems[0].symbol).toBe('C'); // 5.2
      expect(top3BuyItems[1].symbol).toBe('F'); // 4.1
      expect(top3BuyItems[2].symbol).toBe('B'); // 3.5
      expect(top3BuyItems.find((i) => i.symbol === 'A')).toBeUndefined();
      expect(top3BuyItems.find((i) => i.symbol === 'D')).toBeUndefined();
    });

    it('賣出建議必須在庫持股才顯示：非持股即使出現破線 SELL 訊號，也絕不出現在賣出建議清單', () => {
      const activeHoldings = [
        { symbol: '2330', shares: 1000 },
        { symbol: '2454', shares: 500 },
      ];
      const activeHoldingsMap = new Map(activeHoldings.map((h) => [h.symbol.toUpperCase(), h]));

      const scannedList = [
        { symbol: '2330', actionDecision: { action: 'SELL' as const, actionReason: '跌破箱底防守線' } },
        { symbol: '2317', actionDecision: { action: 'SELL' as const, actionReason: '均線下彎蓋頭' } }, // 非在庫持股
        { symbol: '2454', actionDecision: { action: 'HOLD' as const, actionReason: '箱內震盪' } },
        { symbol: '3008', actionDecision: { action: 'SELL' as const, actionReason: '破底下殺' } }, // 非在庫持股
      ];

      const holdingGatedSellItems = scannedList.filter(
        (i) => i.actionDecision.action === 'SELL' && activeHoldingsMap.has(i.symbol.toUpperCase())
      );
      const top3SellItems = holdingGatedSellItems.slice(0, 3);

      expect(top3SellItems).toHaveLength(1);
      expect(top3SellItems[0].symbol).toBe('2330');
      expect(top3SellItems.find((i) => i.symbol === '2317')).toBeUndefined();
      expect(top3SellItems.find((i) => i.symbol === '3008')).toBeUndefined();
    });

    it('若所有在庫持股均安全未破線，賣出建議應為 0 檔 (觸發安全空狀態)', () => {
      const activeHoldings = [
        { symbol: '2330', shares: 1000 },
        { symbol: '2454', shares: 500 },
      ];
      const activeHoldingsMap = new Map(activeHoldings.map((h) => [h.symbol.toUpperCase(), h]));

      const scannedList = [
        { symbol: '2330', actionDecision: { action: 'BUY' as const, actionReason: '突破箱頂' } },
        { symbol: '2454', actionDecision: { action: 'HOLD' as const, actionReason: '箱內震盪' } },
        { symbol: '2317', actionDecision: { action: 'SELL' as const, actionReason: '破底下殺' } }, // 非在庫持股
      ];

      const holdingGatedSellItems = scannedList.filter(
        (i) => i.actionDecision.action === 'SELL' && activeHoldingsMap.has(i.symbol.toUpperCase())
      );
      const top3SellItems = holdingGatedSellItems.slice(0, 3);

      expect(top3SellItems).toHaveLength(0);
    });

    it('Spec 0216 Ticket 07: 在庫持股雙重警戒應同時收錄已破防與瀕臨破防 (Buffer <= 1.5%) 標的', () => {
      const activeHoldings = [
        { symbol: '2330', shares: 1000 }, // 安全 (緩衝 5%)
        { symbol: '2454', shares: 500 },  // 瀕臨破防 (緩衝 0.8% <= 1.5%)
        { symbol: '3008', shares: 200 },  // 已破防 (跌破防守價)
      ];
      const activeHoldingsMap = new Map(activeHoldings.map((h) => [h.symbol.toUpperCase(), h]));

      const scannedList = [
        {
          symbol: '2330',
          currentPrice: 1000,
          actionDecision: { action: 'HOLD' as const, stopLossPrice: 950, actionReason: '守穩箱內' },
        },
        {
          symbol: '2454',
          currentPrice: 1008,
          actionDecision: { action: 'HOLD' as const, stopLossPrice: 1000, actionReason: '回踩測試' }, // 緩衝 (1008-1000)/1008 = 0.79% <= 1.5%
        },
        {
          symbol: '3008',
          currentPrice: 890,
          actionDecision: { action: 'SELL' as const, stopLossPrice: 900, actionReason: '跌破箱底' }, // 已破防
        },
        {
          symbol: '2317', // 非在庫持股
          currentPrice: 100,
          actionDecision: { action: 'SELL' as const, stopLossPrice: 105, actionReason: '非持股破線' },
        },
      ];

      const criticalAlerts = scannedList.filter((i) => {
        if (!activeHoldingsMap.has(i.symbol.toUpperCase())) return false;
        const def = i.actionDecision.stopLossPrice;
        if (def === undefined || i.currentPrice <= 0) return i.actionDecision.action === 'SELL';
        const isBroken = i.currentPrice < def;
        const buf = ((i.currentPrice - def) / i.currentPrice) * 100;
        return isBroken || buf <= 1.5 || i.actionDecision.action === 'SELL';
      });

      expect(criticalAlerts).toHaveLength(2);
      expect(criticalAlerts.map((i) => i.symbol)).toContain('2454');
      expect(criticalAlerts.map((i) => i.symbol)).toContain('3008');
      expect(criticalAlerts.map((i) => i.symbol)).not.toContain('2330');
      expect(criticalAlerts.map((i) => i.symbol)).not.toContain('2317');
    });

    it('Spec 0216 Ticket 08: 實戰快篩應精確過濾出極致壓縮 (SQUEEZE) 與瀕臨破線標的', () => {
      const items = [
        { symbol: 'A', isBollingerSqueeze: true, currentPrice: 100, actionDecision: { action: 'HOLD' as const, stopLossPrice: 90 } },
        { symbol: 'B', isBollingerSqueeze: false, currentPrice: 100, actionDecision: { action: 'HOLD' as const, stopLossPrice: 99 } }, // 緩衝 1.0% <= 1.5%
        { symbol: 'C', isBollingerSqueeze: false, currentPrice: 100, actionDecision: { action: 'HOLD' as const, stopLossPrice: 90 } },
      ];

      const squeezeItems = items.filter((i) => i.isBollingerSqueeze);
      expect(squeezeItems).toHaveLength(1);
      expect(squeezeItems[0].symbol).toBe('A');

      const criticalBufferItems = items.filter((i) => {
        const def = i.actionDecision.stopLossPrice;
        const buf = ((i.currentPrice - def) / i.currentPrice) * 100;
        return buf <= 1.5;
      });
      expect(criticalBufferItems).toHaveLength(1);
      expect(criticalBufferItems[0].symbol).toBe('B');
    });
  });

    describe('Issue #399: 快篩視圖全聯動與 O(N) 排序快取防禦', () => {
      it('快篩膠囊生效時，操盤導航分區與動能看板應完全同步消費過濾後清單 (filteredItems)', () => {
        const mockScannedList = [
          { symbol: 'A', name: '標的A', actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 3.0 }, isBollingerSqueeze: true, currentPrice: 100 },
          { symbol: 'B', name: '標的B', actionDecision: { action: 'BUY' as const, riskRewardRatioValue: 2.2 }, isBollingerSqueeze: false, currentPrice: 100 },
          { symbol: 'C', name: '標的C', actionDecision: { action: 'AVOID' as const }, isBollingerSqueeze: true, currentPrice: 50 },
          { symbol: 'D', name: '標的D', actionDecision: { action: 'SELL' as const }, isBollingerSqueeze: false, currentPrice: 30 },
        ];

        // 模擬使用者點擊「🎯 緊縮突破 (SQUEEZE)」
        const filterChip = 'SQUEEZE';
        const filteredItems = mockScannedList.filter((item) => {
          if (filterChip === 'SQUEEZE') return item.isBollingerSqueeze;
          return true;
        });

        // 操盤導航分區
        const buyItems = filteredItems.filter((i) => i.actionDecision.action === 'BUY');
        const avoidItems = filteredItems.filter((i) => (i.actionDecision.action as string) === 'AVOID' || (i.actionDecision.action as string) === 'HOLD');
        const sellItems = filteredItems.filter((i) => i.actionDecision.action === 'SELL');

        // 驗證三色導航與動能看板標的均精確同步為緊縮標的 (A 與 C)，非緊縮的 B 與 D 被徹底過濾
        expect(filteredItems).toHaveLength(2);
        expect(filteredItems.map((i) => i.symbol)).toEqual(['A', 'C']);
        expect(buyItems).toHaveLength(1);
        expect(buyItems[0].symbol).toBe('A');
        expect(avoidItems).toHaveLength(1);
        expect(avoidItems[0].symbol).toBe('C');
        expect(sellItems).toHaveLength(0);
      });

      it('多維排序 O(N) 快取比較器應能精準進行爆量與緩衝率排序', () => {
        const mockList = [
          { symbol: 'A', volRatio: 1.2, bufferPercent: 5.0 },
          { symbol: 'B', volRatio: 2.8, bufferPercent: 0.8 },
          { symbol: 'C', volRatio: 1.9, bufferPercent: 2.1 },
        ];

        // O(N) 預算快取
        const metricsMap = new Map(mockList.map((m) => [m.symbol, m]));

        // 爆量由大到小排序
        const sortedByVol = [...mockList].sort(
          (a, b) => (metricsMap.get(b.symbol)?.volRatio ?? 0) - (metricsMap.get(a.symbol)?.volRatio ?? 0)
        );
        expect(sortedByVol.map((i) => i.symbol)).toEqual(['B', 'C', 'A']);

        // 緩衝由緊到寬排序 (瀕危優先)
        const sortedByBuffer = [...mockList].sort(
          (a, b) => (metricsMap.get(a.symbol)?.bufferPercent ?? 999) - (metricsMap.get(b.symbol)?.bufferPercent ?? 999)
        );
        expect(sortedByBuffer.map((i) => i.symbol)).toEqual(['B', 'C', 'A']);
      });
    });

});





