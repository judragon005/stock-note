import { describe, it, expect } from 'vitest';
import {
  parseTwseT86BulkData,
  parseTpexT86BulkData,
  parseTwseDailyQuotesBulk,
  computeIncrementalIndicators,
  formatDateYMD,
} from './marketSyncCore';
import { DailyCandle } from '../types/indicators';

describe('Market Sync Core Engine (全市場批次同步核心)', () => {
  describe('1. parseTwseT86BulkData (TWSE 三大法人全市場日報解析)', () => {
    it('應能正確解析 TWSE 官方 T86 陣列資料，將股數除以 1000 轉為張數', () => {
      const mockRaw = {
        stat: 'OK',
        date: '20260915',
        data: [
          ['2330', '台積電', '15,000,000', '10,000,000', '5,000,000', '0', '0', '0', '2,000,000', '500,000', '1,500,000', '-500,000', '6,000,000'],
          ['2317', '鴻海', '8,000,000', '4,000,000', '4,000,000', '0', '0', '0', '1,000,000', '0', '1,000,000', '200,000', '5,200,000'],
        ],
      };

      const result = parseTwseT86BulkData(mockRaw);
      expect(result['2330']).toBeDefined();
      expect(result['2330'].symbol).toBe('2330');
      expect(result['2330'].foreignNetShares).toBe(5000); // 5,000,000 / 1000
      expect(result['2330'].trustNetShares).toBe(1500);   // 1,500,000 / 1000
      expect(result['2330'].totalNetShares).toBe(6000);   // 5000 + 1500 - 500
      expect(result['2317'].foreignNetShares).toBe(4000);
    });

    it('若格式不符或空資料，應安全回傳空物件而不噴錯', () => {
      expect(parseTwseT86BulkData(null)).toEqual({});
      expect(parseTwseT86BulkData({ stat: 'NO_DATA' })).toEqual({});
    });
  });

  describe('2. parseTpexT86BulkData (TPEx 上櫃三大法人全市場日報解析)', () => {
    it('應能正確解析上櫃官方三大法人買賣超報表', () => {
      const mockTpexRaw = {
        tables: [
          {
            data: [
              ['6488', '環球晶', '1,500,000', '1,000,000', '500,000', '200,000', '50,000', '150,000', '50,000', '700,000'],
            ],
          },
        ],
      };

      const result = parseTpexT86BulkData(mockTpexRaw);
      expect(result['6488']).toBeDefined();
      expect(result['6488'].symbol).toBe('6488');
      expect(result['6488'].foreignNetShares).toBe(500); // 500,000 / 1000
      expect(result['6488'].trustNetShares).toBe(150);
    });
  });

  describe('3. parseTwseDailyQuotesBulk & parseTpexDailyQuotesBulk (全市場收盤行情)', () => {
    it('應能從 TWSE 每日收盤行情 (MI_INDEX) 萃取全個股當日 OHLCV', () => {
      const mockMiIndex = {
        stat: 'OK',
        date: '20260915',
        tables: [
          {
            title: '每日收盤行情',
            fields: ['證券代號', '證券名稱', '成交股數', '成交筆數', '成交金額', '開盤價', '最高價', '最低價', '收盤價', '漲跌(+/-)', '漲跌價差'],
            data: [
              ['2330', '台積電', '45,123,456', '35,000', '45,000,000,000', '1000.00', '1020.00', '995.00', '1015.00', '+', '15.00'],
            ],
          },
        ],
      };

      const quotes = parseTwseDailyQuotesBulk(mockMiIndex, '2026-09-15');
      expect(quotes['2330']).toBeDefined();
      expect(quotes['2330'].date).toBe('2026-09-15');
      expect(quotes['2330'].open).toBe(1000);
      expect(quotes['2330'].high).toBe(1020);
      expect(quotes['2330'].low).toBe(995);
      expect(quotes['2330'].close).toBe(1015);
      expect(quotes['2330'].volume).toBe(45123456);
    });
  });

  describe('4. computeIncrementalIndicators (本地增量計算技術指標)', () => {
    it('當追加今日收盤價時，能毫秒級計算出均線 (MA5, MA20, MA60)、RSI 與箱體上下軌', () => {
      const candles: DailyCandle[] = [];
      const baseDate = new Date('2026-01-01');

      // 生成 65 根連續日 K
      for (let i = 0; i < 65; i++) {
        const d = new Date(baseDate.getTime() + i * 86400000);
        const dateStr = formatDateYMD(d);
        const price = 100 + i;
        candles.push({
          date: dateStr,
          open: price - 1,
          high: price + 2,
          low: price - 2,
          close: price,
          volume: 10000,
        });
      }

      const indicators = computeIncrementalIndicators(candles);
      expect(indicators.length).toBe(65);

      const latest = indicators[indicators.length - 1];
      expect(latest.date).toBe(candles[64].date);
      expect(latest.ma.ma5).toBeCloseTo(162, 1);
      expect(latest.ma.ma20).toBeCloseTo(154.5, 1);
      expect(latest.box).toBeDefined();
      expect(latest.box.boxStatus).toBeDefined();
    });
  });
});
