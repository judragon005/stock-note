import { describe, it, expect } from 'vitest';
import { calculateReceivableDividends, estimatePaymentDate } from './receivableDividendEngine';
import { HoldingPosition, TradeRecord } from '../types/stock';
import { RawCorporateEvent } from '../types/dividend';

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
    // 2024-03-15 買進 10,000 股 00919 (除息日前在籍)
    // 2024-03-18 除息 (0.66 TWD / 股)
    // 2024-03-19 全數賣出 10,000 股 00919 (在倉 0 股)
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

    // 當前在庫持股 (已平倉，shares: 0)
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
        id: 'ev-00919-20240318',
        symbol: '00919',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2024-03-18',
        price: 0.66,
      },
    ];

    // 當前日期在除息後、入帳日前 (2024-03-25)
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
    expect(rec.payDate).toBe('2024-04-15'); // 官方字典匹配成功
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
      // 使用者手動登記了該次股利
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
        id: 'ev-00919-20240318',
        symbol: '00919',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2024-03-18',
        price: 0.66,
      },
    ];

    // 在入帳日前檢測
    const receivables = calculateReceivableDividends(
      holdings,
      events,
      trades,
      '2024-03-25',
      32.0,
      events
    );

    // 因為 trades 內已有該除息日 exDate: 2024-03-18 的 DIVIDEND 紀錄，應收股利沖銷歸零
    expect(receivables).toHaveLength(0);
  });
});
