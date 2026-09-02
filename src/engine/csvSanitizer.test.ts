import { describe, it, expect } from 'vitest';
import {
  normalizeDateString,
  sanitizeNumeric,
  inferTradeType,
  resolveSymbolAndName,
} from './csvSanitizer';

describe('Seam 1: csvSanitizer - 日期正規化 (normalizeDateString)', () => {
  it('應能正確轉換民國年為西元年 (113/05/20 -> 2024-05-20)', () => {
    expect(normalizeDateString('113/05/20')).toBe('2024-05-20');
    expect(normalizeDateString('113-5-2')).toBe('2024-05-02');
    expect(normalizeDateString('1130520')).toBe('2024-05-20');
    expect(normalizeDateString('99/12/31')).toBe('2010-12-31');
  });

  it('應能正確轉換美式日期 (MM/DD/YYYY -> YYYY-MM-DD)', () => {
    expect(normalizeDateString('05/20/2024')).toBe('2024-05-20');
    expect(normalizeDateString('1/9/2023')).toBe('2023-01-09');
    expect(normalizeDateString('12-31-2022')).toBe('2022-12-31');
  });

  it('應能正確轉換純數字西元年 (YYYYMMDD -> YYYY-MM-DD)', () => {
    expect(normalizeDateString('20240520')).toBe('2024-05-20');
    expect(normalizeDateString('20230101')).toBe('2023-01-01');
  });

  it('標準西元 YYYY-MM-DD 或 YYYY/MM/DD 應保持標準格式', () => {
    expect(normalizeDateString('2024-05-20')).toBe('2024-05-20');
    expect(normalizeDateString('2024/05/20')).toBe('2024-05-20');
  });

  it('面對無效或空白字串應安全回傳空字串', () => {
    expect(normalizeDateString('')).toBe('');
    expect(normalizeDateString('N/A')).toBe('');
    expect(normalizeDateString('InvalidDate')).toBe('');
  });
});

describe('Seam 2: csvSanitizer - 數值與符號清洗 (sanitizeNumeric)', () => {
  it('應能去除千分位逗點 (12,345.67 -> 12345.67)', () => {
    expect(sanitizeNumeric('12,345.67')).toBe(12345.67);
    expect(sanitizeNumeric('1,000,000')).toBe(1000000);
  });

  it('應能去除常見貨幣符號 ($50.5, NT$ 100, US$ 20.2)', () => {
    expect(sanitizeNumeric('$50.5')).toBe(50.5);
    expect(sanitizeNumeric('NT$ 100.00')).toBe(100);
    expect(sanitizeNumeric('US$ 20.2')).toBe(20.2);
    expect(sanitizeNumeric('¥5,000')).toBe(5000);
  });

  it('應能正確解析會計負數括號 ((1,234.5) -> -1234.5)', () => {
    expect(sanitizeNumeric('(1,234.50)')).toBe(-1234.5);
    expect(sanitizeNumeric('(500)')).toBe(-500);
  });

  it('面對空值或非數值字串應回傳預設值或 0', () => {
    expect(sanitizeNumeric('')).toBe(0);
    expect(sanitizeNumeric('--', 0)).toBe(0);
    expect(sanitizeNumeric('N/A', NaN)).toBeNaN();
  });
});

describe('Seam 3: csvSanitizer - 交易類別語意推斷 (inferTradeType)', () => {
  it('應能識別台美股買進動作', () => {
    expect(inferTradeType('買進')).toBe('BUY');
    expect(inferTradeType('現股買進')).toBe('BUY');
    expect(inferTradeType('買入')).toBe('BUY');
    expect(inferTradeType('Buy')).toBe('BUY');
    expect(inferTradeType('BOT')).toBe('BUY');
    expect(inferTradeType('Bought')).toBe('BUY');
  });

  it('應能識別台美股賣出動作', () => {
    expect(inferTradeType('賣出')).toBe('SELL');
    expect(inferTradeType('現股賣出')).toBe('SELL');
    expect(inferTradeType('賣入')).toBe('SELL');
    expect(inferTradeType('Sell')).toBe('SELL');
    expect(inferTradeType('SLD')).toBe('SELL');
    expect(inferTradeType('Sold')).toBe('SELL');
  });

  it('應能識別股利與配息動作', () => {
    expect(inferTradeType('配息')).toBe('DIVIDEND');
    expect(inferTradeType('現金股利')).toBe('DIVIDEND');
    expect(inferTradeType('股利')).toBe('DIVIDEND');
    expect(inferTradeType('Dividend')).toBe('DIVIDEND');
    expect(inferTradeType('DIV')).toBe('DIVIDEND');
    expect(inferTradeType('Cash Dividend')).toBe('DIVIDEND');
  });

  it('應能識別股票股利與除權動作', () => {
    expect(inferTradeType('配股')).toBe('STOCK_DIVIDEND');
    expect(inferTradeType('股票股利')).toBe('STOCK_DIVIDEND');
    expect(inferTradeType('除權')).toBe('STOCK_DIVIDEND');
    expect(inferTradeType('Stock Dividend')).toBe('STOCK_DIVIDEND');
  });

  it('應能識別減資與拆股動作', () => {
    expect(inferTradeType('現金減資')).toBe('CAPITAL_REDUCTION');
    expect(inferTradeType('減資')).toBe('CAPITAL_REDUCTION');
    expect(inferTradeType('Capital Reduction')).toBe('CAPITAL_REDUCTION');
    expect(inferTradeType('股票分割')).toBe('STOCK_SPLIT');
    expect(inferTradeType('拆股')).toBe('STOCK_SPLIT');
    expect(inferTradeType('Stock Split')).toBe('STOCK_SPLIT');
  });
});

describe('Seam 4: csvSanitizer - 標的代碼與名稱自動補齊 (resolveSymbolAndName)', () => {
  it('給予台股代碼無名稱時，應自動補齊官方名稱與 TW 市場', () => {
    const res = resolveSymbolAndName('2330', '');
    expect(res.symbol).toBe('2330');
    expect(res.market).toBe('TW');
    expect(res.currency).toBe('TWD');
    expect(res.name).toBe('台積電');
  });

  it('給予美股代碼無名稱時，應正確判定為 US 市場與 USD 幣別', () => {
    const res = resolveSymbolAndName('AAPL', '');
    expect(res.symbol).toBe('AAPL');
    expect(res.market).toBe('US');
    expect(res.currency).toBe('USD');
  });

  it('台股代碼帶有後綴或雜訊時應能正常清洗 (如 2330.TW -> 2330)', () => {
    const res = resolveSymbolAndName('2330.TW', '');
    expect(res.symbol).toBe('2330');
    expect(res.market).toBe('TW');
    expect(res.name).toBe('台積電');
  });
});
