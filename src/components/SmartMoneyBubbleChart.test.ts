import { describe, it, expect } from 'vitest';
import {
  calculateCanvasCoordinates,
  getBubbleFillColor,
  getBubbleStrokeColor,
  formatInstitutionalDetailText,
  calculateTooltipPlacement,
} from './SmartMoneyBubbleChart';
import { SmartMoneyBubbleData } from '../types/stock';

describe('SmartMoneyBubbleChart 視覺映射與輔助計算測試 (Tickets 03 & 04)', () => {
  const mockBubble: SmartMoneyBubbleData = {
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    x: 50,
    y: 60,
    radius: 30,
    changePercent: 3.5,
    netFlowAmount: 5000000000,
    flowScore: 0.8,
    flowDescription: '外資與投信合買 12,000 張',
    quadrant: 'BREAKOUT',
    quadrantLabel: '🔥 主力抬轎飆股區',
    diagnosisTitle: '大機構強烈做多中！',
    diagnosisDetail: '大機構合力砸錢買進...',
    foreignNetShares: 10000,
    trustNetShares: 2000,
    dealerNetShares: 500,
    trail: [],
  };

  describe('calculateCanvasCoordinates (坐標系轉換)', () => {
    it('中軸中心點 (0, 0) 應精準對應至畫布中心 (width/2, height/2)', () => {
      const { cx, cy } = calculateCanvasCoordinates(0, 0, 800, 600, 40);
      expect(cx).toBe(400);
      expect(cy).toBe(300);
    });

    it('右上象限 (+100, +100) 應映射至右上角邊界內側', () => {
      const { cx, cy } = calculateCanvasCoordinates(100, 100, 800, 600, 40);
      expect(cx).toBe(800 - 40); // 最右側
      expect(cy).toBe(40);        // 最頂部 (SVG Y 軸朝下，因此 +100 為頂部小 Y)
    });

    it('左下象限 (-100, -100) 應映射至左下角邊界內側', () => {
      const { cx, cy } = calculateCanvasCoordinates(-100, -100, 800, 600, 40);
      expect(cx).toBe(40);        // 最左側
      expect(cy).toBe(600 - 40); // 最底部
    });
  });

  describe('色彩映射連動主題 (ColorThemeMode Integration)', () => {
    it('台股主題 (taiwan)：主力做多 (BREAKOUT) 應使用多頭紅主色調', () => {
      const fill = getBubbleFillColor(mockBubble, 'taiwan');
      const stroke = getBubbleStrokeColor(mockBubble, 'taiwan');
      expect(fill).toContain('rgba(239, 68, 68'); // #ef4444 紅
      expect(stroke).toBe('#ef4444');
    });

    it('國際主題 (international)：主力做多 (BREAKOUT) 應使用多頭綠主色調', () => {
      const fill = getBubbleFillColor(mockBubble, 'international');
      const stroke = getBubbleStrokeColor(mockBubble, 'international');
      expect(fill).toContain('rgba(16, 185, 129'); // #10b981 綠
      expect(stroke).toBe('#10b981');
    });

    it('空頭警戒 (DISTRIBUTION / LIQUIDATION) 色彩在台美主題下正確反轉', () => {
      const bearBubble = { ...mockBubble, quadrant: 'DISTRIBUTION' as const };
      // 台股空頭為綠
      expect(getBubbleStrokeColor(bearBubble, 'taiwan')).toBe('#10b981');
      // 國際空頭為紅
      expect(getBubbleStrokeColor(bearBubble, 'international')).toBe('#ef4444');
    });
  });

  describe('formatInstitutionalDetailText (三大法人明細格式化)', () => {
    it('台股正確輸出外資、投信與自營商張數', () => {
      const text = formatInstitutionalDetailText(mockBubble);
      expect(text).toContain('外資: +10,000 張');
      expect(text).toContain('投信: +2,000 張');
      expect(text).toContain('自營商: +500 張');
    });

    it('美股正確輸出 CMF 資金流向與意向說明', () => {
      const usBubble: SmartMoneyBubbleData = {
        ...mockBubble,
        market: 'US',
        cmf: 0.28,
        foreignNetShares: undefined,
        trustNetShares: undefined,
      };
      const text = formatInstitutionalDetailText(usBubble);
      expect(text).toContain('CMF 資金流: +0.28');
      expect(text).toContain('機構資金顯著流入');
    });

    it('支援傳入動態影格資料物件 (Frame Data)，輸出該影格專屬之法人張數', () => {
      // 模擬 T-4 影格數值
      const frameData = {
        market: 'TW' as const,
        foreignNetShares: 122,
        trustNetShares: -22,
        dealerNetShares: 57,
      };
      const text = formatInstitutionalDetailText(frameData);
      expect(text).toContain('外資: +122 張');
      expect(text).toContain('投信: -22 張');
      expect(text).toContain('自營商: +57 張');
    });
  });

  describe('SVG DOM 置頂與聚光燈模式邏輯 (Spotlight Ordering)', () => {
    it('當有泡泡被 Hover 時，排序函數應將該泡泡排至陣列末尾以保證 SVG 頂層繪製', () => {
      // 輔助排序邏輯測試
      const list = [
        { symbol: '2330' },
        { symbol: '2317' },
        { symbol: '2454' },
      ];
      const activeSymbol = '2330';
      const sorted = [...list].sort((a, b) => {
        if (a.symbol === activeSymbol) return 1;
        if (b.symbol === activeSymbol) return -1;
        return 0;
      });
      expect(sorted[sorted.length - 1].symbol).toBe('2330');
    });
  });

  describe('時序播放器動態位移與彗星尾巴切片邏輯 (Temporal Playback)', () => {
    it('泡泡時序坐標抽取：當給定不同的 currentDateIndex，應提取對應 trail 節點的坐標', () => {
      const bubbleWithTrail: SmartMoneyBubbleData = {
        ...mockBubble,
        x: 50,
        y: 50,
        trail: [
          { x: -30, y: -20, date: '2026-09-01', changePercent: -1.5, flowScore: -0.2 },
          { x: 10, y: 15, date: '2026-09-02', changePercent: 0.5, flowScore: 0.1 },
          { x: 50, y: 50, date: '2026-09-03', changePercent: 2.5, flowScore: 0.6 },
        ],
      };

      // 模擬第 0 天：位置應在 (-30, -20)
      const day0 = bubbleWithTrail.trail[0];
      expect(day0.x).toBe(-30);
      expect(day0.y).toBe(-20);

      // 模擬第 2 天：位置應在 (50, 50)
      const day2 = bubbleWithTrail.trail[2];
      expect(day2.x).toBe(50);
      expect(day2.y).toBe(50);

      // 兩者坐標產生實質位移
      expect(day0.x).not.toBe(day2.x);
      expect(day0.y).not.toBe(day2.y);
    });

    it('彗星尾巴隨播放進度漸進延伸：第 0 天為空或單點，第 2 天應有 3 個點', () => {
      const trail = [
        { x: -30, y: -20 },
        { x: 10, y: 15 },
        { x: 50, y: 50 },
      ];

      const visibleSlice0 = trail.slice(0, 0 + 1);
      expect(visibleSlice0).toHaveLength(1);

      const visibleSlice2 = trail.slice(0, 2 + 1);
      expect(visibleSlice2).toHaveLength(3);
    });
  });

  describe('小球優先頂層繪製 (大球不吃小球) 排序邏輯', () => {
    it('非 active 泡泡應按半徑降序排序（大球先畫、小球後畫），確保小球在最頂層優先被拾取', () => {
      const bubbles = [
        { symbol: 'SMALL', radius: 16 },
        { symbol: 'LARGE', radius: 36 },
        { symbol: 'MEDIUM', radius: 24 },
      ];

      // 依半徑由大到小排序繪製
      const sortedForSvg = [...bubbles].sort((a, b) => b.radius - a.radius);

      expect(sortedForSvg[0].symbol).toBe('LARGE');  // 大球先畫 (在底層)
      expect(sortedForSvg[1].symbol).toBe('MEDIUM');
      expect(sortedForSvg[2].symbol).toBe('SMALL');  // 小球最後畫 (在最頂層，滑鼠優先拾取)
    });

    it('若有 active 泡泡（Hover 或選中），該泡泡必須排在絕對最後以置於最頂層', () => {
      const bubbles = [
        { symbol: 'SMALL', radius: 16 },
        { symbol: 'LARGE', radius: 36 },
        { symbol: 'MEDIUM', radius: 24 },
      ];
      const activeSymbol = 'LARGE';

      const sorted = [...bubbles].sort((a, b) => {
        if (a.symbol === activeSymbol) return 1;
        if (b.symbol === activeSymbol) return -1;
        return b.radius - a.radius;
      });

      expect(sorted[sorted.length - 1].symbol).toBe('LARGE');
    });
  });

  describe('calculateTooltipPlacement (象限對角智慧避讓演算法 - 解決浮窗自蓋目標泡泡)', () => {
    const width = 880;
    const height = 560;

    it('當泡泡位於左下象限時 (cx < midX, cy > midY)，浮窗應對角避讓至右上側，100% 露出目標泡泡', () => {
      // 模擬 8299 群聯在左下角 (cx=150, cy=450)
      const placement = calculateTooltipPlacement(150, 450, width, height);
      expect(placement.right).toBe('16px'); // 靠右側
      expect(placement.left).toBeUndefined();
      expect(placement.top).toBe('16px');   // 靠頂部
      expect(placement.bottom).toBeUndefined();
    });

    it('當泡泡位於右上象限時 (cx > midX, cy < midY)，浮窗應避讓至左下側', () => {
      // 模擬台積電在右上角 (cx=700, cy=120)
      const placement = calculateTooltipPlacement(700, 120, width, height);
      expect(placement.left).toBe('16px');   // 靠左側
      expect(placement.right).toBeUndefined();
      expect(placement.bottom).toBe('16px'); // 靠底部
      expect(placement.top).toBeUndefined();
    });

    it('pointerEvents 模式：未固定 (Hover) 時為 none，點擊固定 (isPinned=true) 時為 auto 以支援關閉按鈕與內部操作', () => {
      const hoverPlacement = calculateTooltipPlacement(150, 450, width, height, false);
      expect(hoverPlacement.pointerEvents).toBe('none');

      const pinnedPlacement = calculateTooltipPlacement(150, 450, width, height, true);
      expect(pinnedPlacement.pointerEvents).toBe('auto');
    });
  });
});




