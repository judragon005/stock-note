import { describe, it, expect } from 'vitest';
import { TradeRecord } from '../types/stock';
import {
  getTradeFingerprint,
  analyzeTradesDeduplication,
  applyImportDeduplication,
} from './tradeDeduplicator';

describe('Seam 2: tradeDeduplicator - 交易指紋與智慧去重 (tradeDeduplicator)', () => {
  const existingTrades: TradeRecord[] = [
    {
      id: 'trade-1',
      date: '2024-05-20',
      market: 'TW',
      symbol: '2330',
      name: '台積電',
      type: 'BUY',
      shares: 1000,
      price: 800,
      fee: 200,
      tax: 0,
      currency: 'TWD',
      accountId: 'broker-tw-default',
      createdAt: 1,
    },
    {
      id: 'trade-2',
      date: '2024-05-21',
      market: 'US',
      symbol: 'AAPL',
      name: '蘋果',
      type: 'BUY',
      shares: 10,
      price: 180,
      fee: 0,
      tax: 0,
      currency: 'USD',
      accountId: 'broker-us-default',
      createdAt: 2,
    },
  ];

  it('應能正確生成一致性交易特徵指紋', () => {
    const fp1 = getTradeFingerprint(existingTrades[0]);
    const fp2 = getTradeFingerprint({
      ...existingTrades[0],
      id: 'different-id',
      fee: 999, // 手續費不影響成交本質指紋
    });
    expect(fp1).toBe(fp2);
    expect(fp1).toContain('2024-05-20_TW_2330_BUY_1000_800');
  });

  it('分析匯入交易時，應能精準標記 NEW, DUPLICATE 與 INVALID', () => {
    const incoming: Partial<TradeRecord>[] = [
      // 1. 完全相同的台積電交易 -> DUPLICATE
      {
        id: 'new-1',
        date: '2024-05-20',
        market: 'TW',
        symbol: '2330',
        name: '台積電',
        type: 'BUY',
        shares: 1000,
        price: 800,
        currency: 'TWD',
      },
      // 2. 全新交易 -> NEW
      {
        id: 'new-2',
        date: '2024-05-22',
        market: 'TW',
        symbol: '2454',
        name: '聯發科',
        type: 'BUY',
        shares: 500,
        price: 1200,
        currency: 'TWD',
      },
      // 3. 缺少必要欄位 -> INVALID
      {
        id: 'new-3',
        date: '',
        symbol: '2330',
        shares: 0,
        price: 0,
      },
    ];

    const result = analyzeTradesDeduplication(incoming, existingTrades);
    expect(result.summary.total).toBe(3);
    expect(result.summary.newCount).toBe(1);
    expect(result.summary.duplicateCount).toBe(1);
    expect(result.summary.invalidCount).toBe(1);

    expect(result.rows[0].status).toBe('DUPLICATE');
    expect(result.rows[1].status).toBe('NEW');
    expect(result.rows[2].status).toBe('INVALID');
  });

  it('在 SMART_MERGE 模式下，應僅返回標記為 NEW 的有效交易', () => {
    const incoming: Partial<TradeRecord>[] = [
      {
        id: 'new-1',
        date: '2024-05-20',
        market: 'TW',
        symbol: '2330',
        type: 'BUY',
        shares: 1000,
        price: 800,
        currency: 'TWD',
      },
      {
        id: 'new-2',
        date: '2024-05-22',
        market: 'TW',
        symbol: '2454',
        type: 'BUY',
        shares: 500,
        price: 1200,
        currency: 'TWD',
      },
    ];

    const finalTrades = applyImportDeduplication('SMART_MERGE', incoming, existingTrades);
    // 應為既有 2 筆 + 全新 1 筆 = 3 筆
    expect(finalTrades.length).toBe(3);
    expect(finalTrades.some((t) => t.symbol === '2454')).toBe(true);
  });

  it('在 OVERWRITE 模式下，應完全以合法 incoming 替換既有資料庫', () => {
    const incoming: Partial<TradeRecord>[] = [
      {
        id: 'new-2',
        date: '2024-05-22',
        market: 'TW',
        symbol: '2454',
        type: 'BUY',
        shares: 500,
        price: 1200,
        currency: 'TWD',
      },
    ];

    const finalTrades = applyImportDeduplication('OVERWRITE', incoming, existingTrades);
    expect(finalTrades.length).toBe(1);
    expect(finalTrades[0].symbol).toBe('2454');
  });

  it('在 APPEND_ALL 模式下，應強制全數追加所有合法 incoming 記錄', () => {
    const incoming: Partial<TradeRecord>[] = [
      {
        id: 'new-1',
        date: '2024-05-20',
        market: 'TW',
        symbol: '2330',
        type: 'BUY',
        shares: 1000,
        price: 800,
        currency: 'TWD',
      },
    ];

    const finalTrades = applyImportDeduplication('APPEND_ALL', incoming, existingTrades);
    // 既有 2 筆 + 強制追加 1 筆 = 3 筆
    expect(finalTrades.length).toBe(3);
  });
});
