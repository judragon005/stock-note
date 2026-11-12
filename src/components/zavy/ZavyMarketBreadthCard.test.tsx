import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZavyMarketBreadthCard } from './ZavyMarketBreadthCard';

describe('ZavyMarketBreadthCard (第二鏡頭市場寬度與融資去槓桿卡片測試)', () => {
  it('[Spec 0223 / Ticket 03] 鏡頭二應掛載 TermTooltip、顯示反恐慌定心丸、十年線防禦錨點、大盤/融資回撤雙膠囊與落底總結指引', () => {
    const html = renderToStaticMarkup(
      <ZavyMarketBreadthCard
        breadth={{
          asOfDate: '2026-11-10',
          market: 'TW',
          breadth20: 16.5,
          breadth60: 38.0,
          breadth200: 55.2,
          totalFilteredStocks: 2333,
        }}
        marginStatus={{
          asOfDate: '2026-11-10',
          indexDrawdownPercent: -8.5,
          marginDrawdownPercent: -12.0,
          marginDeleveragingRatio: 1.41,
          isDeleveragingSufficient: true,
          statusText: '融資減幅超過大盤跌幅，去槓桿清洗充分。',
        }}
        interpretation={{
          breadth20: 16.5,
          breadth60: 38.0,
          breadth200: 55.2,
          isOversoldOpportuneBuy: true,
          is200MaDivergenceInvalidated: false,
          fallbackIndicator: '200MA 寬度長期趨勢過濾',
          interpretationHeadline: '💎 製造業擴張期之波浪回檔黃金買點',
          actionGuidance: '總經大趨勢維持上行，短期 20MA 寬度急速超賣屬於非系統性「漣漪震盪」，勿對漣漪起反應。',
        }}
        bottomingChecklist={{
          checklist: [
            {
              id: 'deleveraging',
              label: '融資去槓桿充分度',
              isSatisfied: true,
              actualValueDescription: '比率 1.41',
              thresholdDescription: '比率 >= 1.0 且融資實質下降',
            },
          ],
          satisfiedCount: 3,
          totalCount: 4,
          bottomingReadinessScore: 75,
          verdict: 'BOTTOM_SIGNAL_CONFIRMED',
          guidanceText: '落底要件已高度齊備，浮額清洗充分且結構超賣，為中期修正之極佳分批佈局點。',
        }}
      />
    );

    expect(html).toContain('term-tooltip-trigger');
    expect(html).toContain('200MA 寬度長期趨勢過濾');
    expect(html).toContain('慢富定心丸');
    expect(html).toContain('大盤回撤 -8.5%');
    expect(html).toContain('融資減幅 -12.0%');
    expect(html).toContain('比率 &gt;= 1.0 且融資實質下降');
    expect(html).toContain('落底要件已高度齊備，浮額清洗充分且結構超賣，為中期修正之極佳分批佈局點。');
  });
});

