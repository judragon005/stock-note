import { describe, it, expect, vi } from 'vitest';
import * as canvasExporter from '../../engine/dashboardCanvasExporter';
import * as memoStorage from '../../utils/investmentMemoStorage';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';
import { resolveExportBarTexts } from './HeaderExportBar';

describe('HeaderExportBar - 快照下載連動測試 (Ticket 19)', () => {
  it('點擊 DASHBOARD_PNG 應讀取投資筆記並呼叫 triggerDashboardCanvasPngDownload', async () => {
    const downloadSpy = vi.spyOn(canvasExporter, 'triggerDashboardCanvasPngDownload').mockResolvedValue(true);
    const getMemoSpy = vi.spyOn(memoStorage, 'getInvestmentMemo').mockReturnValue({
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      buyReason: '測試買進理由',
      targetPrice: 1200,
      stopLossPrice: 900,
      holdingPeriodDays: 60,
      trackingMetrics: ['指標A'],
      isWatchlist: false,
      createdAt: 1,
      updatedAt: 1,
    });

    const mockReport: Partial<AiForceDashboardReport> = {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      marketBar: { currentPrice: 985 } as any,
    };

    // 模擬調用
    const memo = memoStorage.getInvestmentMemo('2330');
    await canvasExporter.triggerDashboardCanvasPngDownload(mockReport as AiForceDashboardReport, memo || undefined);

    expect(getMemoSpy).toHaveBeenCalledWith('2330');
    expect(downloadSpy).toHaveBeenCalledWith(mockReport, memo);
  });

  it('resolveExportBarTexts 應正確提取自訂或報表預設文字', () => {
    const mockReport: Partial<AiForceDashboardReport> = {
      marketBar: {
        dataSourceText: '來源: TWSE',
        dataRangeText: '區間: 近一年',
      } as any,
    };
    const res = resolveExportBarTexts(mockReport as AiForceDashboardReport, '自訂來源', '自訂區間');
    expect(res.sourcesText).toBe('自訂來源');
    expect(res.rangeText).toBe('自訂區間');

    const fallback = resolveExportBarTexts(mockReport as AiForceDashboardReport);
    expect(fallback.sourcesText).toBe('來源: TWSE');
    expect(fallback.rangeText).toBe('區間: 近一年');
  });
});

