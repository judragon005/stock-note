import { describe, it, expect } from 'vitest';
import { TradeRecord } from '../types/stock';
import { scanTaxLossHarvestingOpportunities } from './taxOptimizer';

describe('Tax-Loss Harvesting Optimizer (節稅收割掃描引擎)', () => {
  it('應正確篩選出帳面實質虧損 (>$10) 之批次並略過獲利部位', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-01',
        symbol: 'TSLA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 250, // 成本 2500
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-02-01',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 100, // 成本 1000
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    // TSLA 現價 200 (虧損 500)，NVDA 現價 120 (獲利 200)
    const currentPrices = {
      TSLA: 200,
      NVDA: 120,
    };

    const opportunities = scanTaxLossHarvestingOpportunities(trades, currentPrices, 'HIFO');

    expect(opportunities.length).toBe(1);
    expect(opportunities[0].symbol).toBe('TSLA');
    expect(opportunities[0].unrealizedLoss).toBe(-500);
    expect(opportunities[0].shares).toBe(10);
  });

  it('多個虧損批次應依虧損幅度（由虧損最多者排前）降冪排列', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-01',
        symbol: 'AMD',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 150, // 成本 1500，現價 140 -> 虧 100
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-01-02',
        symbol: 'INTC',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 40, // 成本 4000，現價 30 -> 虧 1000
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const currentPrices = {
      AMD: 140,
      INTC: 30,
    };

    const opportunities = scanTaxLossHarvestingOpportunities(trades, currentPrices, 'HIFO');

    expect(opportunities.length).toBe(2);
    // 虧損最多 (INTC -1000) 應排在前面
    expect(opportunities[0].symbol).toBe('INTC');
    expect(opportunities[0].unrealizedLoss).toBe(-1000);
    expect(opportunities[1].symbol).toBe('AMD');
    expect(opportunities[1].unrealizedLoss).toBe(-100);
  });

  it('應依持有天數精準給出長期與短期節稅收割建議標註', () => {
    const today = new Date();
    const shortBuyDate = new Date(today.getTime() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]; // 30天前
    const longBuyDate = new Date(today.getTime() - 400 * 24 * 3600 * 1000).toISOString().split('T')[0]; // 400天前

    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: shortBuyDate,
        symbol: 'COIN',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 250,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: longBuyDate,
        symbol: 'PLTR',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 30,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const currentPrices = {
      COIN: 200, // 虧 500 (短期)
      PLTR: 20,  // 虧 100 (長期)
    };

    const opportunities = scanTaxLossHarvestingOpportunities(trades, currentPrices, 'HIFO');

    expect(opportunities.length).toBe(2);
    const shortOpp = opportunities.find((o) => o.symbol === 'COIN')!;
    const longOpp = opportunities.find((o) => o.symbol === 'PLTR')!;

    expect(shortOpp.isLongTerm).toBe(false);
    expect(shortOpp.recommendationNote).toContain('短期');

    expect(longOpp.isLongTerm).toBe(true);
    expect(longOpp.recommendationNote).toContain('長期');
  });
});
