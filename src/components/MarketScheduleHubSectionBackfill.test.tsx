import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarketScheduleHubSection } from './MarketScheduleHubSection';

describe('MarketScheduleHubSection - 台美雙軌背景全回補控制台 (Spec 0168 / Ticket 09)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. 應渲染「台美雙軌零 CSV 背景全歷史回補」控制面板與背景回補說明', () => {
    const html = renderToStaticMarkup(<MarketScheduleHubSection />);

    // 必須包含專屬卡片標題
    expect(html).toContain('台美雙軌零 CSV 背景全歷史回補');
    expect(html).toContain('電腦不關機');
    expect(html).toContain('SQLite 斷點續傳');

    // 必須包含啟動按鈕或觸發控制項
    expect(html).toContain('啟動背景全回補');
    expect(html).toContain('250');
  });
});
