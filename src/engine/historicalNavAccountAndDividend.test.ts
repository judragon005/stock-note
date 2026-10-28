import { describe, it, expect } from 'vitest';
import { calculateHistoricalNavSeries } from './historicalNav';
import { TradeRecord, HistoricalDailyPriceMap } from '../types/stock';
import { ReceivableDividend } from '../types/dividend';

describe('Spec 0207 / Ticket 01: 券商帳戶篩選與應收股利跨帳戶隔離', () => {
  const trades: TradeRecord[] = [
    {
      id: 'trade-cathay-1',
      date: '2026-07-01',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      accountId: 'broker-cathay',
      shares: 1000,
      price: 1000,
      fee: 0,
      tax: 0,
      createdAt: 1,
    },
    {
      id: 'trade-fubon-1',
      date: '2026-07-01',
      symbol: '2454',
      name: '聯發科',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      accountId: 'broker-fubon',
      shares: 1000,
      price: 1000,
      fee: 0,
      tax: 0,
      createdAt: 2,
    },
  ];

  const priceMap: HistoricalDailyPriceMap = {
    '2330': {
      '2026-07-01': 1000,
      '2026-07-02': 970, // 除息 30 元
    },
    '2454': {
      '2026-07-01': 1000,
      '2026-07-02': 950, // 除息 50 元
    },
  };

  const receivableDividends: ReceivableDividend[] = [
    {
      id: 'div-cathay-2330',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      exDate: '2026-07-02',
      payDate: '2026-07-30',
      cashDividendPerShare: 30,
      sharesHeldOnExDate: 1000,
      estimatedGrossDividend: 30000,
      estimatedTaxOrFee: 0,
      estimatedNetDividend: 30000,
      estimatedNetDividendInTWD: 30000,
      status: 'PENDING_PAYMENT',
      accountId: 'broker-cathay',
    },
    {
      id: 'div-fubon-2454',
      symbol: '2454',
      name: '聯發科',
      market: 'TW',
      currency: 'TWD',
      exDate: '2026-07-02',
      payDate: '2026-07-30',
      cashDividendPerShare: 50,
      sharesHeldOnExDate: 1000,
      estimatedGrossDividend: 50000,
      estimatedTaxOrFee: 0,
      estimatedNetDividend: 50000,
      estimatedNetDividendInTWD: 50000,
      status: 'PENDING_PAYMENT',
      accountId: 'broker-fubon',
    },
  ];

  it('當選定國泰帳戶 (broker-cathay) 時，僅計算國泰之持股與應收股利，總 NAV 平滑為 100 萬', () => {
    const series = calculateHistoricalNavSeries({
      trades,
      priceMap,
      receivableDividends,
      selectedAccountId: 'broker-cathay',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      baseCurrency: 'TWD',
    });

    expect(series.length).toBe(2);
    // 07-01: 台積電 1000 股 * 1000 = 100 萬
    expect(series[0].totalNAV).toBe(1000000);
    expect(series[0].stockMarketValue).toBe(1000000);

    // 07-02: 台積電除息為 970 元，市值 97 萬，應收股利 3 萬，總 NAV 依然為 100 萬
    expect(series[1].stockMarketValue).toBe(970000);
    expect(series[1].receivableDividends).toBe(30000);
    expect(series[1].totalNAV).toBe(1000000);
  });

  it('當選定富邦帳戶 (broker-fubon) 時，僅計算富邦之持股與應收股利，排除國泰數據', () => {
    const series = calculateHistoricalNavSeries({
      trades,
      priceMap,
      receivableDividends,
      selectedAccountId: 'broker-fubon',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      baseCurrency: 'TWD',
    });

    expect(series.length).toBe(2);
    // 07-01: 聯發科 1000 股 * 1000 = 100 萬
    expect(series[0].totalNAV).toBe(1000000);

    // 07-02: 聯發科除息為 950 元，市值 95 萬，應收股利 5 萬，總 NAV 依然為 100 萬
    expect(series[1].stockMarketValue).toBe(950000);
    expect(series[1].receivableDividends).toBe(50000);
    expect(series[1].totalNAV).toBe(1000000);
  });

  it('當未選定帳戶 (ALL) 時，合計兩券商資料，總 NAV 為 200 萬且除息平滑', () => {
    const series = calculateHistoricalNavSeries({
      trades,
      priceMap,
      receivableDividends,
      selectedAccountId: 'ALL',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      baseCurrency: 'TWD',
    });

    expect(series[0].totalNAV).toBe(2000000);
    expect(series[1].stockMarketValue).toBe(1920000); // 97 萬 + 95 萬
    expect(series[1].receivableDividends).toBe(80000); // 3 萬 + 5 萬
    expect(series[1].totalNAV).toBe(2000000);
  });
});
