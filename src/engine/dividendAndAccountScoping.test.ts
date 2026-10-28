import { describe, it, expect } from 'vitest';
import { calculateReceivableDividends, estimatePaymentDate } from './receivableDividendEngine';
import { generateAuditAdjustmentTrade } from './reconciliationEngine';
import { calculateAccountBalances } from './cashLedgerEngine';
import { HoldingPosition, TradeRecord, BrokerAccount, CashTransaction } from '../types/stock';
import { RawCorporateEvent } from './corporateActionScanner';

describe('Ticket 03: 除息生命週期修復與在籍股利保護 (Spec 0208)', () => {
  it('estimatePaymentDate 應傳入 symbol 並精確匹配官方字典發放日，而非預設 28~30 天推估', () => {
    // 00919 在 2024-03-18 除息，官方字典明訂為 2024-04-15
    const payDateWithSymbol = estimatePaymentDate('2024-03-18', 'TW', '00919');
    expect(payDateWithSymbol).toBe('2024-04-15');

    // 0056 在 2024-07-16 除息，官方字典明訂為 2024-08-09
    const payDate0056 = estimatePaymentDate('2024-07-16', 'TW', '0056');
    expect(payDate0056).toBe('2024-08-09');
  });

  it('在除息基準日前一日在籍持有，除息後全數賣出股票，未入帳前依然能計算出應收股利權益', () => {
    const trades: TradeRecord[] = [
      {
        id: 't-buy-00919',
        date: '2024-03-15',
        symbol: '00919',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 10000,
        price: 25,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-sell-00919',
        date: '2024-03-19',
        symbol: '00919',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 10000,
        price: 25.5,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const holdings: HoldingPosition[] = [
      {
        symbol: '00919',
        name: '群益台灣精選高息',
        market: 'TW',
        currency: 'TWD',
        shares: 0,
        avgCost: 0,
        totalCostBasis: 0,
        adjustedCostBasis: 0,
        currentPrice: 25.5,
        marketValue: 0,
        grossMarketValue: 0,
        estimatedSellTax: 0,
        estimatedSellFee: 0,
        netMarketValue: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        unrealizedPnLBroker: 0,
        unrealizedPnLBrokerPercent: 0,
        realizedPnL: 5000,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 5000,
        totalReturnPercent: 2,
        yieldOnCostPercent: 0,
        isClosed: true,
      },
    ];

    const events: RawCorporateEvent[] = [
      {
        symbol: '00919',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2024-03-18',
        price: 0.66,
      },
    ];

    const receivables = calculateReceivableDividends(
      holdings,
      events,
      trades,
      '2024-03-25',
      32.0,
      events
    );

    expect(receivables).toHaveLength(1);
    const rec = receivables[0];
    expect(rec.symbol).toBe('00919');
    expect(rec.sharesHeldOnExDate).toBe(10000);
    expect(rec.cashDividendPerShare).toBe(0.66);
    expect(rec.estimatedGrossDividend).toBe(6600);
    expect(rec.payDate).toBe('2024-04-15');
    expect(rec.status).toBe('PENDING_PAYMENT');
  });

  it('若已在 trades 登記該筆股利入帳，應收股利應自動扣除沖銷，杜絕雙重計算', () => {
    const trades: TradeRecord[] = [
      {
        id: 't-buy-00919',
        date: '2024-03-15',
        symbol: '00919',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 10000,
        price: 25,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-div-00919',
        date: '2024-04-15',
        symbol: '00919',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        shares: 10000,
        price: 0.66,
        exDate: '2024-03-18',
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const holdings: HoldingPosition[] = [
      {
        symbol: '00919',
        name: '群益台灣精選高息',
        market: 'TW',
        currency: 'TWD',
        shares: 10000,
        avgCost: 25,
        totalCostBasis: 250000,
        adjustedCostBasis: 250000,
        currentPrice: 25.5,
        marketValue: 255000,
        grossMarketValue: 255000,
        estimatedSellTax: 0,
        estimatedSellFee: 0,
        netMarketValue: 255000,
        unrealizedPnL: 5000,
        unrealizedPnLPercent: 2,
        unrealizedPnLBroker: 5000,
        unrealizedPnLBrokerPercent: 2,
        realizedPnL: 0,
        totalDividends: 6600,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 11600,
        totalReturnPercent: 4.64,
        yieldOnCostPercent: 2.64,
      },
    ];

    const events: RawCorporateEvent[] = [
      {
        symbol: '00919',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2024-03-18',
        price: 0.66,
      },
    ];

    const receivables = calculateReceivableDividends(
      holdings,
      events,
      trades,
      '2024-03-25',
      32.0,
      events
    );

    expect(receivables).toHaveLength(0);
  });
});

describe('Ticket 04: 多券商帳戶全鏈路嚴密隔離與調整單綁定 (Spec 0208)', () => {
  it('generateAuditAdjustmentTrade 應支援傳入 accountId 參數並正確寫入調整單', () => {
    const adj = generateAuditAdjustmentTrade(
      '2330',
      10,
      'TW',
      'TWD',
      '國泰盤點調整',
      'broker-cathay'
    );

    expect(adj.symbol).toBe('2330');
    expect(adj.shares).toBe(10);
    expect(adj.type).toBe('ADJUSTMENT');
    expect(adj.accountId).toBe('broker-cathay');
  });

  it('calculateAccountBalances 當傳入經 selectedAccountId 過濾之帳戶與金流時，僅統計該帳戶餘額', () => {
    const accounts: BrokerAccount[] = [
      {
        id: 'broker-tw-1',
        name: '國泰證券',
        market: 'TW',
        feeRate: 0.001425,
        discountRate: 0.28,
        minFee: 1,
        taxRate: 0.003,
      },
      {
        id: 'broker-tw-2',
        name: '富邦證券',
        market: 'TW',
        feeRate: 0.001425,
        discountRate: 0.18,
        minFee: 20,
        taxRate: 0.003,
      },
    ];

    const cashTransactions: CashTransaction[] = [
      {
        id: 'c-1',
        accountId: 'broker-tw-1',
        date: '2026-01-01',
        amount: 100000,
        currency: 'TWD',
        type: 'DEPOSIT',
        category: 'DEPOSIT',
        createdAt: 1,
      },
      {
        id: 'c-2',
        accountId: 'broker-tw-2',
        date: '2026-01-01',
        amount: 500000,
        currency: 'TWD',
        type: 'DEPOSIT',
        category: 'DEPOSIT',
        createdAt: 2,
      },
    ];

    // 全戶模式
    const allSummary = calculateAccountBalances(accounts, cashTransactions, 32.0);
    expect(allSummary.totalTWD).toBe(600000);

    // 依 selectedAccountId = 'broker-tw-1' 過濾
    const scopedAccounts = accounts.filter((a) => a.id === 'broker-tw-1');
    const scopedCash = cashTransactions.filter((c) => c.accountId === 'broker-tw-1');
    const scopedSummary = calculateAccountBalances(scopedAccounts, scopedCash, 32.0);

    expect(scopedSummary.totalTWD).toBe(100000);
    expect(scopedSummary.byAccount['broker-tw-1'].balance).toBe(100000);
    expect(scopedSummary.byAccount['broker-tw-2']).toBeUndefined();
  });
});
