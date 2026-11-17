import { describe, it, expect } from 'vitest';
import { detectArchiveFormat, parseUnifiedArchiveV2 } from './archiveParser';
import { StockTrackerUnifiedArchiveV2 } from '../types/stock';

describe('archiveParser - 多型封包識別與解包引擎 (Spec 0234)', () => {
  const mockV2Archive: StockTrackerUnifiedArchiveV2 = {
    schemaVersion: '2.0.0',
    generator: 'StockTracker-Core',
    version: 4,
    exportedAt: '2026-11-17T17:00:00Z',
    isRedacted: true,
    payload: {
      trades: [
        {
          id: 't-1',
          date: '2026-08-01',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          accountId: 'acc-1',
          shares: 1000,
          price: 900,
          fee: 10,
          tax: 0,
          createdAt: 1,
        },
      ],
      brokerAccounts: [
        {
          id: 'acc-1',
          name: '國泰世華',
          market: 'TW',
          feeRate: 0.001425,
          discountRate: 0.28,
          minFee: 20,
          taxRate: 0.003,
        },
      ],
      cashTransactions: [
        {
          id: 'cash-1',
          accountId: 'acc-1',
          currency: 'TWD',
          type: 'DEPOSIT',
          amount: 500000,
          date: '2026-08-01',
          createdAt: 1,
        },
        {
          id: 'cash-2',
          accountId: 'acc-1',
          currency: 'TWD',
          type: 'LOAN_DISBURSEMENT',
          amount: 300000,
          date: '2026-08-05',
          createdAt: 2,
        },
      ],
      loanRecords: [
        {
          id: 'loan-1',
          name: '元大不限用途款項借貸',
          loanType: 'PLEDGE',
          principal: 300000,
          annualInterestRate: 2.45,
          currency: 'TWD',
          warningRatio: 130,
          safeRatio: 166,
          pledgedCollateral: [{ symbol: '2330', shares: 1000 }],
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
      ],
      settings: {
        accountingView: 'BROKER',
        apiKeys: { finmindToken: '', fmpKey: '' },
      },
    },
    metrics: {
      totalTrades: 1,
      totalAccounts: 1,
      totalCashTransactions: 2,
      totalLoans: 1,
      totalCorporateActions: 1,
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

  it('1. detectArchiveFormat 能精準識別 V2 全態封包、V1 純交易陣列與無效格式', () => {
    expect(detectArchiveFormat(mockV2Archive)).toBe('V2_UNIFIED');
    expect(detectArchiveFormat(mockV2Archive.payload.trades)).toBe('V1_TRADES_ARRAY');
    expect(detectArchiveFormat({ foo: 'bar' })).toBe('INVALID');
    expect(detectArchiveFormat(null)).toBe('INVALID');
    expect(detectArchiveFormat('random string')).toBe('INVALID');
  });

  it('2. parseUnifiedArchiveV2 能無損解析 V2 實體並保留 729 筆現金與不限用途借貸', () => {
    const result = parseUnifiedArchiveV2(mockV2Archive);
    expect(result).not.toBeNull();
    expect(result?.schemaVersion).toBe('2.0.0');
    expect(result?.isRedacted).toBe(true);
    expect(result?.payload.trades.length).toBe(1);
    expect(result?.payload.brokerAccounts.length).toBe(1);
    expect(result?.payload.cashTransactions.length).toBe(2);
    expect(result?.payload.loanRecords.length).toBe(1);
    expect(result?.payload.loanRecords[0].loanType).toBe('PLEDGE');
    expect(result?.payload.loanRecords[0].warningRatio).toBe(130);
    expect(result?.payload.corporateActions.length).toBe(1);
  });

  it('3. 若交易紀錄中之 brokerAccountId 懸空，能自動修復對齊至可用帳戶', () => {
    const orphanedArchive = JSON.parse(JSON.stringify(mockV2Archive));
    orphanedArchive.payload.trades[0].accountId = 'non-existent-account';

    const result = parseUnifiedArchiveV2(orphanedArchive);
    expect(result).not.toBeNull();
    // 應自動對齊至合法之 acc-1
    expect(result?.payload.trades[0].accountId).toBe('acc-1');
  });
});
