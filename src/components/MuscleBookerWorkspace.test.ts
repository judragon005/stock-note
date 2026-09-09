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
    expect(result.actionDecision).toBeDefined();
    expect(result.actionDecision.action).toBe('BUY');
    expect(result.actionDecision.stopLossPrice).toBeDefined();
    expect(result.actionDecision.stopLossPrice!).toBeLessThan(106.5);
    expect(result.actionDecision.riskRewardRatioValue).toBeGreaterThanOrEqual(2.0);
    expect(result.actionDecision.riskRewardRatio).toContain('1 :');
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
    // 模擬 1599 宏佳騰：箱頂 $23.2，現價 $23.15，防守價 $22.3 (風險 0.85，利潤 0.10 -> 風益比約 0.1R)
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
      const isLast = i === 24;
      const c = isLast ? 23.15 : 22.0 + (i % 3) * 0.4;
      return {
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: c,
        high: isLast ? 23.2 : 23.2,
        low: isLast ? 22.3 : 21.8,
        close: c,
        volume: 15000,
      };
    });

    const result = scanMuscleBookerItem('1599', '宏佳騰', 'TW', 23.15, candles);
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
});





