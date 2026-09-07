import { describe, it, expect } from 'vitest';
import {
  computeChaikinMoneyFlow,
  getBeginnerDiagnosis,
  calculateSmartMoneyFlowDynamics,
  resolveBubbleCollisions,
  detectInstitutionalSynergy,
  getTemporalBubbleFrameData,
} from './smartMoneyEngine';
import { SmartMoneyInputItem } from '../types/stock';

describe('smartMoneyEngine (籌碼與聰明錢量化引擎)', () => {
  describe('computeChaikinMoneyFlow (美股 CMF 佳慶資金流向指標)', () => {
    it('資料不足或為空時平滑返回 0', () => {
      expect(computeChaikinMoneyFlow([])).toBe(0);
      expect(computeChaikinMoneyFlow([{ date: '2026-09-01', open: 100, high: 105, low: 95, close: 100, volume: 0 }])).toBe(0);
    });

    it('當收盤價持續接近當日最高價時，CMF 應呈現強烈正值（機構吸籌）', () => {
      // 20 天連續收在高點
      const bullishCandles = Array.from({ length: 20 }).map((_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 110 + i,
        low: 99 + i,
        close: 109.5 + i, // 極接近 High
        volume: 1000000,
      }));

      const cmf = computeChaikinMoneyFlow(bullishCandles);
      expect(cmf).toBeGreaterThan(0.7);
      expect(cmf).toBeLessThanOrEqual(1.0);
    });

    it('當收盤價持續接近當日最低價時，CMF 應呈現強烈負值（主力出貨）', () => {
      // 20 天連續收在低點
      const bearishCandles = Array.from({ length: 20 }).map((_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: 110 - i,
        high: 111 - i,
        low: 100 - i,
        close: 100.5 - i, // 極接近 Low
        volume: 1000000,
      }));

      const cmf = computeChaikinMoneyFlow(bearishCandles);
      expect(cmf).toBeLessThan(-0.7);
      expect(cmf).toBeGreaterThanOrEqual(-1.0);
    });
  });

  describe('getBeginnerDiagnosis (零基礎新手白話診斷生成器)', () => {
    it('針對 BREAKOUT 象限產出「🔥 主力抬轎飆股區」生活化標籤與看多警語', () => {
      const diag = getBeginnerDiagnosis('BREAKOUT', '2330', '台積電', +3.5, 5200000000);
      expect(diag.quadrantLabel).toContain('主力抬轎');
      expect(diag.diagnosisTitle).toContain('做多');
      expect(diag.diagnosisDetail).toContain('大機構');
    });

    it('針對 DISTRIBUTION 象限產出「⚠️ 割韭菜警戒區」與高檔倒貨警示', () => {
      const diag = getBeginnerDiagnosis('DISTRIBUTION', '2481', '強茂', +1.2, -85000000);
      expect(diag.quadrantLabel).toContain('割韭菜');
      expect(diag.diagnosisTitle).toContain('倒貨');
      expect(diag.diagnosisDetail).toContain('小心');
    });

    it('針對 ACCUMULATION 象限產出「🛡️ 逢低撿便宜區」與逆勢吸籌說明', () => {
      const diag = getBeginnerDiagnosis('ACCUMULATION', '0050', '元大台灣50', -1.5, 320000000);
      expect(diag.quadrantLabel).toContain('逢低撿便宜');
      expect(diag.diagnosisTitle).toContain('吃貨');
    });

    it('針對 LIQUIDATION 象限產出「❄️ 冷凍提款區」與撤退警示', () => {
      const diag = getBeginnerDiagnosis('LIQUIDATION', '8105', '凌巨', -2.8, -45000000);
      expect(diag.quadrantLabel).toContain('冷凍提款');
      expect(diag.diagnosisTitle).toContain('提款');
    });

    it('美股 (US) 標的絕不輸出任何「三大法人」字眼，且依 CMF 生成大機構生活化診斷', () => {
      // 測試美股 VT 高 CMF (+0.67) 情況
      const diagBullish = getBeginnerDiagnosis(
        'BREAKOUT',
        'VT',
        'Vanguard全世界股票ETF',
        +0.7,
        0, // 模擬即使 netFlowAmount 未及時換算，也不應被判定為三大法人 0 張
        'US',
        0.67
      );
      expect(diagBullish.quadrantLabel).toBe('🔥 主力抬轎飆股區');
      expect(diagBullish.diagnosisTitle).toContain('大機構');
      expect(diagBullish.diagnosisDetail).toContain('美股');
      expect(diagBullish.diagnosisDetail).not.toContain('三大法人');
      expect(diagBullish.diagnosisTitle).not.toContain('三大法人');

      // 測試美股中立 CMF (0.02)
      const diagNeutral = getBeginnerDiagnosis(
        'BREAKOUT',
        'VT',
        'Vanguard全世界股票ETF',
        +0.2,
        0,
        'US',
        0.02
      );
      expect(diagNeutral.quadrantLabel).toContain('機構觀望');
      expect(diagNeutral.diagnosisDetail).not.toContain('三大法人');
      expect(diagNeutral.diagnosisTitle).not.toContain('三大法人');
    });
  });

  describe('calculateSmartMoneyFlowDynamics (主要測試縫隙)', () => {
    it('台股：外資與投信聯手大買且股價上漲，正確判定為 BREAKOUT（右上象限）', () => {
      const items: SmartMoneyInputItem[] = [
        {
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currentPrice: 1000,
          previousClose: 970,
          changePercent: 3.09,
          holdingValueTwd: 700000,
          foreignBuyShares: 15000,
          foreignSellShares: 5000, // 外資淨買 10,000 張
          trustBuyShares: 3000,
          trustSellShares: 500,    // 投信淨買 2,500 張
          dealerBuyShares: 1000,
          dealerSellShares: 800,
        },
      ];

      const result = calculateSmartMoneyFlowDynamics(items);
      expect(result.bubbles).toHaveLength(1);
      const b = result.bubbles[0];

      expect(b.quadrant).toBe('BREAKOUT');
      expect(b.x).toBeGreaterThan(0); // 右半側
      expect(b.y).toBeGreaterThan(0); // 上半側
      expect(b.flowDescription).toContain('外資與投信合買');
      expect(b.foreignNetShares).toBe(10000);
      expect(b.trustNetShares).toBe(2500);
      expect(result.breakoutCount).toBe(1);
      expect(result.overallSentiment).toBe('BULLISH');
    });

    it('台股：股價上漲但三大法人大舉提款，正確判定為 DISTRIBUTION（右下象限割韭菜區）', () => {
      const items: SmartMoneyInputItem[] = [
        {
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currentPrice: 80,
          previousClose: 78,
          changePercent: 2.56,
          holdingValueTwd: 800000,
          foreignBuyShares: 200,
          foreignSellShares: 3000, // 外資大賣
          trustBuyShares: 0,
          trustSellShares: 1000,  // 投信大賣
        },
      ];

      const result = calculateSmartMoneyFlowDynamics(items);
      const b = result.bubbles[0];

      expect(b.quadrant).toBe('DISTRIBUTION');
      expect(b.x).toBeGreaterThan(0); // 價漲
      expect(b.y).toBeLessThan(0);    // 法人倒貨
      expect(b.diagnosisTitle).toContain('倒貨');
      expect(result.distributionCount).toBe(1);
    });

    it('美股：依日 K 線計算 CMF，若 CMF 為正且價格上漲，正確映射至相應四象限', () => {
      const candles = Array.from({ length: 20 }).map((_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: 150 + i,
        high: 160 + i,
        low: 149 + i,
        close: 159.5 + i,
        volume: 2000000,
      }));

      const items: SmartMoneyInputItem[] = [
        {
          symbol: 'VT',
          name: 'Vanguard全世界股票',
          market: 'US',
          currentPrice: 160,
          previousClose: 158,
          changePercent: 1.27,
          holdingValueTwd: 400000,
          candles,
        },
      ];

      const result = calculateSmartMoneyFlowDynamics(items);
      const b = result.bubbles[0];

      expect(b.market).toBe('US');
      expect(b.cmf).toBeDefined();
      expect(b.cmf!).toBeGreaterThan(0.5);
      expect(b.quadrant).toBe('BREAKOUT');
      expect(b.flowDescription).toContain('CMF');
    });

    it('台股：股價下跌且三大法人無買賣超 (0 張)，嚴格不歸入 ACCUMULATION 逢低吸籌區', () => {
      const items: SmartMoneyInputItem[] = [
        {
          symbol: '2886',
          name: '兆豐金',
          market: 'TW',
          currentPrice: 38,
          previousClose: 38.5,
          changePercent: -1.4,
          holdingValueTwd: 500000,
          foreignBuyShares: 0,
          foreignSellShares: 0,
          trustBuyShares: 0,
          trustSellShares: 0,
          dealerBuyShares: 0,
          dealerSellShares: 0,
        },
      ];

      const result = calculateSmartMoneyFlowDynamics(items);
      const b = result.bubbles[0];
      // 零法人買盤絕不可誤判為逢低吸籌 (ACCUMULATION)
      expect(b.quadrant).not.toBe('ACCUMULATION');
      expect(b.quadrant).toBe('LIQUIDATION');
    });

    it('坐標嚴格鉗制在 [-100, +100] 範圍內，泡泡半徑在 [14, 46] 之間', () => {
      const extremeItems: SmartMoneyInputItem[] = [
        {
          symbol: 'EX_HIGH',
          name: '極端飆股',
          market: 'TW',
          currentPrice: 200,
          previousClose: 100,
          changePercent: 100, // +100%
          holdingValueTwd: 999999999,
          foreignBuyShares: 999999,
          foreignSellShares: 0,
        },
        {
          symbol: 'EX_LOW',
          name: '極端崩盤',
          market: 'TW',
          currentPrice: 10,
          previousClose: 100,
          changePercent: -90, // -90%
          holdingValueTwd: 100,
          foreignBuyShares: 0,
          foreignSellShares: 999999,
        },
      ];

      const result = calculateSmartMoneyFlowDynamics(extremeItems);
      for (const b of result.bubbles) {
        expect(b.x).toBeGreaterThanOrEqual(-100);
        expect(b.x).toBeLessThanOrEqual(100);
        expect(b.y).toBeGreaterThanOrEqual(-100);
        expect(b.y).toBeLessThanOrEqual(100);
        expect(b.radius).toBeGreaterThanOrEqual(14);
        expect(b.radius).toBeLessThanOrEqual(46);
      }
    });

    it('支援歷史位移軌跡點 (trail) 正確轉換', () => {
      const items: SmartMoneyInputItem[] = [
        {
          symbol: '0050',
          name: '元大台灣50',
          market: 'TW',
          currentPrice: 190,
          previousClose: 188,
          changePercent: 1.06,
          foreignBuyShares: 5000,
          foreignSellShares: 1000,
          historicalDailyFlows: [
            { date: '2026-09-01', changePercent: -0.5, flowScore: 0.2, netFlowAmount: 20000000 },
            { date: '2026-09-02', changePercent: 0.8, flowScore: 0.5, netFlowAmount: 50000000 },
          ],
        },
      ];

      const result = calculateSmartMoneyFlowDynamics(items);
      const b = result.bubbles[0];
      expect(b.trail).toHaveLength(2);
      expect(b.trail[0].date).toBe('2026-09-01');
      expect(b.trail[0].x).toBeLessThan(0); // -0.5% 映射為負
      expect(b.trail[1].x).toBeGreaterThan(0); // +0.8% 映射為正
    });

    it('自適應相對冪次縮放：極端巨量大單 (如 60,000 張) 的 Y 坐標依然落在 [-75, +75] 範圍內保留呼吸區', () => {
      const items: SmartMoneyInputItem[] = [
        {
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currentPrice: 1000,
          previousClose: 980,
          changePercent: 2.04,
          foreignBuyShares: 70000,
          foreignSellShares: 10000, // 淨買 60,000 張
        },
        {
          symbol: '2317',
          name: '鴻海',
          market: 'TW',
          currentPrice: 200,
          previousClose: 195,
          changePercent: 2.56,
          foreignBuyShares: 30000,
          foreignSellShares: 10000, // 淨買 20,000 張
        },
      ];

      const result = calculateSmartMoneyFlowDynamics(items);
      for (const b of result.bubbles) {
        expect(Math.abs(b.y)).toBeLessThanOrEqual(75);
        expect(Math.abs(b.x)).toBeLessThanOrEqual(75);
      }
      // 較大買超的台積電 Y 坐標應大於較小的鴻海，但均未達到 100
      expect(result.bubbles[0].y).toBeGreaterThan(result.bubbles[1].y);
    });
  });

  describe('resolveBubbleCollisions (2D 圓形防碰撞排斥演算法)', () => {
    it('若兩顆泡泡半徑重疊，排斥後兩者中心距離必須大於等於兩半徑之和', () => {
      const width = 800;
      const height = 600;
      const padding = 50;

      // 建立兩顆重疊在右上象限的泡泡
      const mockBubbles = [
        {
          symbol: 'A',
          name: '股票A',
          market: 'TW',
          x: 20,
          y: 20,
          radius: 30,
          changePercent: 2,
          flowScore: 0.5,
          quadrant: 'BREAKOUT',
        },
        {
          symbol: 'B',
          name: '股票B',
          market: 'TW',
          x: 20, // 完全相同的坐標
          y: 20,
          radius: 25,
          changePercent: 2,
          flowScore: 0.5,
          quadrant: 'BREAKOUT',
        },
      ];

      const placed = resolveBubbleCollisions(mockBubbles, width, height, padding);
      expect(placed).toHaveLength(2);

      const dx = placed[0].cx - placed[1].cx;
      const dy = placed[0].cy - placed[1].cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 間距需大於等於兩者半徑和
      expect(dist).toBeGreaterThanOrEqual(mockBubbles[0].radius + mockBubbles[1].radius);
    });

    it('象限守恆性守門員：密集推擠時，泡泡絕對不可跨越中軸進入其他象限', () => {
      const width = 800;
      const height = 600;
      const padding = 50;
      const midX = width / 2;
      const midY = height / 2;

      // 5 顆全擠在右上象限 (x > 0, y > 0 => cx > midX, cy < midY)
      const crowdedBubbles = Array.from({ length: 5 }).map((_, i) => ({
        symbol: `SYM_${i}`,
        name: `股票_${i}`,
        market: 'TW',
        x: 10,
        y: 10,
        radius: 20,
        changePercent: 1.0,
        flowScore: 0.3,
        quadrant: 'BREAKOUT',
      }));

      const placed = resolveBubbleCollisions(crowdedBubbles, width, height, padding);

      for (const p of placed) {
        // 必須保持在右上象限 (cx > midX, cy < midY)
        expect(p.cx).toBeGreaterThan(midX);
        expect(p.cy).toBeLessThan(midY);
        // 邊界不能超出
        expect(p.cx).toBeLessThanOrEqual(width - padding);
        expect(p.cy).toBeGreaterThanOrEqual(padding);
      }
    });

    it('2D 正交空間排斥：當多顆泡泡初始水平串在同一高度線時，排斥演算法應產生垂直錯落位移', () => {
      const width = 880;
      const height = 560;
      const padding = 50;

      // 模擬照片 1 狀況：5 顆泡泡 Y 軸全部完全相同 (y=40, 即同一水平高度)，X 軸極為接近
      const horizontalBubbles = [
        { symbol: 'A', name: 'A', market: 'TW', x: 20, y: 40, radius: 24 },
        { symbol: 'B', name: 'B', market: 'TW', x: 22, y: 40, radius: 20 },
        { symbol: 'C', name: 'C', market: 'TW', x: 24, y: 40, radius: 18 },
        { symbol: 'D', name: 'D', market: 'TW', x: 26, y: 40, radius: 28 },
      ];

      const placed = resolveBubbleCollisions(horizontalBubbles, width, height, padding);
      expect(placed).toHaveLength(4);

      // 檢查其 cy 坐標，不應再全部相等，應有顯著的垂直正交散開 (至少有大於 10px 的垂直落差)
      const cys = placed.map((p) => p.cy);
      const minCy = Math.min(...cys);
      const maxCy = Math.max(...cys);
      const verticalSpread = maxCy - minCy;

      expect(verticalSpread).toBeGreaterThanOrEqual(15);
    });
  });

  describe('detectInstitutionalSynergy (專業券商機構共振態識別)', () => {
    it('外資與投信同步大買（>100張），判定為 DUAL_BUY（🚀 土洋合買抬轎）', () => {
      const synergy = detectInstitutionalSynergy(5000, 2000);
      expect(synergy.type).toBe('DUAL_BUY');
      expect(synergy.label).toContain('土洋合買');
    });

    it('外資大賣、投信大買（>100張），判定為 TUG_OF_WAR（⚡ 土洋對作激戰）', () => {
      const synergy = detectInstitutionalSynergy(-5000, 3000);
      expect(synergy.type).toBe('TUG_OF_WAR');
      expect(synergy.label).toContain('土洋對作');
    });

    it('外資大買、投信大賣（>100張），判定為 TUG_OF_WAR（⚡ 土洋對作激戰）', () => {
      const synergy = detectInstitutionalSynergy(4000, -2500);
      expect(synergy.type).toBe('TUG_OF_WAR');
      expect(synergy.label).toContain('土洋對作');
    });

    it('外資與投信同步調節賣超（<-100張），判定為 DUAL_SELL（💣 土洋同步調節）', () => {
      const synergy = detectInstitutionalSynergy(-3000, -1500);
      expect(synergy.type).toBe('DUAL_SELL');
      expect(synergy.label).toContain('土洋同步調節');
    });

    it('張數未達顯著門檻或單方進出，判定為 NEUTRAL', () => {
      expect(detectInstitutionalSynergy(50, 20).type).toBe('NEUTRAL');
      expect(detectInstitutionalSynergy(undefined, undefined).type).toBe('NEUTRAL');
    });
  });

  describe('getTemporalBubbleFrameData (時序影格圖卡即時動態抽取與重算)', () => {
    const mockBubble = {
      symbol: '2330',
      name: '台積電',
      market: 'TW' as const,
      x: 50,
      y: 60,
      radius: 28,
      changePercent: 3.5,
      netFlowAmount: 5000000000,
      flowScore: 0.8,
      flowDescription: '外資與投信合買',
      quadrant: 'BREAKOUT' as const,
      quadrantLabel: '🔥 主力抬轎飆股區',
      diagnosisTitle: '大機構強烈做多中！',
      diagnosisDetail: '大機構合力買進',
      foreignNetShares: 10000,
      trustNetShares: 2000,
      trail: [
        { x: -20, y: -30, date: '2026-09-01', changePercent: -2.1, flowScore: -0.4, foreignNetShares: -5000, trustNetShares: -1000, dealerNetShares: -200 },
        { x: 10, y: 15, date: '2026-09-02', changePercent: 0.8, flowScore: 0.2, foreignNetShares: 3000, trustNetShares: 500, dealerNetShares: 100 },
        { x: 50, y: 60, date: '2026-09-03', changePercent: 3.5, flowScore: 0.8, foreignNetShares: 10000, trustNetShares: 2000, dealerNetShares: 500 },
      ],
    };

    it('讀取第 0 天時，圖卡資料應切換為 2026-09-01 的數值與 LIQUIDATION 象限診斷', () => {
      const frame = getTemporalBubbleFrameData(mockBubble, 0, '2026-09-01');
      expect(frame.date).toBe('2026-09-01');
      expect(frame.changePercent).toBe(-2.1);
      expect(frame.flowScore).toBe(-0.4);
      expect(frame.quadrant).toBe('LIQUIDATION');
      expect(frame.quadrantLabel).toContain('冷凍提款');
      expect(frame.diagnosisTitle).toContain('提款');
      expect(frame.foreignNetShares).toBe(-5000);
      expect(frame.trustNetShares).toBe(-1000);
      expect(frame.dealerNetShares).toBe(-200);
    });

    it('讀取第 1 天時，圖卡資料應切換為 2026-09-02 的數值與 BREAKOUT 象限診斷', () => {
      const frame = getTemporalBubbleFrameData(mockBubble, 1, '2026-09-02');
      expect(frame.date).toBe('2026-09-02');
      expect(frame.changePercent).toBe(0.8);
      expect(frame.flowScore).toBe(0.2);
      expect(frame.quadrant).toBe('BREAKOUT');
      expect(frame.quadrantLabel).toContain('主力抬轎');
      expect(frame.foreignNetShares).toBe(3000);
      expect(frame.trustNetShares).toBe(500);
      expect(frame.dealerNetShares).toBe(100);
    });

    it('讀取第 2 天時，應提取第 2 天最新法人買賣超張數', () => {
      const frame = getTemporalBubbleFrameData(mockBubble, 2, '2026-09-03');
      expect(frame.date).toBe('2026-09-03');
      expect(frame.foreignNetShares).toBe(10000);
      expect(frame.trustNetShares).toBe(2000);
      expect(frame.dealerNetShares).toBe(500);
    });
  });

  describe('土洋對作防抹殺與半徑收斂驗證', () => {
    it('當外資賣 5,000 張、投信買 5,000 張時，不可因代數相加為 0 誤判為平穩，應標註土洋對作激戰', () => {
      const items: SmartMoneyInputItem[] = [
        {
          symbol: '2603',
          name: '長榮',
          market: 'TW',
          currentPrice: 200,
          previousClose: 198,
          changePercent: 1.01,
          foreignBuyShares: 0,
          foreignSellShares: 5000, // 外資賣 5,000
          trustBuyShares: 5000,
          trustSellShares: 0,    // 投信買 5,000
        },
      ];

      const result = calculateSmartMoneyFlowDynamics(items);
      const b = result.bubbles[0];

      expect(b.institutionalSynergy).toBe('TUG_OF_WAR');
      expect(b.synergyLabel).toContain('土洋對作');
      expect(b.flowDescription).toContain('土洋對作');
      // 半徑收斂在 16~36 之間
      expect(b.radius).toBeGreaterThanOrEqual(16);
      expect(b.radius).toBeLessThanOrEqual(36);
    });
  });

  describe('雙向正交微擾動與法人 0 張中立保護診斷 (v8.1.0)', () => {
    it('2D 雙向正交排斥：當多顆泡泡垂直串在一條縱軸線上 (x 相同或極近)，應產生水平錯落位移', () => {
      const width = 880;
      const height = 560;
      const padding = 50;

      // 模擬照片 2 狀況：多檔 ETF 漲跌幅皆在 0 附近 (x=0)，Y 軸相鄰重疊
      const verticalBubbles = [
        { symbol: 'ETF1', name: 'ETF1', market: 'TW', x: 2, y: -20, radius: 24 },
        { symbol: 'ETF2', name: 'ETF2', market: 'TW', x: 2, y: -23, radius: 20 },
        { symbol: 'ETF3', name: 'ETF3', market: 'TW', x: 2, y: -26, radius: 18 },
        { symbol: 'ETF4', name: 'ETF4', market: 'TW', x: 2, y: -30, radius: 26 },
      ];

      const placed = resolveBubbleCollisions(verticalBubbles, width, height, padding);
      expect(placed).toHaveLength(4);

      // 檢查 cx 坐標，不應再全部相等，應有顯著的水平正交散開 (至少有大於 15px 的水平落差)
      const cxs = placed.map((p) => p.cx);
      const minCx = Math.min(...cxs);
      const maxCx = Math.max(...cxs);
      const horizontalSpread = maxCx - minCx;

      expect(horizontalSpread).toBeGreaterThanOrEqual(15);
    });

    it('法人 0 張中立診斷保護：當三大法人進出為 0 且股價下跌時，不得輸出「大機構大舉提款」之矛盾結論', () => {
      const diag = getBeginnerDiagnosis('LIQUIDATION', '8299', '群聯', -2.6, 0);
      expect(diag.diagnosisTitle).not.toContain('大機構持續提款');
      expect(diag.diagnosisTitle).not.toContain('大機構強烈做多');
      expect(diag.diagnosisDetail).toContain('散戶');
      expect(diag.quadrantLabel).toContain('量縮');
    });
  });
});



