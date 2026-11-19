import { describe, it, expect } from 'vitest';
import {
  cleanSymbolInput,
  inferMarketType,
  resolveSymbolAndMarket,
  buildDataProvenanceText,
} from './HeaderQueryBar';

describe('HeaderQueryBar - 標的檢索與資料來源格式化 (Ticket 03)', () => {
  describe('cleanSymbolInput - 代號清理與正規化', () => {
    it('應自動去除首尾空格並轉為大寫，並移除 .TW / .TWO / .US 後綴', () => {
      expect(cleanSymbolInput('  2360  ')).toBe('2360');
      expect(cleanSymbolInput(' aapl ')).toBe('AAPL');
      expect(cleanSymbolInput('2330.tw')).toBe('2330');
      expect(cleanSymbolInput('aapl.us')).toBe('AAPL');
      expect(cleanSymbolInput('NVDA.US')).toBe('NVDA');
    });

    it('空字串應安全回傳空字串', () => {
      expect(cleanSymbolInput('')).toBe('');
      expect(cleanSymbolInput('   ')).toBe('');
    });
  });

  describe('resolveSymbolAndMarket - 中文名稱與代號雙向解析 (T11)', () => {
    it('輸入中文名稱時應反查字典解析出正確代號與市場，避免直接掉入 US', () => {
      expect(resolveSymbolAndMarket('台積電')).toEqual({ symbol: '2330', market: 'TW' });
      expect(resolveSymbolAndMarket('輝達')).toEqual({ symbol: 'NVDA', market: 'US' });
    });

    it('輸入未知中文時應預設回退為 TW 而非 US', () => {
      expect(inferMarketType('未知測試標的')).toBe('TW');
    });
  });

  describe('inferMarketType - 市場自動推斷', () => {
    it('純數字代號應推斷為台股 TW', () => {
      expect(inferMarketType('2360')).toBe('TW');
      expect(inferMarketType('0050')).toBe('TW');
      expect(inferMarketType('2330.TW')).toBe('TW');
    });

    it('英文字母代號應推斷為美股 US', () => {
      expect(inferMarketType('AAPL')).toBe('US');
      expect(inferMarketType('NVDA')).toBe('US');
      expect(inferMarketType('TSLA')).toBe('US');
      expect(inferMarketType('SPY')).toBe('US');
      expect(inferMarketType('BRK-B')).toBe('US');
    });

    it('帶英文字尾之合法台股代號 (主動式 ETF / 債券 ETF / 特別股 / 槓反) 應推斷為台股 TW (Spec 0168)', () => {
      expect(inferMarketType('00411A')).toBe('TW');
      expect(inferMarketType('00403A')).toBe('TW');
      expect(inferMarketType('00679B')).toBe('TW');
      expect(inferMarketType('00632R')).toBe('TW');
      expect(inferMarketType('2881A')).toBe('TW');
      expect(inferMarketType('00411a')).toBe('TW');
      expect(inferMarketType('00411A.TW')).toBe('TW');
      expect(inferMarketType('00411A.TWO')).toBe('TW');
    });
  });

  describe('buildDataProvenanceText - 資料來源與統計區間合成', () => {
    it('應正確組合來源、起始結束日期、交易日天數與法人天數', () => {
      const text = buildDataProvenanceText({
        sources: ['日 K TWSE', '法人 TWSE', '融資券 FinMind'],
        startDate: '2026-05-04',
        endDate: '2026-09-18',
        totalTradingDays: 98,
        institutionalDays: 20,
      });

      expect(text.sourcesText).toBe('資料來源：日 K TWSE | 法人 TWSE | 融資券 FinMind');
      expect(text.rangeText).toBe('區間 2026-05-04 ~ 2026-09-18，共 98 個交易日，法人資料 20 日');
    });
  });
});
