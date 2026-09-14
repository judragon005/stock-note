import { describe, it, expect } from 'vitest';
import { isEtfSymbol } from './StockHealthWorkspace';

describe('StockHealthWorkspace Unit Tests', () => {
  describe('isEtfSymbol (ETF 智慧識別器)', () => {
    it('應正確辨識台股標準與特殊編號 ETF', () => {
      expect(isEtfSymbol('0050')).toBe(true);
      expect(isEtfSymbol('0056')).toBe(true);
      expect(isEtfSymbol('00403A')).toBe(true);
      expect(isEtfSymbol('00878')).toBe(true);
      expect(isEtfSymbol('00919')).toBe(true);
      expect(isEtfSymbol('00929')).toBe(true);
      expect(isEtfSymbol('006208')).toBe(true);
    });

    it('不應將台股普通股誤判為 ETF', () => {
      expect(isEtfSymbol('2330')).toBe(false);
      expect(isEtfSymbol('2454')).toBe(false);
      expect(isEtfSymbol('2317')).toBe(false);
      expect(isEtfSymbol('1101')).toBe(false);
      expect(isEtfSymbol('2881')).toBe(false);
    });

    it('應正確辨識美股知名大盤與主題型 ETF', () => {
      expect(isEtfSymbol('SPY')).toBe(true);
      expect(isEtfSymbol('QQQ')).toBe(true);
      expect(isEtfSymbol('VOO')).toBe(true);
      expect(isEtfSymbol('VTI')).toBe(true);
      expect(isEtfSymbol('SOXX')).toBe(true);
      expect(isEtfSymbol('SMH')).toBe(true);
      expect(isEtfSymbol('SCHD')).toBe(true);
    });

    it('不應將美股普通個股誤判為 ETF', () => {
      expect(isEtfSymbol('NVDA')).toBe(false);
      expect(isEtfSymbol('AAPL')).toBe(false);
      expect(isEtfSymbol('TSLA')).toBe(false);
      expect(isEtfSymbol('MSFT')).toBe(false);
      expect(isEtfSymbol('IBM')).toBe(false);
      expect(isEtfSymbol('GOOGL')).toBe(false);
    });

    it('應防禦空格與大小寫邊界條件', () => {
      expect(isEtfSymbol('  0050  ')).toBe(true);
      expect(isEtfSymbol('spy')).toBe(true);
      expect(isEtfSymbol('qqq')).toBe(true);
      expect(isEtfSymbol('  nvda  ')).toBe(false);
      expect(isEtfSymbol('')).toBe(false);
    });
  });
});
