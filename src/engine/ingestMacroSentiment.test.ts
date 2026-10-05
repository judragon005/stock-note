import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;

describe('Ticket 15: FRED Macro Rates & Fear/Greed Pipeline', () => {
  const {
    parseFredObservations,
    parseCnnFearGreedResponse,
    computeYieldSpread,
  } = require('../../scripts/market-sync/ingest-macro-sentiment.cjs');

  it('1. parseFredObservations 應正確解析 FRED 殖利率序列最後有效值', () => {
    const mockFred = {
      observations: [
        { date: '2026-09-29', value: '4.32' },
        { date: '2026-09-30', value: '4.35' },
        { date: '2026-10-01', value: '.' }, // 假期或缺失值
      ],
    };

    const latest = parseFredObservations(mockFred);
    expect(latest).toBe(4.35);
  });

  it('2. computeYieldSpread 應精確計算 10Y-2Y 殖利率倒掛利差', () => {
    // 10Y: 4.10, 2Y: 4.30 -> 利差 -0.20% (倒掛)
    const spread = computeYieldSpread(4.10, 4.30);
    expect(spread).toBe(-0.20);
  });

  it('3. parseCnnFearGreedResponse 應提取當前分數與評級', () => {
    const mockCnn = {
      fear_and_greed: {
        score: 68.4,
        rating: 'greed',
        timestamp: '2026-10-02T16:00:00+00:00',
      },
    };

    const score = parseCnnFearGreedResponse(mockCnn);
    expect(score).toBe(68.4);
  });
});
