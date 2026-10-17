import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mergeHoldingsDividends,
  loadStoredCustomCatalysts,
  saveCustomCatalyst,
  deleteCustomCatalyst,
  resetCatalystsToDefault,
  getAggregatedCatalysts,
  STORAGE_KEY_CATALYSTS,
} from './catalystStorage';
import { ReceivableDividend } from '../types/dividend';

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
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

describe('催化劑日曆儲存與聚合中樞 (catalystStorage)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  describe('1. 在庫持股除息日匯流 (mergeHoldingsDividends)', () => {
    it('應能將未來 30 天內之在庫持股除息日轉換為 EARNINGS_DIVIDEND 事件並去重排序', () => {
      const mockDividends: ReceivableDividend[] = [
        {
          id: 'div-2330-2026',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-10-25',
          payDate: '2026-11-15',
          cashDividendPerShare: 7.0,
          sharesHeldOnExDate: 1000,
          estimatedGrossDividend: 7000,
          estimatedTaxOrFee: 148,
          estimatedNetDividend: 6852,
          estimatedNetDividendInTWD: 6852,
          status: 'UPCOMING_EX',
        },
        {
          // 已過期的除息事件
          id: 'div-past',
          symbol: '2886',
          name: '兆豐金',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-08-15',
          payDate: '2026-09-04',
          cashDividendPerShare: 1.75,
          sharesHeldOnExDate: 2000,
          estimatedGrossDividend: 3500,
          estimatedTaxOrFee: 74,
          estimatedNetDividend: 3426,
          estimatedNetDividendInTWD: 3426,
          status: 'RECEIVED',
        },
      ];

      const merged = mergeHoldingsDividends([], mockDividends, '2026-10-17');
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe('div-2330-2026-10-25');
      expect(merged[0].name).toBe('台積電 (2330) 除息');
      expect(merged[0].category).toBe('EARNINGS_DIVIDEND');
      expect(merged[0].date).toBe('2026-10-25');
      expect(merged[0].symbol).toBe('2330');
      expect(merged[0].impact).toBe('MEDIUM');
      expect(merged[0].description).toContain('7');
    });
  });

  describe('2. 本地自訂事件 CRUD (Custom Catalysts Management)', () => {
    it('儲存自訂事件後應能正確持久化並載入', () => {
      expect(loadStoredCustomCatalysts()).toHaveLength(0);

      saveCustomCatalyst({
        name: '個人房屋增貸交割日',
        date: '2026-11-01',
        category: 'CUSTOM',
        impact: 'HIGH',
        targetMarket: 'TW',
        description: '資金入帳調度確認',
      });

      const loaded = loadStoredCustomCatalysts();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('個人房屋增貸交割日');
      expect(loaded[0].isCustom).toBe(true);
      expect(loaded[0].impact).toBe('HIGH');
    });

    it('應能正確依據 ID 刪除自訂事件', () => {
      const saved = saveCustomCatalyst({
        name: '待刪除事件',
        date: '2026-10-20',
        category: 'CUSTOM',
        impact: 'LOW',
        description: '測試刪除',
      });

      expect(loadStoredCustomCatalysts()).toHaveLength(1);
      deleteCustomCatalyst(saved.id);
      expect(loadStoredCustomCatalysts()).toHaveLength(0);
    });

    it('一鍵重置應清除本地快取', () => {
      saveCustomCatalyst({
        name: '測試事件',
        date: '2026-10-20',
        category: 'CUSTOM',
        description: '測試',
      });
      resetCatalystsToDefault();
      expect(localStorage.getItem(STORAGE_KEY_CATALYSTS)).toBeNull();
      expect(loadStoredCustomCatalysts()).toHaveLength(0);
    });
  });

  describe('3. 多源資料聚合管線 (getAggregatedCatalysts)', () => {
    it('應將自訂事件、持股除息與滾動前瞻種子庫融合並計算倒數天數', () => {
      // 1. 新增一筆自訂事件
      saveCustomCatalyst({
        name: '重大投資決策日',
        date: '2026-10-18',
        category: 'CUSTOM',
        impact: 'HIGH',
        description: '檢視持倉平衡',
      });

      // 2. 模擬一筆除息
      const mockDividends: ReceivableDividend[] = [
        {
          id: 'div-00878',
          symbol: '00878',
          name: '國泰永續高股息',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-10-22',
          payDate: '2026-11-15',
          cashDividendPerShare: 0.55,
          sharesHeldOnExDate: 5000,
          estimatedGrossDividend: 2750,
          estimatedTaxOrFee: 58,
          estimatedNetDividend: 2692,
          estimatedNetDividendInTWD: 2692,
          status: 'UPCOMING_EX',
        },
      ];

      const aggregated = getAggregatedCatalysts({
        asOfDate: '2026-10-17',
        receivableDividends: mockDividends,
      });

      expect(aggregated.length).toBeGreaterThanOrEqual(4);

      // 第一筆應為明日的自訂事件 (倒數 1 天)
      expect(aggregated[0].name).toBe('重大投資決策日');
      expect(aggregated[0].daysLeft).toBe(1);
      expect(aggregated[0].isCustom).toBe(true);

      // 應包含持股除息 (倒數 5 天)
      const divItem = aggregated.find((c) => c.category === 'EARNINGS_DIVIDEND');
      expect(divItem).toBeDefined();
      expect(divItem?.symbol).toBe('00878');
      expect(divItem?.daysLeft).toBe(5);

      // 應包含常態週期事件 (如 10/21 台指結算，倒數 4 天)
      const txItem = aggregated.find((c) => c.id.startsWith('periodic-tx-settle'));
      expect(txItem).toBeDefined();
      expect(txItem?.daysLeft).toBe(4);
    });
  });
});
