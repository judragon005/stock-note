import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;

describe('T01: sync-thresholds SSOT (MARKET_HEALTH_THRESHOLDS)', () => {
  it('應匯出凍結的 7 維健康度門檻常數且數值與規格完全對齊', () => {
    const { MARKET_HEALTH_THRESHOLDS } = require('../../scripts/market-sync/sync-thresholds.cjs');

    expect(Object.isFrozen(MARKET_HEALTH_THRESHOLDS)).toBe(true);
    expect(MARKET_HEALTH_THRESHOLDS).toEqual({
      STOCK_COUNT_MIN: 1800,
      CHIPS_COUNT_MIN: 2000,
      FRESHNESS_CHIPS_COUNT_MIN: 1800,
      MARGIN_COUNT_MIN: 1500,
      SBL_COUNT_MIN: 500,
      DAY_TRADE_COUNT_MIN: 500,
      VALUATION_COUNT_MIN: 1500,
      ETF_NAV_COUNT_MIN: 100,
      US_DAILY_MIN_SUCCESS_RATIO: 0.8,
    });
  });
});
