import { describe, it, expect } from 'vitest';
import { TreemapNode } from '../utils/treemap';
import {
  getTreemapNodeColor,
  getTreemapNodeBorderColor,
  formatDebtNodePnlText,
} from './TreemapChart';

describe('TreemapChart 視覺語意與借款節點樣式規範測試 (PRD #0072)', () => {
  const stockProfitNode: TreemapNode = {
    id: 'TW_2330',
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    value: 100000,
    pnlPercent: 15,
    weight: 50,
    x: 0,
    y: 0,
    width: 500,
    height: 500,
  };

  const cashNode: TreemapNode = {
    id: 'CASH_TWD',
    symbol: '💵 現金',
    name: 'Cash / 活存與備用金',
    market: 'CASH',
    value: 50000,
    pnlPercent: 0,
    weight: 25,
    x: 500,
    y: 0,
    width: 250,
    height: 500,
  };

  const debtNode: TreemapNode = {
    id: 'DEBT_TWD',
    symbol: '🏦 借貸負債',
    name: '質押/借貸負債總額',
    market: 'DEBT',
    value: 50000,
    pnlPercent: 0,
    weight: 25,
    x: 750,
    y: 0,
    width: 250,
    height: 500,
  };

  describe('節點底色映射 (getTreemapNodeColor)', () => {
    it('借款節點無論在台灣模式或美股模式下，一律呈現專屬琥珀警示色 hsla(38, 92%, 50%, 0.85)', () => {
      const taiwanColor = getTreemapNodeColor(debtNode, 'taiwan');
      const usColor = getTreemapNodeColor(debtNode, 'international');
      expect(taiwanColor).toBe('hsla(38, 92%, 50%, 0.85)');
      expect(usColor).toBe('hsla(38, 92%, 50%, 0.85)');
    });

    it('現金節點呈現中性深灰藍石板色 hsla(215, 25%, 27%, 0.85)', () => {
      expect(getTreemapNodeColor(cashNode, 'taiwan')).toBe('hsla(215, 25%, 27%, 0.85)');
    });

    it('股票節點隨主題與損益呈現紅/綠調', () => {
      expect(getTreemapNodeColor(stockProfitNode, 'taiwan')).toContain('0, 72%, 48%'); // 台股紅漲
      expect(getTreemapNodeColor(stockProfitNode, 'international')).toContain('158, 64%, 42%'); // 美股綠漲
    });
  });

  describe('節點邊框顏色 (getTreemapNodeBorderColor)', () => {
    it('借款節點邊框應為深琥珀金 #d97706', () => {
      expect(getTreemapNodeBorderColor(debtNode, 'taiwan')).toBe('#d97706');
      expect(getTreemapNodeBorderColor(debtNode, 'international')).toBe('#d97706');
    });

    it('現金節點邊框應為板岩灰 #64748b', () => {
      expect(getTreemapNodeBorderColor(cashNode, 'taiwan')).toBe('#64748b');
    });
  });

  describe('借款節點損益/成本文字格式化 (formatDebtNodePnlText)', () => {
    it('提供平均年利率時應格式化為負成本提示 (例如 -2.35% 年息)', () => {
      const text = formatDebtNodePnlText(debtNode, 2.35);
      expect(text).toBe('-2.35% 年息');
    });

    it('未提供年利率或年利率為 0 時應標示為 "負債項"', () => {
      const text = formatDebtNodePnlText(debtNode);
      expect(text).toBe('負債項');
    });
  });
});
