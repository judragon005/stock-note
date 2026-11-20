import React from 'react';
// @ts-expect-error 測試環境為 Node，無全域 @types/node 型別定義
import fs from 'node:fs';
// @ts-expect-error 測試環境為 Node，無全域 @types/node 型別定義
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiForceDashboardView, createSymbolRequestGuard } from './AiForceDashboardView';
import { TaskViewsSwitcher } from './TaskViewsSwitcher';
import { HeaderExportBar } from './HeaderExportBar';
import { WAR_ROOM_TYPOGRAPHY_FLOOR } from './typographyFloor';
import { createDefaultAiForceReport } from '../../engine/aiForceDashboardEngine';
import type { HoldingPosition } from '../../types/stock';
import * as marketCacheLoader from '../../engine/marketCacheLoader';
import * as priceFetcher from '../../engine/priceFetcher';

describe('Ticket 08: 主力戰情室 7 層 Bento-Grid 專業動線架構驗收 (Spec 0172 Story 3)', () => {
  const readyReport = { ...createDefaultAiForceReport('2330', '台積電', 'TW', 1000), isDataPending: false };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(marketCacheLoader, 'loadSymbolFullLakehouseData').mockResolvedValue(null);
    vi.spyOn(marketCacheLoader, 'loadSymbolDispositionStatus').mockResolvedValue('NORMAL');
    vi.spyOn(priceFetcher, 'fetchStockQuote').mockResolvedValue(null);
  });

  it('應呈現交易心理學 8 層 Bento-Grid 階層架構 (Layer 1 ~ Layer 8，含 Card 18 獨立滿版作戰列與 Layer 7 雙欄矩陣)', () => {
    const html = renderToStaticMarkup(
      React.createElement(AiForceDashboardView, {
        initialSymbol: '2330',
        initialMarket: 'TW',
        initialReport: readyReport,
      })
    );

    // 驗證 8 大層級標記皆存在且按順序呈現 (Spec 0211)
    expect(html).toContain('data-layer="1-kline"');
    expect(html).toContain('data-layer="2-radars"');
    expect(html).toContain('data-layer="3-position-chips"');
    expect(html).toContain('data-layer="4-big-data"');
    expect(html).toContain('data-layer="5-path-cost"');
    expect(html).toContain('data-layer="6-energy-sentiment"');
    expect(html).toContain('data-layer="7-chips-health-matrix"');
    expect(html).toContain('data-layer="8-main-force-verdict-deck"');

    // 驗證 Layer 2 包含雙雷達（卡片 03 + 卡片 05）
    const layer1Index = html.indexOf('data-layer="1-kline"');
    const layer2Index = html.indexOf('data-layer="2-radars"');
    const layer3Index = html.indexOf('data-layer="3-position-chips"');
    const layer4Index = html.indexOf('data-layer="4-big-data"');
    const layer5Index = html.indexOf('data-layer="5-path-cost"');
    const layer6Index = html.indexOf('data-layer="6-energy-sentiment"');
    const layer7Index = html.indexOf('data-layer="7-chips-health-matrix"');
    const layer8Index = html.indexOf('data-layer="8-main-force-verdict-deck"');

    // Spec 0242: Card 18 司令台置頂於 Card 01 (Layer 1) 之前
    expect(layer8Index).toBeGreaterThan(-1);
    expect(layer8Index).toBeLessThan(layer1Index);
    expect(layer1Index).toBeLessThan(layer2Index);
    expect(layer2Index).toBeLessThan(layer3Index);
    expect(layer3Index).toBeLessThan(layer4Index);
    expect(layer4Index).toBeLessThan(layer5Index);
    expect(layer5Index).toBeLessThan(layer6Index);
    expect(layer6Index).toBeLessThan(layer7Index);

    // 驗證 Card 18 獨立置頂滿版
    expect(html).toContain('18 主力追蹤總評判');
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

  it('Ticket 01 (Spec 0179): 美股標的之 Card 19 TDCC 集保趨勢應呈現 Honest Empty State 與 13F 提示', () => {
    const usReport = { ...createDefaultAiForceReport('AAPL', '蘋果公司', 'US', 230), isDataPending: false };
    const html = renderToStaticMarkup(
      React.createElement(AiForceDashboardView, {
        initialSymbol: 'AAPL',
        initialMarket: 'US',
        initialReport: usReport,
      })
    );

    expect(html).toContain('data-testid="tdcc-empty-state"');
    expect(html).toContain('美股無集保機制 (採 13F 機構申報)');
  });

  describe('Spec 0181 Ticket 17: 主力戰情室底層 AI 戰情提示詞中樞驗收', () => {
    it('主力戰情室底層應渲染 AI 戰情提示詞中樞且具備一鍵複製按鈕', () => {
      const html = renderToStaticMarkup(
        React.createElement(AiForceDashboardView, {
          initialSymbol: '2330',
          initialMarket: 'TW',
          initialReport: readyReport,
        })
      );

      expect(html).toContain('data-layer="war-room-prompt-hub"');
      expect(html).toContain('一鍵複製 AI 戰情提示詞');
      expect(html).toContain('已脫敏');
    });

    it('切換至任務二技術警示視圖時，底層 AI 提示詞卡片依然常駐', () => {
      const task2Report = {
        ...readyReport,
        activeTaskTab: 'TASK_2_TECHNICAL_ALERTS' as const,
      };

      const html = renderToStaticMarkup(
        React.createElement(AiForceDashboardView, {
          initialSymbol: '2330',
          initialMarket: 'TW',
          initialReport: task2Report,
        })
      );

      expect(html).toContain('data-layer="war-room-prompt-hub"');
    });
  });

  describe('Spec 0195 Ticket 05B: Layer 6 四欄等高 250px 拓撲驗收', () => {
    it('Layer 6 應包含雙子容器、Card 12 動態信號、Card 21 估值矩陣、Card 14 信心維度四欄', () => {
      const html = renderToStaticMarkup(
        React.createElement(AiForceDashboardView, {
          initialSymbol: '2330',
          initialMarket: 'TW',
          initialReport: readyReport,
        })
      );

      expect(html).toContain('data-layer="6-energy-sentiment"');
      expect(html).toContain('data-testid="energy-sentiment-twin-card"');
      expect(html).toContain('data-testid="dynamic-signals-card"');
      expect(html).toContain('data-testid="valuation-metrics-card"');
      expect(html).toContain('data-testid="ai-confidence-card"');
      expect(html).toContain('height:250px');
    });
  });

  describe('Spec 0237 Wave 3A: 競態防護、持倉 HUD、Obsidian De-Slop 與 4 大戰術區驗收', () => {
    it('非同步競態防護 (activeRequestIdRef)：較慢的舊標的請求回傳時不得覆蓋較新的標的選擇', async () => {
      const guard = createSymbolRequestGuard();
      const committed: string[] = [];

      const req1 = guard.next();
      const req2 = guard.next();

      // 模擬 req2 先完成，req1 較慢後完成
      await Promise.resolve().then(() => {
        if (guard.isCurrent(req2)) {
          committed.push('2330');
        }
      });
      await new Promise((r) => setTimeout(r, 10)).then(() => {
        if (guard.isCurrent(req1)) {
          committed.push('0050');
        }
      });

      expect(committed).toEqual(['2330']);
    });

    it('Portfolio Position HUD：當 holdings 持有當前標的 (shares > 0) 時，HeaderMarketBar 應顯示持股數與均價 vs VWAP 對比', () => {
      const reportWithVwap = {
        ...readyReport,
        vwapCostStructure: {
          ...readyReport.vwapCostStructure,
          mainForceVwap: 980,
        },
      };
      const mockHoldings: HoldingPosition[] = [
        {
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          shares: 1000,
          avgCost: 950,
          totalCostBasis: 950000,
          adjustedCostBasis: 950000,
          currentPrice: 1000,
          marketValue: 1000000,
          grossMarketValue: 1000000,
          estimatedSellTax: 3000,
          estimatedSellFee: 1425,
          netMarketValue: 995575,
          unrealizedPnL: 50000,
          unrealizedPnLPercent: 5.26,
          unrealizedPnLBroker: 45575,
          unrealizedPnLBrokerPercent: 4.8,
          realizedPnL: 0,
          totalDividends: 0,
          totalCapitalReturned: 0,
          totalStockDividendsShares: 0,
          totalReturnPnL: 50000,
          totalReturnPercent: 5.26,
          yieldOnCostPercent: 0,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(AiForceDashboardView, {
          initialSymbol: '2330',
          initialMarket: 'TW',
          initialReport: reportWithVwap,
          holdings: mockHoldings,
        })
      );

      expect(html).toContain('data-testid="portfolio-position-hud"');
      expect(html).toContain('1,000');
      expect(html).toContain('950.00');
      expect(html).toContain('980.00');
    });

    it('TaskViewsSwitcher 應顯示「21 模組」徽章且全面改用 lucide-react SVG 圖示 (零 Emoji)', () => {
      const html = renderToStaticMarkup(
        React.createElement(TaskViewsSwitcher, {
          activeTab: 'TASK_1_COMPREHENSIVE',
          onChangeTab: () => { },
        })
      );

      expect(html).toContain('21 模組');
      expect(html).not.toContain('18 卡片');
      expect(html).toContain('<svg');
      expect(html).not.toContain('📊');
      expect(html).not.toContain('⚠️');
      expect(html).not.toContain('📈');
      expect(html).not.toContain('📉');
      expect(html).not.toContain('📑');
    });

    it('HeaderExportBar 與 AiForceDashboardView 應渲染零 Emoji SVG 圖示、4 大戰術區標題 (ZONE 01 ~ ZONE 04) 與首屏決策摘要帶', () => {
      const exportHtml = renderToStaticMarkup(
        React.createElement(HeaderExportBar, {
          report: readyReport,
          onOpenDeepDive: () => { },
        })
      );

      expect(exportHtml).toContain('<svg');
      expect(exportHtml).not.toContain('⬇');
      expect(exportHtml).not.toContain('🖨️');
      expect(exportHtml).not.toContain('🔍');

      const reportWithXai = {
        ...readyReport,
        decisionCore: {
          ...readyReport.decisionCore,
          xaiExplanation: '外資連買且站上 20 日均線，短線動能偏多。',
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(AiForceDashboardView, {
          initialSymbol: '2330',
          initialMarket: 'TW',
          initialReport: reportWithXai,
        })
      );

      expect(html).toContain('ZONE 01');
      expect(html).toContain('ZONE 02');
      expect(html).toContain('ZONE 03');
      expect(html).toContain('ZONE 04');
      expect(html).toContain('data-testid="executive-verdict-strip"');
      expect(html).toContain(reportWithXai.mainForceVerdict.primaryVerb);
      expect(html).toContain('外資連買且站上 20 日均線，短線動能偏多。');
    });
  });

  describe('Ticket 06: 戰情室字級底線、對比度與 Layer 6 / DayTradeRate 補齊驗收', () => {
    it('應匯出 WAR_ROOM_TYPOGRAPHY_FLOOR 規範常數', () => {
      expect(WAR_ROOM_TYPOGRAPHY_FLOOR).toEqual({
        captionMinRem: '0.75rem',
        labelMinRem: '0.8125rem',
        bodyMinRem: '0.875rem',
        kpiMinRem: '1.125rem',
        minContrastSecondary: '#94a3b8',
      });
    });

    it('Layer 6 (6-energy-sentiment) 應採用 minmax(440px, 1fr) 響應式網格且不再使用 260px', () => {
      const html = renderToStaticMarkup(
        React.createElement(AiForceDashboardView, {
          initialSymbol: '2330',
          initialMarket: 'TW',
          initialReport: readyReport,
        })
      );

      expect(html).toContain('data-layer="6-energy-sentiment"');
      expect(html).toContain('minmax(440px, 1fr)');
      expect(html).not.toContain('minmax(260px, 1fr)');
    });

    it('View 與頂部模組 (AiForceDashboardView / HeaderMarketBar / HeaderExportBar / TaskViewsSwitcher / WarRoomPromptCard) 不得含 #64748b 與 < 12px / < 0.75rem 微字級', () => {
      const files = [
        'AiForceDashboardView.tsx',
        'HeaderMarketBar.tsx',
        'HeaderExportBar.tsx',
        'TaskViewsSwitcher.tsx',
        'WarRoomPromptCard.tsx',
      ];
      // @ts-expect-error 測試環境使用 Node __dirname
      const baseDir = path.resolve(__dirname);
      for (const file of files) {
        const src = fs.readFileSync(path.join(baseDir, file), 'utf-8');
        expect(src, `${file} 不應含 #64748b`).not.toMatch(/#64748b/i);

        const pxMatches = [...src.matchAll(/fontSize:\s*['"](\d+(?:\.\d+)?)px['"]/g)];
        for (const m of pxMatches) {
          expect(Number(m[1]), `${file} 發現過小 px 字級: ${m[0]}`).toBeGreaterThanOrEqual(12);
        }

        const remMatches = [...src.matchAll(/fontSize:\s*['"](\d+(?:\.\d+)?)rem['"]/g)];
        for (const m of remMatches) {
          expect(Number(m[1]), `${file} 發現過小 rem 字級: ${m[0]}`).toBeGreaterThanOrEqual(0.75);
        }
      }
    });

    it('AiForceDashboardView 應包含 lakehouseData.dayTradeRate !== undefined 判斷條件', () => {
      // @ts-expect-error 測試環境使用 Node __dirname
      const src = fs.readFileSync(path.resolve(__dirname, 'AiForceDashboardView.tsx'), 'utf-8');
      expect(src).toContain('lakehouseData.dayTradeRate !== undefined');
    });
  });
});

