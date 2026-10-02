import { describe, it, expect, vi } from 'vitest';
import { generateAiForceReportFromCandles } from '../../engine/aiForceDashboardEngine';
import * as marketCacheLoader from '../../engine/marketCacheLoader';

describe('Ticket 04: AI 主力戰情室處置與注意徽章真實端到端連動驗收 (E2E Verification)', () => {
  it('當處置股票載入時，Report 的 marketStatusTag 應為 DISPOSITION 且幣別單位正確', async () => {
    vi.spyOn(marketCacheLoader, 'loadSymbolDispositionStatus').mockResolvedValue('DISPOSITION');

    const statusTag = await marketCacheLoader.loadSymbolDispositionStatus('2330', 'TW');
    expect(statusTag).toBe('DISPOSITION');

    const mockCandles = [
      { date: '2026-09-29', open: 980, high: 990, low: 975, close: 985, volume: 30000 },
      { date: '2026-09-30', open: 985, high: 995, low: 980, close: 990, volume: 35000 },
    ];

    const report = generateAiForceReportFromCandles(
      '2330',
      '台積電',
      'TW',
      mockCandles,
      undefined,
      undefined,
      undefined,
      {
        statusTag,
        currency: 'TWD',
        volumeUnit: '張',
      }
    );

    expect(report.marketBar.marketStatusTag).toBe('DISPOSITION');
    expect(report.marketBar.currency).toBe('TWD');
    expect(report.marketBar.volumeUnit).toBe('張');
  });

  it('當注意股票載入時，Report 的 marketStatusTag 應為 ATTENTION', async () => {
    vi.spyOn(marketCacheLoader, 'loadSymbolDispositionStatus').mockResolvedValue('ATTENTION');

    const statusTag = await marketCacheLoader.loadSymbolDispositionStatus('2603', 'TW');
    expect(statusTag).toBe('ATTENTION');

    const mockCandles = [
      { date: '2026-09-30', open: 180, high: 185, low: 178, close: 182, volume: 50000 },
    ];

    const report = generateAiForceReportFromCandles(
      '2603',
      '長榮',
      'TW',
      mockCandles,
      undefined,
      undefined,
      undefined,
      {
        statusTag,
        currency: 'TWD',
        volumeUnit: '張',
      }
    );

    expect(report.marketBar.marketStatusTag).toBe('ATTENTION');
  });

  it('美股或正常股票時，marketStatusTag 為 NORMAL，無警示', async () => {
    vi.spyOn(marketCacheLoader, 'loadSymbolDispositionStatus').mockResolvedValue('NORMAL');

    const statusTag = await marketCacheLoader.loadSymbolDispositionStatus('NVDA', 'US');
    expect(statusTag).toBe('NORMAL');

    const mockCandles = [
      { date: '2026-09-30', open: 120, high: 125, low: 119, close: 124, volume: 8000000 },
    ];

    const report = generateAiForceReportFromCandles(
      'NVDA',
      '輝達',
      'US',
      mockCandles,
      undefined,
      undefined,
      undefined,
      {
        statusTag,
        currency: 'USD',
        volumeUnit: '股',
      }
    );

    expect(report.marketBar.marketStatusTag).toBe('NORMAL');
  });
});
