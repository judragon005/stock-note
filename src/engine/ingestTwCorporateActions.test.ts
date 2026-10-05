import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;

describe('Ticket 11: Ingest TW Corporate Actions Official Pipeline', () => {
  const { parseTwseExDividendReport } = require('../../scripts/market-sync/ingest-tw-corporate-actions.cjs');

  it('1. parseTwseExDividendReport 應正確清洗並格式化 TWSE TWT48U 預告數據', () => {
    // 模擬 TWSE TWT48U 官方格式
    const mockTwt48u = [
      {
        Date: '1150318', // 民國 115 年 3 月 18 日 -> 2026-03-18
        Code: '2330',
        Name: '台積電',
        'Dividend(Cash)': '4.500000',
        'Dividend(Stock)': '0.000000',
        PaymentDate: '1150410', // 2026-04-10
      },
      {
        Date: '1150325',
        Code: '2454',
        Name: '聯發科',
        'Dividend(Cash)': '28.000000',
        'Dividend(Stock)': '0.000000',
        PaymentDate: '1150420',
      },
    ];

    const records = parseTwseExDividendReport(mockTwt48u);
    expect(records.length).toBe(2);

    expect(records[0].symbol).toBe('2330');
    expect(records[0].market).toBe('TW');
    expect(records[0].actionType).toBe('DIVIDEND');
    expect(records[0].exDate).toBe('2026-03-18');
    expect(records[0].paymentDate).toBe('2026-04-10');
    expect(records[0].cashDividendPerShare).toBe(4.5);

    expect(records[1].symbol).toBe('2454');
    expect(records[1].exDate).toBe('2026-03-25');
    expect(records[1].cashDividendPerShare).toBe(28.0);
  });

  it('2. 空數據或異常格式應安全回傳空陣列', () => {
    expect(parseTwseExDividendReport(null)).toEqual([]);
    expect(parseTwseExDividendReport([])).toEqual([]);
    expect(parseTwseExDividendReport('invalid')).toEqual([]);
  });
});
