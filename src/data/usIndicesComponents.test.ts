import { describe, it, expect } from 'vitest';
import {
  US_DOW_30_SYMBOLS,
  US_SOX_30_SYMBOLS,
  US_NASDAQ_100_SYMBOLS,
  US_SP_500_SYMBOLS,
  TW_ALL_SYMBOLS,
  TW_MID_100_SYMBOLS,
} from './usIndicesComponents';

describe('美股四大市場與台股全量成分庫 (usIndicesComponents)', () => {
  it('US_DOW_30_SYMBOLS 應正確包含 30 檔道瓊工業藍籌成分股', () => {
    expect(US_DOW_30_SYMBOLS.length).toBe(30);
    const symbols = US_DOW_30_SYMBOLS.map((s) => s.symbol);
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('MSFT');
    expect(symbols).toContain('NVDA');
    expect(symbols).toContain('JPM');
    expect(symbols).toContain('CAT');
    for (const item of US_DOW_30_SYMBOLS) {
      expect(item.market).toBe('US');
      expect(item.name.length).toBeGreaterThan(0);
    }
  });

  it('US_SOX_30_SYMBOLS 應正確包含 30 檔費城半導體成分股', () => {
    expect(US_SOX_30_SYMBOLS.length).toBe(30);
    const symbols = US_SOX_30_SYMBOLS.map((s) => s.symbol);
    expect(symbols).toContain('NVDA');
    expect(symbols).toContain('TSM');
    expect(symbols).toContain('ASML');
    expect(symbols).toContain('AMD');
    expect(symbols).toContain('QCOM');
    for (const item of US_SOX_30_SYMBOLS) {
      expect(item.market).toBe('US');
    }
  });

  it('US_NASDAQ_100_SYMBOLS 應包含 100 檔科技與創新龍頭', () => {
    expect(US_NASDAQ_100_SYMBOLS.length).toBeGreaterThanOrEqual(100);
    const symbols = US_NASDAQ_100_SYMBOLS.map((s) => s.symbol);
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('GOOGL');
    expect(symbols).toContain('AMZN');
    expect(symbols).toContain('COST');
    expect(symbols).toContain('PLTR');
  });

  it('US_SP_500_SYMBOLS 應涵蓋 S&P 500 大型權值庫 (>= 500 檔)', () => {
    expect(US_SP_500_SYMBOLS.length).toBeGreaterThanOrEqual(500);
    const symbols = US_SP_500_SYMBOLS.map((s) => s.symbol);
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('BRK.B');
    expect(symbols).toContain('UNH');
  });

  it('TW_ALL_SYMBOLS 應涵蓋全台股上市櫃與 ETF 標的 (>= 2000 檔)', () => {
    expect(TW_ALL_SYMBOLS.length).toBeGreaterThanOrEqual(2000);
    const symbols = TW_ALL_SYMBOLS.map((s) => s.symbol);
    expect(symbols).toContain('2330');
    expect(symbols).toContain('2454');
    expect(symbols).toContain('0050');
    for (const item of TW_ALL_SYMBOLS.slice(0, 50)) {
      expect(item.market).toBe('TW');
    }
  });

  it('TW_MID_100_SYMBOLS 應涵蓋 100 檔台灣中型動能標的', () => {
    expect(TW_MID_100_SYMBOLS.length).toBe(100);
    for (const item of TW_MID_100_SYMBOLS) {
      expect(item.market).toBe('TW');
      expect(item.name).toBeTruthy();
    }
  });
});

