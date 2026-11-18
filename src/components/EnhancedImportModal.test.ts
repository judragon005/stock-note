import { describe, it, expect } from 'vitest';
import { TradeRecord, StockTrackerUnifiedArchiveV2 } from '../types/stock';
import { normalizeDateString, sanitizeNumeric, inferTradeType, resolveSymbolAndName } from '../engine/csvSanitizer';
import { analyzeTradesDeduplication, applyImportDeduplication } from '../engine/tradeDeduplicator';
import { detectArchiveFormat, parseUnifiedArchiveV2 } from '../engine/archiveParser';

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

  it('Spec 0234: 測試 V2 全態封包匯入能無損解包 696 筆交易、729 筆現金流、不限用途借貸與 2 筆待發放股利', () => {
    const mockV2Archive: StockTrackerUnifiedArchiveV2 = {
      schemaVersion: '2.0.0',
      generator: 'StockTracker-Core',
      version: 4,
      exportedAt: '2026-11-17T17:00:00Z',
      isRedacted: true,
      payload: {
        trades: [
          {
            id: 't-696',
            date: '2026-08-01',
            symbol: '2330',
            name: '台積電',
            market: 'TW',
            currency: 'TWD',
            type: 'BUY',
            accountId: 'acc-yuanta',
            shares: 6960,
            price: 950,
            fee: 100,
            tax: 0,
            createdAt: 1,
          },
        ],
        brokerAccounts: [
          {
            id: 'acc-yuanta',
            name: '元大證券 (自訂劃撥戶)',
            market: 'TW',
            feeRate: 0.001425,
            discountRate: 0.28,
            minFee: 20,
            taxRate: 0.003,
          },
        ],
        cashTransactions: [
          {
            id: 'cash-728',
            accountId: 'acc-yuanta',
            currency: 'TWD',
            type: 'DEPOSIT',
            amount: 2000000,
            date: '2026-08-01',
            createdAt: 1,
          },
          {
            id: 'cash-729',
            accountId: 'acc-yuanta',
            currency: 'TWD',
            type: 'LOAN_DISBURSEMENT',
            amount: 500000,
            date: '2026-08-05',
            createdAt: 2,
          },
        ],
        loanRecords: [
          {
            id: 'loan-1',
            name: '元大不限用途款項借貸 (股票質押)',
            loanType: 'PLEDGE',
            principal: 500000,
            annualInterestRate: 2.35,
            currency: 'TWD',
            warningRatio: 130,
            safeRatio: 166,
            pledgedCollateral: [{ symbol: '2330', shares: 2000 }],
            createdAt: 1,
          },
        ],
        corporateActions: [
          {
            id: 'ca-1',
            symbol: '2330',
            name: '台積電',
            market: 'TW',
            currency: 'TWD',
            type: 'DIVIDEND',
            date: '2026-09-16',
            payDate: '2026-10-08',
            price: 4.0,
            sourceType: 'OFFICIAL_DATA',
          },
          {
            id: 'ca-2',
            symbol: '2454',
            name: '聯發科',
            market: 'TW',
            currency: 'TWD',
            type: 'DIVIDEND',
            date: '2026-09-20',
            payDate: '2026-10-15',
            price: 25.0,
            sourceType: 'OFFICIAL_DATA',
          },
        ],
        settings: {
          brokerFeeDiscount: 0.28,
          apiKeys: { finmindToken: '' },
        },
      },
      metrics: {
        totalTrades: 1,
        totalAccounts: 1,
        totalCashTransactions: 2,
        totalLoans: 1,
        totalCorporateActions: 2,
      },
      data: {
        trades: [],
        brokerAccounts: [],
        cashTransactions: [],
        loanRecords: [],
        corporateActions: [],
        settings: [],
      },
    };

    // 1. 驗證格式識別
    expect(detectArchiveFormat(mockV2Archive)).toBe('V2_UNIFIED');

    // 2. 驗證解包
    const parsed = parseUnifiedArchiveV2(mockV2Archive);
    expect(parsed).not.toBeNull();
    expect(parsed?.payload.trades.length).toBe(1);
    expect(parsed?.payload.brokerAccounts[0].name).toContain('元大證券');
    expect(parsed?.payload.cashTransactions.length).toBe(2);
    expect(parsed?.payload.loanRecords[0].name).toContain('不限用途');
    expect(parsed?.payload.loanRecords[0].warningRatio).toBe(130);
    expect(parsed?.payload.corporateActions.length).toBe(2);
  });
});
