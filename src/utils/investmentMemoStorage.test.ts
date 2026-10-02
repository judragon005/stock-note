import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveInvestmentMemo,
  getInvestmentMemo,
  deleteInvestmentMemo,
  getAllInvestmentMemos,
  isSymbolInHoldings,
  syncMemoToHoldingsRiskLine,
} from './investmentMemoStorage';
import { InvestmentMemoRecord } from '../types/equityDeepDive';
import { HoldingPosition } from '../types/stock';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

describe('investmentMemoStorage - 投資筆記持久化與持倉風控線雙向回填 (Ticket 16, 17)', () => {
  let storageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    storageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', storageMock);
  });

  const mockMemo: InvestmentMemoRecord = {
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    buyReason: '先進製程與 AI 晶片壟斷優勢',
    targetPrice: 1200,
    stopLossPrice: 900,
    holdingPeriodDays: 90,
    trackingMetrics: ['月營收年增率', '毛利率 > 53%', '外資連續買超'],
    isWatchlist: false,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  it('Ticket 16: 能成功保存並讀取投資筆記 (CRUD)', () => {
    expect(getInvestmentMemo('2330')).toBeNull();

    saveInvestmentMemo(mockMemo);
    const retrieved = getInvestmentMemo('2330');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.targetPrice).toBe(1200);
    expect(retrieved?.stopLossPrice).toBe(900);

    const all = getAllInvestmentMemos();
    expect(all).toHaveLength(1);
    expect(all[0].symbol).toBe('2330');

    deleteInvestmentMemo('2330');
    expect(getInvestmentMemo('2330')).toBeNull();
    expect(getAllInvestmentMemos()).toHaveLength(0);
  });

  it('Ticket 17: 判斷標的是否在庫與自動標記觀察清單', () => {
    const mockHoldings: HoldingPosition[] = [
      {
        symbol: '2330',
        name: '台積電',
        shares: 1000,
        averagePrice: 850,
        currentPrice: 980,
        market: 'TW',
        unrealizedProfit: 130000,
        unrealizedProfitPercent: 15.29,
        targetPrice: 1050,
        stopLossPrice: 800,
      } as any,
    ];

    expect(isSymbolInHoldings('2330', mockHoldings)).toBe(true);
    expect(isSymbolInHoldings('NVDA', mockHoldings)).toBe(false);
  });

  it('Ticket 17: 在庫持倉可安全雙向同步回填目標價與停損價', () => {
    const mockHoldings: HoldingPosition[] = [
      {
        symbol: '2330',
        name: '台積電',
        shares: 1000,
        averagePrice: 850,
        currentPrice: 980,
        market: 'TW',
        targetPrice: 1050,
        stopLossPrice: 800,
      } as any,
    ];

    const result = syncMemoToHoldingsRiskLine('2330', mockMemo, mockHoldings);
    expect(result.success).toBe(true);
    expect((result.updatedHoldings[0] as any).targetPrice).toBe(1200);
    expect((result.updatedHoldings[0] as any).stopLossPrice).toBe(900);
  });

  it('Ticket 17: 遇非有限數或負數時，防禦性拒絕同步回填', () => {
    const mockHoldings: HoldingPosition[] = [
      { symbol: '2330', targetPrice: 1000, stopLossPrice: 800 } as any,
    ];
    const invalidMemo = { ...mockMemo, targetPrice: -100, stopLossPrice: NaN };

    const result = syncMemoToHoldingsRiskLine('2330', invalidMemo, mockHoldings);
    expect(result.success).toBe(false);
    expect((result.updatedHoldings[0] as any).targetPrice).toBe(1000); // 保持原樣
  });
});
