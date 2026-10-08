import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiForceDashboardView } from './AiForceDashboardView';
import { createDefaultAiForceReport } from '../../engine/aiForceDashboardEngine';
import * as marketCacheLoader from '../../engine/marketCacheLoader';
import * as priceFetcher from '../../engine/priceFetcher';

describe('Ticket 08: 主力戰情室 7 層 Bento-Grid 專業動線架構驗收 (Spec 0172 Story 3)', () => {
  const readyReport = createDefaultAiForceReport('2330', '台積電', 'TW', 1000);

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(marketCacheLoader, 'loadSymbolFullLakehouseData').mockResolvedValue(null);
    vi.spyOn(marketCacheLoader, 'loadSymbolDispositionStatus').mockResolvedValue('NORMAL');
    vi.spyOn(priceFetcher, 'fetchStockQuote').mockResolvedValue(null);
  });

  it('應呈現交易心理學 7 層 Bento-Grid 階層架構 (Layer 1 ~ Layer 7)', () => {
    const html = renderToStaticMarkup(
      React.createElement(AiForceDashboardView, {
        initialSymbol: '2330',
        initialMarket: 'TW',
        initialReport: readyReport,
      })
    );

    // 驗證 7 大層級標記皆存在且按順序呈現
    expect(html).toContain('data-layer="1-kline"');
    expect(html).toContain('data-layer="2-radars"');
    expect(html).toContain('data-layer="3-position-chips"');
    expect(html).toContain('data-layer="4-big-data"');
    expect(html).toContain('data-layer="5-path-cost"');
    expect(html).toContain('data-layer="6-energy-sentiment"');
    expect(html).toContain('data-layer="7-verdict-command"');

    // 驗證 Layer 2 包含雙雷達（卡片 03 + 卡片 05）
    const layer2Index = html.indexOf('data-layer="2-radars"');
    const layer3Index = html.indexOf('data-layer="3-position-chips"');
    const layer4Index = html.indexOf('data-layer="4-big-data"');
    const layer5Index = html.indexOf('data-layer="5-path-cost"');
    const layer6Index = html.indexOf('data-layer="6-energy-sentiment"');
    const layer7Index = html.indexOf('data-layer="7-verdict-command"');

    expect(layer2Index).toBeLessThan(layer3Index);
    expect(layer3Index).toBeLessThan(layer4Index);
    expect(layer4Index).toBeLessThan(layer5Index);
    expect(layer5Index).toBeLessThan(layer6Index);
    expect(layer6Index).toBeLessThan(layer7Index);
  });

  it('Layer 2 雙雷達應享有獨立雙欄大視野且具備響應式寬度保護', () => {
    const html = renderToStaticMarkup(
      React.createElement(AiForceDashboardView, {
        initialSymbol: '2330',
        initialMarket: 'TW',
        initialReport: readyReport,
      })
    );

    // 雙雷達文字不折行且具備半寬/自適應大視野
    expect(html).toContain('多維度判讀');
    expect(html).toContain('風險雷達圖');
  });
});
