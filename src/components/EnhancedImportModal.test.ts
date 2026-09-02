import { describe, it, expect } from 'vitest';
import { TradeRecord } from '../types/stock';
import { normalizeDateString, sanitizeNumeric, inferTradeType, resolveSymbolAndName } from '../engine/csvSanitizer';
import { analyzeTradesDeduplication, applyImportDeduplication } from '../engine/tradeDeduplicator';

describe('Seam 3: EnhancedImportModal 核心匯入資料流轉換與去重測試', () => {
  const mockExistingTrades: TradeRecord[] = [
    {
      id: 't-1',
      date: '2024-05-20',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      accountId: 'broker-tw-default',
      shares: 1000,
      price: 800,
      fee: 200,
      tax: 0,
      createdAt: 1,
    },
  ];

  it('測試國泰證券 CSV 原始列透過映射與清洗轉為標準 TradeRecord', () => {
    // 模擬國泰證券 CSV
    const headers = ['成交日期', '委託書號', '股票代號', '股票名稱', '買賣別', '成交股數', '成交單價', '手續費', '交易稅'];
    const row = ['113/05/21', 'A1234', '2454', '聯發科', '買進', '500', '1,200', '100', '0'];

    const getColVal = (name: string): string => {
      const idx = headers.indexOf(name);
      return idx !== -1 ? row[idx] : '';
    };

    const cleanDate = normalizeDateString(getColVal('成交日期'));
    const sec = resolveSymbolAndName(getColVal('股票代號'), getColVal('股票名稱'), 'TW');
    const tradeType = inferTradeType(getColVal('買賣別'));
    const shares = sanitizeNumeric(getColVal('成交股數'));
    const price = sanitizeNumeric(getColVal('成交單價'));
    const fee = sanitizeNumeric(getColVal('手續費'));
    const tax = sanitizeNumeric(getColVal('交易稅'));

    expect(cleanDate).toBe('2024-05-21');
    expect(sec.symbol).toBe('2454');
    expect(sec.name).toBe('聯發科');
    expect(tradeType).toBe('BUY');
    expect(shares).toBe(500);
    expect(price).toBe(1200);
    expect(fee).toBe(100);
    expect(tax).toBe(0);
  });

  it('測試 Firstrade 美股 CSV 原始列透過映射與清洗轉為標準 TradeRecord', () => {
    const headers = ['TradeDate', 'Symbol', 'Action', 'Quantity', 'Price', 'Fee', 'Amount'];
    const row = ['05/22/2024', 'NVDA', 'BUY', '10', '120.5', '$0.00', '$1,205.00'];

    const getColVal = (name: string): string => {
      const idx = headers.indexOf(name);
      return idx !== -1 ? row[idx] : '';
    };

    const cleanDate = normalizeDateString(getColVal('TradeDate'));
    const sec = resolveSymbolAndName(getColVal('Symbol'), '', 'US');
    const tradeType = inferTradeType(getColVal('Action'));
    const shares = sanitizeNumeric(getColVal('Quantity'));
    const price = sanitizeNumeric(getColVal('Price'));

    expect(cleanDate).toBe('2024-05-22');
    expect(sec.symbol).toBe('NVDA');
    expect(sec.name).toBe('輝達');
    expect(sec.market).toBe('US');
    expect(sec.currency).toBe('USD');
    expect(tradeType).toBe('BUY');
    expect(shares).toBe(10);
    expect(price).toBe(120.5);
  });

  it('測試去重分析與 SMART_MERGE 成功略過重複記錄並保留全新紀錄', () => {
    const incomingTrades: Partial<TradeRecord>[] = [
      {
        date: '2024-05-20',
        symbol: '2330',
        market: 'TW',
        type: 'BUY',
        shares: 1000,
        price: 800,
      },
      {
        date: '2024-05-22',
        symbol: 'NVDA',
        market: 'US',
        type: 'BUY',
        shares: 10,
        price: 120.5,
      },
    ];

    const analysis = analyzeTradesDeduplication(incomingTrades, mockExistingTrades);
    expect(analysis.summary.total).toBe(2);
    expect(analysis.summary.duplicateCount).toBe(1);
    expect(analysis.summary.newCount).toBe(1);

    const merged = applyImportDeduplication('SMART_MERGE', incomingTrades, mockExistingTrades);
    expect(merged.length).toBe(2); // 既有 1 筆 + 新增 1 筆
    expect(merged[1].symbol).toBe('NVDA');
  });
});
