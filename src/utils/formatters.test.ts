import { describe, it, expect } from 'vitest';
import {
  calculateDividendCash,
  formatCurrencyAmount,
  formatTimelineDividend,
  formatTimelineReduction,
  normalizeCurrencyPrecision,
  bankersRound,
} from './formatters';
import { TradeRecord } from '../types/stock';

describe('多幣別與券商慣用精度格式化模組 (Formatters)', () => {
  describe('calculateDividendCash (股息現金計算)', () => {
    it('台股 (TWD) 應遵循台灣集保/券商慣例：無條件捨去至整數 (Math.floor)', () => {
      // 25000 股 * 0.892157 = 22303.925 => 捨去為 22303
      expect(calculateDividendCash(25000, 0.892157, 'TWD')).toBe(22303);
      // 1000 股 * 3.5 = 3500 => 3500
      expect(calculateDividendCash(1000, 3.5, 'TWD')).toBe(3500);
      // 31000 股 * 1.1 = 34100 => 34100
      expect(calculateDividendCash(31000, 1.1, 'TWD')).toBe(34100);
    });

    it('美股 (USD) 應遵循美股券商標準：四捨五入至分 (Cents, 小數點後 2 位)，杜絕浮點數溢位', () => {
      // 10 股 * 0.478 = 4.78 (JS 原始浮點乘法為 4.779999999999999)
      expect(calculateDividendCash(10, 0.478, 'USD')).toBe(4.78);
      // 10 股 * 1.115 = 11.15
      expect(calculateDividendCash(10, 1.115, 'USD')).toBe(11.15);
      // 33.33 股 * 0.555 = 18.49815 => 18.50
      expect(calculateDividendCash(33.33, 0.555, 'USD')).toBe(18.5);
    });
  });

  describe('normalizeCurrencyPrecision (數值精度收斂)', () => {
    it('TWD 應為整數 (Math.floor)', () => {
      expect(normalizeCurrencyPrecision(22303.925, 'TWD')).toBe(22303);
      expect(normalizeCurrencyPrecision(22303, 'TWD')).toBe(22303);
    });

    it('USD 應保留 2 位小數，消除浮點數毛邊', () => {
      expect(normalizeCurrencyPrecision(4.779999999999999, 'USD')).toBe(4.78);
      expect(normalizeCurrencyPrecision(11.15, 'USD')).toBe(11.15);
    });
  });

  describe('formatCurrencyAmount (幣別金額字串格式化)', () => {
    it('TWD 應正確顯示千分位與整數，不出現小數', () => {
      expect(formatCurrencyAmount(22303.925, 'TWD')).toBe('NT$ 22,303');
      expect(formatCurrencyAmount(34100, 'TWD')).toBe('NT$ 34,100');
    });

    it('USD 應正確顯示 $ 符號與 2 位小數', () => {
      expect(formatCurrencyAmount(4.78, 'USD')).toBe('$4.78 USD');
      expect(formatCurrencyAmount(4.779999999999999, 'USD')).toBe('$4.78 USD');
      expect(formatCurrencyAmount(1234.5, 'USD')).toBe('$1,234.50 USD');
    });
  });

  describe('formatTimelineDividend (時間軸股息顯示字串)', () => {
    it('台股應輸出例如 配發股息 NT$ 22,303 (而非 22303.925 元)', () => {
      const trade: TradeRecord = {
        id: 't-1',
        symbol: '2890',
        name: '永豐金',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        shares: 25000,
        price: 0.892157,
        cashAmount: 22303.925,
        fee: 0,
        tax: 0,
        date: '2025-08-21',
        createdAt: 1,
      };
      expect(formatTimelineDividend(trade)).toBe('配發股息 NT$ 22,303');
    });

    it('美股應輸出例如 配發股息 $4.78 USD (而非 4.779999999999999 元)', () => {
      const trade: TradeRecord = {
        id: 't-2',
        symbol: 'VT',
        name: 'Vanguard全世界股票ETF',
        market: 'US',
        currency: 'USD',
        type: 'DIVIDEND',
        shares: 10,
        price: 0.478,
        cashAmount: 4.779999999999999,
        fee: 0,
        tax: 0,
        date: '2025-09-19',
        createdAt: 2,
      };
      expect(formatTimelineDividend(trade)).toBe('配發股息 $4.78 USD');
    });

    it('當 cashAmount 為 0 或未提供時，自動使用 shares * price 計算並格式化', () => {
      const trade: TradeRecord = {
        id: 't-3',
        symbol: 'VT',
        name: 'Vanguard全世界股票ETF',
        market: 'US',
        currency: 'USD',
        type: 'DIVIDEND',
        shares: 10,
        price: 1.115,
        fee: 0,
        tax: 0,
        date: '2025-12-19',
        createdAt: 3,
      };
      expect(formatTimelineDividend(trade)).toBe('配發股息 $11.15 USD');
    });
  });

  describe('formatTimelineReduction (減資退款顯示字串)', () => {
    it('台股減資退款金額應為整數與 NT$ 格式', () => {
      const trade: TradeRecord = {
        id: 't-4',
        symbol: '2327',
        name: '國巨',
        market: 'TW',
        currency: 'TWD',
        type: 'CAPITAL_REDUCTION',
        shares: 200,
        price: 10,
        cashAmount: 2000,
        fee: 0,
        tax: 0,
        date: '2024-08-01',
        createdAt: 4,
      };
      expect(formatTimelineReduction(trade)).toBe('減 200 股 (退還 NT$ 2,000)');
    });
  });

  describe("bankersRound (銀行家捨入法 / Round Half to Even)", () => {
    it('處於中間點 .5 時應向最近偶數捨入 (奇進偶捨)', () => {
      // 3.345 (前一位為偶數 4) => 捨去為 3.34 (嘉信 2025-12 股息稅實例)
      expect(bankersRound(3.345, 2)).toBe(3.34);
      // 3.335 (前一位為奇數 3) => 進位為 3.34
      expect(bankersRound(3.335, 2)).toBe(3.34);
      // 0.045 (前一位為偶數 4) => 捨去為 0.04 (嘉信 2025-12 利息稅實例)
      expect(bankersRound(0.045, 2)).toBe(0.04);
      // 0.035 (前一位為奇數 3) => 進位為 0.04
      expect(bankersRound(0.035, 2)).toBe(0.04);
      // 1.434 (小於 5) => 1.43
      expect(bankersRound(1.434, 2)).toBe(1.43);
      // 13.527 (大於 5) => 13.53
      expect(bankersRound(13.527, 2)).toBe(13.53);
    });

    it('台美市場精度嚴格隔離：台股整數無條件捨去，美股奇進偶捨保留 2 位小數', () => {
      const twValue = 100.99;
      const usValue = 100.995;

      // 台股一律整數 floor
      expect(normalizeCurrencyPrecision(twValue, 'TWD')).toBe(100);
      expect(calculateDividendCash(10, 10.99, 'TWD')).toBe(109);

      // 美股奇進偶捨
      expect(normalizeCurrencyPrecision(usValue, 'USD')).toBe(101.00);
      expect(calculateDividendCash(10, 0.478, 'USD')).toBe(4.78);
    });
  });
});
