import { BenchmarkType } from '../types/stock';
import {
  TW_0050_BENCHMARK_HISTORY,
  TW_TAIEX_BENCHMARK_HISTORY,
  US_SPY_BENCHMARK_HISTORY,
} from './benchmarkConstants';

/**
 * 取得指定基準之歷史每日收盤價字典
 */
export function getBenchmarkDailyPrices(type: BenchmarkType): Record<string, number> {
  switch (type) {
    case 'TAIEX':
      return TW_TAIEX_BENCHMARK_HISTORY;
    case '0050':
      return TW_0050_BENCHMARK_HISTORY;
    case 'SPY':
      return US_SPY_BENCHMARK_HISTORY;
    default:
      return {};
  }
}

/**
 * 將基準價格依照指定的使用者投資組合日期陣列進行對齊與補值 (Forward-fill + Back-fill)
 */
export function alignBenchmarkTimeSeries(
  dates: string[],
  rawPrices: Record<string, number>
): number[] {
  if (!dates || dates.length === 0) {
    return [];
  }

  const sortedAvailableDates = Object.keys(rawPrices)
    .filter((d) => typeof rawPrices[d] === 'number' && rawPrices[d] > 0)
    .sort();

  // 若完全無可用基準價格，預設全填 100
  if (sortedAvailableDates.length === 0) {
    return dates.map(() => 100);
  }

  const firstAvailablePrice = rawPrices[sortedAvailableDates[0]];
  let lastValidPrice: number | undefined = undefined;

  // 尋找第一個有效價格做為起始 Backfill 基準
  for (const d of dates) {
    if (typeof rawPrices[d] === 'number' && rawPrices[d] > 0) {
      lastValidPrice = rawPrices[d];
      break;
    }
  }

  if (lastValidPrice === undefined) {
    lastValidPrice = firstAvailablePrice;
  }

  const result: number[] = [];

  for (const date of dates) {
    if (typeof rawPrices[date] === 'number' && rawPrices[date] > 0) {
      lastValidPrice = rawPrices[date];
    }
    result.push(lastValidPrice);
  }

  return result;
}

/**
 * 將價格序列標準化為以第一天為 100% 的歸一化成長數列 (Normalized to 100)
 */
export function calculateNormalizedGrowth(prices: number[]): number[] {
  if (!prices || prices.length === 0) {
    return [];
  }

  const initialPrice = prices[0] > 0 ? prices[0] : 1;

  return prices.map((p) => {
    if (initialPrice <= 0 || p <= 0) {
      return 100;
    }
    const normalized = (p / initialPrice) * 100;
    return Math.round(normalized * 100) / 100;
  });
}

/**
 * 計算 50% 0050 + 50% SPY 平衡組合之歸一化成長率
 */
export function calculate5050BalancedGrowth(
  growth0050: number[],
  growthSPY: number[]
): number[] {
  const length = Math.max(growth0050.length, growthSPY.length);
  const result: number[] = [];

  for (let i = 0; i < length; i++) {
    const valA = growth0050[i] ?? 100;
    const valB = growthSPY[i] ?? 100;
    const avg = (valA + valB) / 2;
    result.push(Math.round(avg * 100) / 100);
  }

  return result;
}
