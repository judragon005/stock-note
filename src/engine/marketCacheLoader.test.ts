import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadMarketCacheSummary,
  syncMarketCacheToIndexedDB,
  MarketCacheSummary,
} from './marketCacheLoader';
import * as db from '../utils/db';

describe('MarketCacheLoader (前端快取秒讀與 IndexedDB 沉澱引擎)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('當本地快取存在時，應能迅速讀取並解析快取數據 (0 網路延遲秒讀)', async () => {
    const mockSummary: MarketCacheSummary = {
      date: '2026-09-15',
      updatedAt: 1789450000000,
      market: 'TW',
      totalSymbols: 2,
      durationMs: 1500,
      stocks: {
        '2330': {
          symbol: '2330',
          name: '台積電',
          date: '2026-09-15',
          quote: { date: '2026-09-15', open: 1000, high: 1020, low: 995, close: 1015, volume: 45000000 },
          chips: { foreignNetShares: 5000, trustNetShares: 1500, dealerNetShares: -500, totalNetShares: 6000 },
          indicator: {
            date: '2026-09-15',
            close: 1015,
            ma: { ma5: 1010, ma20: 990, ma60: 950 },
            maDeduction: { ma20Slope: 'UP', isBottomPenetrationRebound: false },
            box: { boxStatus: 'INSIDE_BOX' },
            bbands: { upper: 1050, mid: 1000, lower: 950, bandwidth: 10, isSqueeze: false },
            atr: { atr14: 15, trailingDefensePrice: 975 },
            momentum: { rs10Score: 70, rsRank: 'STRONG' },
          },
        },
      },
    };

    // 模擬 fetch 回傳成功
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSummary,
    });

    const result = await loadMarketCacheSummary('TW');
    expect(result).toBeDefined();
    expect(result?.totalSymbols).toBe(2);
    expect(result?.stocks['2330'].quote?.close).toBe(1015);
  });

  it('若快取檔案不存在 (404)，應安全返回 null 而不中斷應用', async () => {
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await loadMarketCacheSummary('TW');
    expect(result).toBeNull();
  });

  it('syncMarketCacheToIndexedDB 應能將快取中的日 K 與指標批量沉澱至 IndexedDB', async () => {
    const saveOhlcvSpy = vi.spyOn(db, 'saveSymbolOhlcv').mockResolvedValue();
    const saveIndicatorsSpy = vi.spyOn(db, 'saveSymbolIndicators').mockResolvedValue();

    const mockSummary: MarketCacheSummary = {
      date: '2026-09-15',
      updatedAt: Date.now(),
      market: 'TW',
      totalSymbols: 1,
      durationMs: 100,
      stocks: {
        '2330': {
          symbol: '2330',
          name: '台積電',
          date: '2026-09-15',
          quote: { date: '2026-09-15', open: 1000, high: 1020, low: 995, close: 1015, volume: 45000000 },
          indicator: {
            date: '2026-09-15',
            close: 1015,
            ma: { ma5: 1010, ma20: 990, ma60: 950 },
            maDeduction: { ma20Slope: 'UP', isBottomPenetrationRebound: false },
            box: { boxStatus: 'INSIDE_BOX' },
            bbands: { upper: 1050, mid: 1000, lower: 950, bandwidth: 10, isSqueeze: false },
            atr: { atr14: 15, trailingDefensePrice: 975 },
            momentum: { rs10Score: 70, rsRank: 'STRONG' },
          },
        },
      },
    };

    await syncMarketCacheToIndexedDB(mockSummary);
    expect(saveOhlcvSpy).toHaveBeenCalledWith(expect.objectContaining({ symbol: '2330', market: 'TW' }));
    expect(saveIndicatorsSpy).toHaveBeenCalledWith(expect.objectContaining({ symbol: '2330', market: 'TW' }));
  });
});
