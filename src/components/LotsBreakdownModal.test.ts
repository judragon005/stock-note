import { describe, it, expect } from 'vitest';
import { TaxLot } from '../types/lot';

// 測試 LotsBreakdownModal 內部的核心排序、長短期標籤與年份過濾純函數輔助器
export type SortField = 'buyDate' | 'remainingShares' | 'buyPrice' | 'unitCost' | 'unrealizedPnL' | 'holdingDays';
export type SortDirection = 'asc' | 'desc';

export interface LotWithMetrics extends TaxLot {
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  holdingDays: number;
  isLongTerm: boolean;
}

export function enrichLotMetrics(lot: TaxLot, currentPrice: number, asOfDateStr: string = '2026-08-28'): LotWithMetrics {
  const marketVal = lot.remainingShares * currentPrice;
  const unrealizedPnL = marketVal - lot.totalCostBasis;
  const unrealizedPnLPercent = lot.totalCostBasis > 0 ? (unrealizedPnL / lot.totalCostBasis) * 100 : 0;

  const buyDate = new Date(`${lot.buyDate}T00:00:00Z`);
  const asOf = new Date(`${asOfDateStr}T00:00:00Z`);
  const holdingDays = Math.max(0, Math.round((asOf.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)));
  const isLongTerm = holdingDays >= 365;

  return {
    ...lot,
    unrealizedPnL,
    unrealizedPnLPercent,
    holdingDays,
    isLongTerm,
  };
}

export function sortLots(lots: LotWithMetrics[], field: SortField, direction: SortDirection): LotWithMetrics[] {
  return [...lots].sort((a, b) => {
    let comparison = 0;
    if (field === 'buyDate') {
      comparison = a.buyDate.localeCompare(b.buyDate);
    } else {
      comparison = (a[field] as number) - (b[field] as number);
    }
    return direction === 'asc' ? comparison : -comparison;
  });
}

export function filterLotsByYear(lots: LotWithMetrics[], selectedYear: string): LotWithMetrics[] {
  if (!selectedYear || selectedYear === 'ALL') return lots;
  return lots.filter((lot) => lot.buyDate.startsWith(selectedYear));
}

export function getAvailableYears(lots: TaxLot[]): string[] {
  const years = Array.from(new Set(lots.map((l) => l.buyDate.slice(0, 4))));
  return years.sort((a, b) => b.localeCompare(a));
}

describe('LotsBreakdownModal 批次明細量化與排序輔助器測試', () => {
  const mockLots: TaxLot[] = [
    {
      id: 'lot-1',
      buyTradeId: 't-1',
      symbol: '2886',
      market: 'TW',
      currency: 'TWD',
      buyDate: '2024-04-24',
      buyPrice: 39.55,
      unitCost: 38.45,
      originalShares: 150,
      remainingShares: 150,
      fee: 0,
      totalCostBasis: 5767.5,
      createdAt: 1000,
    },
    {
      id: 'lot-2',
      buyTradeId: 't-2',
      symbol: '2886',
      market: 'TW',
      currency: 'TWD',
      buyDate: '2026-08-07',
      buyPrice: 51.0,
      unitCost: 51.07,
      originalShares: 10000,
      remainingShares: 10000,
      fee: 0,
      totalCostBasis: 510700,
      createdAt: 2000,
    },
    {
      id: 'lot-3',
      buyTradeId: 't-3',
      symbol: '2886',
      market: 'TW',
      currency: 'TWD',
      buyDate: '2026-08-13',
      buyPrice: 45.0,
      unitCost: 45.06,
      originalShares: 5000,
      remainingShares: 5000,
      fee: 0,
      totalCostBasis: 225300,
      createdAt: 3000,
    },
  ];

  const currentPrice = 46.15;
  const enrichedLots = mockLots.map((l) => enrichLotMetrics(l, currentPrice, '2026-08-28'));

  it('應精確計算持有天數與長短期標籤 (>=365 天為長期)', () => {
    // 2024-04-24 距離 2026-08-28 > 800 天 ➔ 長期
    expect(enrichedLots[0].isLongTerm).toBe(true);
    expect(enrichedLots[0].holdingDays).toBeGreaterThan(365);

    // 2026-08-07 距離 2026-08-28 21 天 ➔ 短期
    expect(enrichedLots[1].isLongTerm).toBe(false);
    expect(enrichedLots[1].holdingDays).toBe(21);
  });

  it('應支援依未實現損益 (unrealizedPnL) 降冪排序', () => {
    const sorted = sortLots(enrichedLots, 'unrealizedPnL', 'desc');
    // lot-3 (+5,450) > lot-1 (+1,155) > lot-2 (-49,200)
    expect(sorted[0].id).toBe('lot-3');
    expect(sorted[1].id).toBe('lot-1');
    expect(sorted[2].id).toBe('lot-2');
  });

  it('應支援依買進日期 (buyDate) 升冪排序', () => {
    const sorted = sortLots(enrichedLots, 'buyDate', 'asc');
    expect(sorted[0].buyDate).toBe('2024-04-24');
    expect(sorted[1].buyDate).toBe('2026-08-07');
    expect(sorted[2].buyDate).toBe('2026-08-13');
  });

  it('應能正確提取可用年份並過濾指定年份批次', () => {
    const years = getAvailableYears(mockLots);
    expect(years).toEqual(['2026', '2024']);

    const filtered2024 = filterLotsByYear(enrichedLots, '2024');
    expect(filtered2024.length).toBe(1);
    expect(filtered2024[0].id).toBe('lot-1');

    const filtered2026 = filterLotsByYear(enrichedLots, '2026');
    expect(filtered2026.length).toBe(2);

    const filteredAll = filterLotsByYear(enrichedLots, 'ALL');
    expect(filteredAll.length).toBe(3);
  });
});
