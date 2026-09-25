import { describe, it, expect } from 'vitest';
import { createDefaultAiForceReport } from './aiForceDashboardEngine';
import type { AiForceDashboardReport } from '../types/aiForceDashboard';

describe('aiForceDashboardEngine - Foundation & Contract', () => {
  it('should initialize a valid default AiForceDashboardReport for a given symbol', () => {
    const report: AiForceDashboardReport = createDefaultAiForceReport('2360', '致茂', 'TW');

    expect(report.symbol).toBe('2360');
    expect(report.name).toBe('致茂');
    expect(report.market).toBe('TW');

    // 檢查頂部行情 Bar
    expect(report.marketBar).toBeDefined();
    expect(report.marketBar.currentPrice).toBeGreaterThanOrEqual(0);
    expect(report.marketBar.statusBadges.aiScanActive).toBe(true);
    expect(report.marketBar.statusBadges.mainForceTracking).toBe(true);

    // 檢查 18 個模組 payload 均完整存在
    expect(report.klineSystem).toBeDefined();
    expect(report.decisionCore).toBeDefined();
    expect(report.multiDimensionRadar).toBeDefined();
    expect(report.volumeProfile).toBeDefined();
    expect(report.riskSpider).toBeDefined();
    expect(report.forecastCone).toBeDefined();
    expect(report.vwapCostStructure).toBeDefined();
    expect(report.institutionalFlow).toBeDefined();
    expect(report.dayTradeRisk).toBeDefined();
    expect(report.bullBearEnergy).toBeDefined();
    expect(report.healthSummary).toBeDefined();
    expect(report.dynamicSignals).toBeDefined();
    expect(report.marketSentiment).toBeDefined();
    expect(report.aiConfidence).toBeDefined();
    expect(report.chipsSummary).toBeDefined();
    expect(report.forceDistribution).toBeDefined();
    expect(report.bullBearStrength).toBeDefined();
    expect(report.mainForceVerdict).toBeDefined();

    // 檢查底部任務標籤
    expect(report.activeTaskTab).toBe('TASK_1_COMPREHENSIVE');
  });
});
