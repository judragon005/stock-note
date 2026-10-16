import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarketScheduleHubSection } from './MarketScheduleHubSection';

describe('Spec 0190 / Ticket 12: 前端市場即時營業狀態徽章渲染測試', () => {
  it('MarketScheduleHubSection 應包含 tw-market-status-badge 與 us-market-status-badge 節點', () => {
    const html = renderToStaticMarkup(<MarketScheduleHubSection />);
    expect(html).toContain('data-testid="tw-market-status-badge"');
    expect(html).toContain('data-testid="us-market-status-badge"');
  });
});
