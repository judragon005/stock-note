import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ValuationMetricsCard } from './ValuationMetricsCard';
import type { ValuationMetricsData } from '../../../types/aiForceDashboard';

describe('ValuationMetricsCard - TDD Unit Tests', () => {
  it('1. Ticket 04A: 台股一般個股應正確呈現動態 PE, PB, 年化殖利率與歷史位階條', () => {
    const data: ValuationMetricsData = {
      isEtf: false,
      isUsMarket: false,
      pe: 18.5,
      pb: 3.2,
      dividendYield: 4.8,
      valuationTier: 'FAIR',
      valuationTierText: '合理估值區間',
      asOfDateText: '2026-10-16',
      isEmpty: false,
    };

    const html = renderToStaticMarkup(
      React.createElement(ValuationMetricsCard, { data, market: 'TW' })
    );

    expect(html).toContain('>21<');
    expect(html).not.toContain('CARD 21');
    expect(html).toContain('估值與殖利率量化矩陣');
    expect(html).toContain('本益比 (PE)');
    expect(html).toContain('18.50');
    expect(html).toContain('股價淨值比 (PB)');
    expect(html).toContain('3.20');
    expect(html).toContain('年化現金殖利率');
    expect(html).toContain('4.80%');
    expect(html).toContain('合理估值區間');
    expect(html).toContain('data-testid="valuation-tier-bar"');
  });

  it('2. Ticket 04A: 當資料為空或 isEmpty=true 時應呈現 Honest Empty State', () => {
    const data: ValuationMetricsData = {
      isEtf: false,
      isEmpty: true,
      asOfDateText: '尚無估值數據',
    };

    const html = renderToStaticMarkup(
      React.createElement(ValuationMetricsCard, { data, market: 'TW' })
    );

    expect(html).toContain('data-testid="valuation-empty-state"');
    expect(html).toContain('尚無估值數據');
  });

  it('3. Ticket 04B: 美股個股應顯示 Forward PE、PB，並呈現扣除 30% IRS 預扣稅後之實質殖利率', () => {
    const data: ValuationMetricsData = {
      isEtf: false,
      isUsMarket: true,
      pe: 25.4,
      forwardPe: 21.8,
      pb: 4.5,
      dividendYield: 3.5,
      netDividendYieldUs: 2.45,
      valuationTier: 'UNDERVALUED',
      valuationTierText: '美股便宜區間',
      asOfDateText: '2026-10-16',
      isEmpty: false,
    };

    const html = renderToStaticMarkup(
      React.createElement(ValuationMetricsCard, { data, market: 'US' })
    );

    expect(html).toContain('美股即時估值');
    expect(html).toContain('Forward PE');
    expect(html).toContain('21.80');
    expect(html).toContain('30% 稅後');
    expect(html).toContain('2.45%');
  });

  it('4. Ticket 04C: 遇虧損轉機股時應自適應切換為 PS (市銷率) 並標註虧損轉機', () => {
    const data: ValuationMetricsData = {
      isEtf: false,
      isLossMaking: true,
      psRatio: 8.6,
      pb: 2.1,
      dividendYield: 0,
      valuationTier: 'FAIR',
      valuationTierText: '虧損轉機評估',
      isEmpty: false,
    };

    const html = renderToStaticMarkup(
      React.createElement(ValuationMetricsCard, { data, market: 'TW' })
    );

    expect(html).toContain('市銷率 (PS)');
    expect(html).toContain('8.60');
    expect(html).toContain('虧損轉機');
  });

  it('5. Ticket 04C: ETF 標的應顯示即時折溢價率、費用率與年化配息率，溢價 > 0.5% 顯示警戒', () => {
    const data: ValuationMetricsData = {
      isEtf: true,
      etfPremiumDiscountRate: 0.85,
      etfExpenseRatio: 0.35,
      dividendYield: 5.2,
      asOfDateText: '2026-10-16',
      isEmpty: false,
    };

    const html = renderToStaticMarkup(
      React.createElement(ValuationMetricsCard, { data, market: 'TW' })
    );

    expect(html).toContain('折溢價率');
    expect(html).toContain('+0.85%');
    expect(html).toContain('溢價警戒');
    expect(html).toContain('總費用率');
    expect(html).toContain('0.35%');
    expect(html).toContain('年化配息率');
    expect(html).toContain('5.20%');
  });
});

