import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatalystCalendarCard } from './CatalystCalendarCard';
import type { UpcomingCatalyst } from '../../types/macro';

describe('CatalystCalendarCard (Spec 0235 Ticket 08)', () => {
  it('應渲染三段時序雷達、分類篩選，且含代號之除息/法說卡片支援點擊檢視技術面', () => {
    const catalysts: UpcomingCatalyst[] = [
      {
        id: 'tsm-1',
        name: '台積電 (2330) 法說會',
        date: '2026-11-25',
        daysLeft: 7,
        category: 'EARNINGS_DIVIDEND',
        impact: 'HIGH',
        targetMarket: 'TW',
        symbol: '2330.TW',
        description: '毛利率與資本支出展望',
      },
    ];

    const html = renderToStaticMarkup(
      <CatalystCalendarCard
        catalysts={catalysts}
        marketView="GLOBAL"
        onAddCustom={vi.fn()}
        onDeleteCustom={vi.fn()}
        onResetDefaults={vi.fn()}
        onInspectTechnical={vi.fn()}
      />
    );

    expect(html).toContain('關鍵財經催化劑倒數日曆');
    expect(html).toContain('台積電 (2330) 法說會');
    expect(html).toContain('📈 技術面');
  });
});
