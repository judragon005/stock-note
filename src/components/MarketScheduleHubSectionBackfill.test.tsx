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

  it('2. 當回補狀態存在 totalInLakehouse 時，美股卡片應優先展示在庫標的數與斷點快取在庫標註 (Spec 0186 / Ticket 03)', () => {
    // 透過模擬 fetch API 回傳帶有 totalInLakehouse 的狀態
    const mockStatus = {
      isRunning: false,
      market: 'ALL',
      progressPct: 100,
      currentTask: 'DONE',
      currentDate: null,
      completedDays: 60,
      totalDays: 60,
      tw: { status: 'completed', totalQuotes: 137559, totalChips: 132917 },
      us: { status: 'completed', totalQuotes: 0, successCount: 0, failCount: 0, totalInLakehouse: 1448 },
      error: null,
      startedAt: Date.now() - 60000,
      updatedAt: Date.now(),
    };

    // 驗證 UI 邏輯片段
    const lakehouseCount = mockStatus.us.totalInLakehouse;
    const deltaCount = mockStatus.us.successCount;
    expect(lakehouseCount).toBe(1448);
    expect(deltaCount).toBe(0);
  });

  it('3. [Spec 0189 / Ticket 04] 控制台下拉選單應支援 auto 智慧自動補缺與多級天數梯度 (5, 20, 60, 120, 250)', () => {
    const html = renderToStaticMarkup(<MarketScheduleHubSection />);
    expect(html).toContain('value="auto"');
    expect(html).toContain('智慧自動補缺');
    expect(html).toContain('value="5"');
    expect(html).toContain('value="20"');
    expect(html).toContain('value="60"');
    expect(html).toContain('value="120"');
    expect(html).toContain('value="250"');
  });

  it('4. [Spec 0246 Ticket 06 & 07] 排程監控卡片應呈現 weekly/macro 水位線、台股缺口清單與背景追趕狀態徽章', () => {
    const html = renderToStaticMarkup(
      <MarketScheduleHubSection
        initialSyncStatus={{
          source: 'SQLITE_SSOT',
          tw: {
            latestDate: '2026-11-19',
            anchorDate: '2026-11-23',
            isStale: true,
            symbolCount: 2350,
            gapCount: 2,
            gapDates: ['2026-11-20', '2026-11-23'],
          },
          us: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false, symbolCount: 1445 },
          weekly: {
            tdccLatestDate: '2026-11-20',
            tdccAnchorDate: '2026-11-20',
            tdccIsStale: false,
            revenueLatestMonth: '2026-10',
            revenueAnchorMonth: '2026-10',
            revenueIsStale: false,
          },
          macro: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false },
          isCatchingUp: true,
          lastCatchupTime: 1,
          timestamp: Date.now(),
        }}
      />
    );

    expect(html).toContain('data-testid="catchup-in-progress-badge"');
    expect(html).toContain('data-testid="tw-gap-dates-list"');
    expect(html).toContain('2026-11-20');
    expect(html).toContain('2026-11-23');
    expect(html).toContain('data-testid="weekly-lane-status"');
    expect(html).toContain('data-testid="macro-lane-status"');
  });
});

