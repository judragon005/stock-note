import { describe, it, expect } from 'vitest';
import {
  generateCanvasSnapshotConfig,
  renderSnapshotCardData,
} from './dashboardCanvasExporter';
import { AiForceDashboardReport } from '../types/aiForceDashboard';
import { InvestmentMemoRecord } from '../types/equityDeepDive';

describe('dashboardCanvasExporter - 純前端原生 Canvas 快照匯出 (Ticket 18, 19)', () => {
  const mockReport: Partial<AiForceDashboardReport> = {
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    marketBar: {
      currentPrice: 985,
      change: 15,
      changePercent: 1.55,
      marketStatusTag: 'DISPOSITION',
      currency: 'TWD',
      volumeUnit: '張',
      latestTradingDate: '2026-09-30',
    } as any,
    mainForceVerdict: {
      primaryVerb: '積極吸籌',
      fullVerdictText: '外資投信同步站在買方，突破箱體上緣',
    } as any,
  };

  const mockMemo: Partial<InvestmentMemoRecord> = {
    buyReason: '先進製程與 AI 晶片壟斷優勢',
    targetPrice: 1200,
    stopLossPrice: 900,
    trackingMetrics: ['月營收年增率', '毛利率 > 53%'],
  };

  it('Ticket 18: generateCanvasSnapshotConfig 應產出 1920x1080 規格之排版設定', () => {
    const config = generateCanvasSnapshotConfig(mockReport as AiForceDashboardReport, mockMemo as InvestmentMemoRecord);
    expect(config.width).toBe(1920);
    expect(config.height).toBe(1080);
    expect(config.title).toContain('台積電 (2330)');
    expect(config.priceText).toContain('985');
  });

  it('Ticket 19: renderSnapshotCardData 應包含處置 Badge 與 7 步投資筆記資訊', () => {
    const cardData = renderSnapshotCardData(mockReport as AiForceDashboardReport, mockMemo as InvestmentMemoRecord);
    expect(cardData.statusTag).toBe('DISPOSITION');
    expect(cardData.statusBadgeText).toContain('處置股票');
    expect(cardData.memoSection.targetPriceText).toContain('1200');
    expect(cardData.memoSection.stopLossPriceText).toContain('900');
    expect(cardData.memoSection.buyReasonText).toContain('先進製程');
  });
});
