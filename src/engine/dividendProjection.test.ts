import { describe, it, expect } from 'vitest';
import {
  projectFutureDividends,
  computeExDividendReferencePrice,
} from './receivableDividendEngine';
import { HoldingPosition } from '../types/stock';
import { CorporateActionCalendarRecord } from '../types/corporateAction';

describe('Ticket 12: Receivable Dividend Future Projection Engine', () => {
  it('1. projectFutureDividends 應能結合前瞻日曆與持倉計算預估股利', () => {
    const mockHoldings: HoldingPosition[] = [
      {
        symbol: '2330',
        name: '台積電',
        shares: 10000, // 持有 10 張
        costPrice: 900,
        currentPrice: 1000,
        market: 'TW',
        currency: 'TWD',
        totalCost: 9000000,
        totalDividends: 0,
      } as any,
    ];

    const mockCalendar: CorporateActionCalendarRecord[] = [
      {
        symbol: '2330',
        market: 'TW',
        actionType: 'DIVIDEND',
        exDate: '2026-11-15',
        paymentDate: '2026-12-10',
        cashDividendPerShare: 4.5,
        updatedAt: Date.now(),
      },
      {
        symbol: '2454',
        market: 'TW',
        actionType: 'DIVIDEND',
        exDate: '2026-11-20',
        paymentDate: '2026-12-15',
        cashDividendPerShare: 30.0,
        updatedAt: Date.now(),
      },
    ];

    const projected = projectFutureDividends(mockHoldings, mockCalendar);
    expect(projected.length).toBe(1);
    expect(projected[0].symbol).toBe('2330');
    expect(projected[0].estimatedGrossDividend).toBe(45000); // 10,000 股 * 4.5 元
    expect(projected[0].exDate).toBe('2026-11-15');
    expect(projected[0].payDate).toBe('2026-12-10');
  });

  it('2. computeExDividendReferencePrice 應精確計算除息除權參考基準價', () => {
    // 案例 1：僅除息 (前日收盤 1000 元，配息 4.5 元 -> 參考價 995.5 元)
    const ref1 = computeExDividendReferencePrice(1000, 4.5, 0);
    expect(ref1).toBe(995.5);

    // 案例 2：除息加除權 (收盤 100 元，配息 2 元，配股 10% 即 stockDividendRatio = 0.1)
    // 公式：(收盤價 - 現金股利) / (1 + 配股率) = (100 - 2) / 1.1 = 89.09
    const ref2 = computeExDividendReferencePrice(100, 2, 0.1);
    expect(ref2).toBeCloseTo(89.09, 2);
  });

  it('3. [Spec 0231 / Ticket #549] projectFutureDividends 應為美股扣除 30% IRS 預扣稅並乘上 usdToTwdRate 折合台幣', () => {
    const usHoldings: HoldingPosition[] = [
      {
        symbol: 'AAPL',
        name: 'Apple',
        shares: 100,
        costPrice: 150,
        currentPrice: 200,
        market: 'US',
        currency: 'USD',
        totalCost: 15000,
        totalDividends: 0,
      } as any,
    ];
    const usCalendar: CorporateActionCalendarRecord[] = [
      {
        symbol: 'AAPL',
        market: 'US',
        actionType: 'DIVIDEND',
        exDate: '2026-11-10',
        paymentDate: '2026-11-20',
        cashDividendPerShare: 0.25,
        updatedAt: Date.now(),
      },
    ];

    const projected = projectFutureDividends(usHoldings, usCalendar, 32.0);
    expect(projected).toHaveLength(1);
    expect(projected[0].estimatedGrossDividend).toBe(25);
    expect(projected[0].estimatedTaxOrFee).toBe(7.5);
    expect(projected[0].estimatedNetDividend).toBe(17.5);
    expect(projected[0].estimatedNetDividendInTWD).toBe(560);
  });
});
