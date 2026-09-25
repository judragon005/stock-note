import { describe, it, expect } from 'vitest';
import { compareHoldingsOrder, HasMarketAndSymbol } from './holdingsSort';

describe('holdingsSort (持倉雙階自然排序比較器 - Spec 0139 / Ticket 01)', () => {
  it('1. 台股 (TW) 應永遠優先於美股 (US)，無論代碼字典序為何', () => {
    const twStock: HasMarketAndSymbol = { symbol: '9927', market: 'TW' };
    const usStock: HasMarketAndSymbol = { symbol: 'AAPL', market: 'US' };

    // TW (0) - US (1) = -1 < 0
    expect(compareHoldingsOrder(twStock, usStock)).toBeLessThan(0);
    // US (1) - TW (0) = 1 > 0
    expect(compareHoldingsOrder(usStock, twStock)).toBeGreaterThan(0);
  });

  it('2. 同為台股時，應依標的代碼自然字典序升冪排列', () => {
    const tw1101: HasMarketAndSymbol = { symbol: '1101', market: 'TW' };
    const tw2330: HasMarketAndSymbol = { symbol: '2330', market: 'TW' };

    expect(compareHoldingsOrder(tw1101, tw2330)).toBeLessThan(0);
    expect(compareHoldingsOrder(tw2330, tw1101)).toBeGreaterThan(0);
  });

  it('3. 同為美股時，應依標的代碼英文字典序升冪排列', () => {
    const aapl: HasMarketAndSymbol = { symbol: 'AAPL', market: 'US' };
    const nvda: HasMarketAndSymbol = { symbol: 'NVDA', market: 'US' };
    const tsla: HasMarketAndSymbol = { symbol: 'TSLA', market: 'US' };

    expect(compareHoldingsOrder(aapl, nvda)).toBeLessThan(0);
    expect(compareHoldingsOrder(nvda, tsla)).toBeLessThan(0);
    expect(compareHoldingsOrder(tsla, aapl)).toBeGreaterThan(0);
  });

  it('4. 相同市場與相同標的代碼時，應回傳 0', () => {
    const a: HasMarketAndSymbol = { symbol: '2330', market: 'TW' };
    const b: HasMarketAndSymbol = { symbol: '2330', market: 'TW' };

    expect(compareHoldingsOrder(a, b)).toBe(0);
  });

  it('5. 針對持倉陣列使用 .sort(compareHoldingsOrder)，應產出精準之雙階混合排序', () => {
    const mixedHoldings: HasMarketAndSymbol[] = [
      { symbol: 'TSLA', market: 'US' },
      { symbol: '2330', market: 'TW' },
      { symbol: 'AAPL', market: 'US' },
      { symbol: '0050', market: 'TW' },
      { symbol: 'NVDA', market: 'US' },
      { symbol: '9927', market: 'TW' },
    ];

    const sorted = [...mixedHoldings].sort(compareHoldingsOrder);

    expect(sorted.map(h => `${h.market}:${h.symbol}`)).toEqual([
      'TW:0050',
      'TW:2330',
      'TW:9927',
      'US:AAPL',
      'US:NVDA',
      'US:TSLA',
    ]);
  });
});
