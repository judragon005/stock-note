import { describe, it, expect } from 'vitest';
import { computeTreemapLayout, TreemapItem } from './treemap';

describe('Squarified Treemap 佈局演算法', () => {
  it('處理空陣列或總市值為 0 的情況', () => {
    const resultEmpty = computeTreemapLayout([], 1000, 600);
    expect(resultEmpty).toEqual([]);

    const zeroItems: TreemapItem[] = [
      { id: '1', symbol: '2330', name: '台積電', market: 'TW', value: 0, pnlPercent: 5 },
    ];
    const resultZero = computeTreemapLayout(zeroItems, 1000, 600);
    expect(resultZero).toEqual([]);
  });

  it('單一持股應填滿整個畫布尺寸', () => {
    const items: TreemapItem[] = [
      { id: '1', symbol: '2330', name: '台積電', market: 'TW', value: 100000, pnlPercent: 12.5 },
    ];
    const nodes = computeTreemapLayout(items, 1000, 600);
    expect(nodes.length).toBe(1);
    expect(nodes[0].symbol).toBe('2330');
    expect(nodes[0].x).toBe(0);
    expect(nodes[0].y).toBe(0);
    expect(nodes[0].width).toBe(1000);
    expect(nodes[0].height).toBe(600);
    expect(nodes[0].weight).toBe(100);
    expect(nodes[0].pnlPercent).toBe(12.5);
  });

  it('多檔持股應按市值比例切割，且所有節點不超出畫布邊界', () => {
    const items: TreemapItem[] = [
      { id: '1', symbol: '2330', name: '台積電', market: 'TW', value: 50000, pnlPercent: 10 },
      { id: '2', symbol: 'NVDA', name: '輝達', market: 'US', value: 30000, pnlPercent: 25 },
      { id: '3', symbol: 'AAPL', name: '蘋果', market: 'US', value: 20000, pnlPercent: -5 },
    ];

    const width = 1000;
    const height = 600;
    const nodes = computeTreemapLayout(items, width, height);

    expect(nodes.length).toBe(3);

    // 檢查各標的權重佔比
    const tsMC = nodes.find((n) => n.symbol === '2330')!;
    const nvda = nodes.find((n) => n.symbol === 'NVDA')!;
    const aapl = nodes.find((n) => n.symbol === 'AAPL')!;

    expect(tsMC.weight).toBe(50);
    expect(nvda.weight).toBe(30);
    expect(aapl.weight).toBe(20);

    // 檢查所有區塊面積總和等於畫布總面積
    const totalArea = nodes.reduce((sum, n) => sum + (n.width * n.height), 0);
    expect(totalArea).toBeCloseTo(width * height, 1);

    // 檢查每一個節點皆在邊界範圍內 [0, 0, 1000, 600]
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(width + 0.01);
      expect(node.y + node.height).toBeLessThanOrEqual(height + 0.01);
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }
  });

  it('多達 8 檔持股時亦能穩定生成且無 NaN 或 Infinity', () => {
    const items: TreemapItem[] = [
      { id: '1', symbol: '2330', name: '台積電', market: 'TW', value: 400000, pnlPercent: 15 },
      { id: '2', symbol: 'NVDA', name: '輝達', market: 'US', value: 300000, pnlPercent: 30 },
      { id: '3', symbol: '0050', name: '元大台灣50', market: 'TW', value: 150000, pnlPercent: 8 },
      { id: '4', symbol: 'AAPL', name: '蘋果', market: 'US', value: 100000, pnlPercent: 5 },
      { id: '5', symbol: 'MSFT', name: '微軟', market: 'US', value: 80000, pnlPercent: -2 },
      { id: '6', symbol: '2454', name: '聯發科', market: 'TW', value: 50000, pnlPercent: 12 },
      { id: '7', symbol: '00878', name: '國泰永續高股息', market: 'TW', value: 40000, pnlPercent: 3 },
      { id: '8', symbol: 'TSLA', name: '特斯拉', market: 'US', value: 20000, pnlPercent: -15 },
    ];

    const nodes = computeTreemapLayout(items, 800, 500);
    expect(nodes.length).toBe(8);
    nodes.forEach((node) => {
      expect(Number.isNaN(node.x)).toBe(false);
      expect(Number.isNaN(node.y)).toBe(false);
      expect(Number.isNaN(node.width)).toBe(false);
      expect(Number.isNaN(node.height)).toBe(false);
    });
  });

  it('股票 + 現金部位混合輸入，現金節點應正確分配權重與空間', () => {
    const items: TreemapItem[] = [
      { id: 'TW_2330', symbol: '2330', name: '台積電', market: 'TW', value: 50000, pnlPercent: 15 },
      { id: 'US_AAPL', symbol: 'AAPL', name: '蘋果', market: 'US', value: 30000, pnlPercent: -5 },
      { id: 'CASH_TWD', symbol: '💵 現金', name: 'Cash / 活存與備用金', market: 'CASH', value: 20000, pnlPercent: 0 },
    ];

    const width = 1000;
    const height = 500;
    const nodes = computeTreemapLayout(items, width, height);

    expect(nodes.length).toBe(3);

    const cashNode = nodes.find((n) => n.id === 'CASH_TWD')!;
    const tsMCNode = nodes.find((n) => n.id === 'TW_2330')!;
    const aaplNode = nodes.find((n) => n.id === 'US_AAPL')!;

    expect(cashNode).toBeDefined();
    expect(cashNode.market).toBe('CASH');
    expect(cashNode.weight).toBe(20);
    expect(tsMCNode.weight).toBe(50);
    expect(aaplNode.weight).toBe(30);
    expect(cashNode.pnlPercent).toBe(0);

    // 檢查面積總和
    const totalArea = nodes.reduce((sum, n) => sum + n.width * n.height, 0);
    expect(totalArea).toBeCloseTo(width * height, 1);
  });

  it('純現金輸入 (零持股)，應產生單一佔滿 100% 畫布的現金節點', () => {
    const items: TreemapItem[] = [
      { id: 'CASH_TWD', symbol: '💵 現金', name: 'Cash / 活存與備用金', market: 'CASH', value: 100000, pnlPercent: 0 },
    ];

    const width = 1000;
    const height = 500;
    const nodes = computeTreemapLayout(items, width, height);

    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe('CASH_TWD');
    expect(nodes[0].symbol).toBe('💵 現金');
    expect(nodes[0].width).toBe(width);
    expect(nodes[0].height).toBe(height);
    expect(nodes[0].weight).toBe(100);
  });

  it('現金為 0 或負數時應被過濾，不產生無效節點', () => {
    const items: TreemapItem[] = [
      { id: 'TW_2330', symbol: '2330', name: '台積電', market: 'TW', value: 50000, pnlPercent: 10 },
      { id: 'CASH_TWD', symbol: '💵 現金', name: 'Cash', market: 'CASH', value: 0, pnlPercent: 0 },
      { id: 'CASH_NEG', symbol: '💵 負現金', name: 'Cash Neg', market: 'CASH', value: -5000, pnlPercent: 0 },
    ];

    const nodes = computeTreemapLayout(items, 1000, 500);
    expect(nodes.length).toBe(1);
    expect(nodes[0].symbol).toBe('2330');
    expect(nodes[0].weight).toBe(100);
  });

  it('股票 + 現金 + 借款負債混合輸入，借款節點應正確分配權重與空間', () => {
    const items: TreemapItem[] = [
      { id: 'TW_2330', symbol: '2330', name: '台積電', market: 'TW', value: 50000, pnlPercent: 15 },
      { id: 'US_AAPL', symbol: 'AAPL', name: '蘋果', market: 'US', value: 30000, pnlPercent: -5 },
      { id: 'CASH_TWD', symbol: '💵 現金', name: 'Cash / 活存與備用金', market: 'CASH', value: 20000, pnlPercent: 0 },
      { id: 'DEBT_TWD', symbol: '🏦 借貸負債', name: '質押/借貸負債總額', market: 'DEBT', value: 25000, pnlPercent: 0 },
    ];

    const width = 1000;
    const height = 500;
    const nodes = computeTreemapLayout(items, width, height);

    expect(nodes.length).toBe(4);

    const debtNode = nodes.find((n) => n.id === 'DEBT_TWD')!;
    const cashNode = nodes.find((n) => n.id === 'CASH_TWD')!;
    const tsMCNode = nodes.find((n) => n.id === 'TW_2330')!;
    const aaplNode = nodes.find((n) => n.id === 'US_AAPL')!;

    expect(debtNode).toBeDefined();
    expect(debtNode.market).toBe('DEBT');
    expect(debtNode.weight).toBe(20); // 25000 / (50000+30000+20000+25000 = 125000) = 20%
    expect(tsMCNode.weight).toBe(40); // 50000 / 125000 = 40%
    expect(aaplNode.weight).toBe(24); // 30000 / 125000 = 24%
    expect(cashNode.weight).toBe(16); // 20000 / 125000 = 16%

    // 檢查面積總和
    const totalArea = nodes.reduce((sum, n) => sum + n.width * n.height, 0);
    expect(totalArea).toBeCloseTo(width * height, 1);
  });

  it('借款為 0 或負數時應被過濾，不產生無效負債節點', () => {
    const items: TreemapItem[] = [
      { id: 'TW_2330', symbol: '2330', name: '台積電', market: 'TW', value: 50000, pnlPercent: 10 },
      { id: 'DEBT_ZERO', symbol: '🏦 零負債', name: 'Zero Debt', market: 'DEBT', value: 0, pnlPercent: 0 },
      { id: 'DEBT_NEG', symbol: '🏦 負負債', name: 'Neg Debt', market: 'DEBT', value: -10000, pnlPercent: 0 },
    ];

    const nodes = computeTreemapLayout(items, 1000, 500);
    expect(nodes.length).toBe(1);
    expect(nodes[0].symbol).toBe('2330');
    expect(nodes[0].weight).toBe(100);
  });
});
