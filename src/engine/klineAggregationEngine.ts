import { KlineCandleItem } from '../types/aiForceDashboard';

export type KlineTimeframe = 'DAY' | 'WEEK' | 'MONTH';

/**
 * 計算日期的週識別碼 (以所屬週之星期一的 YYYY-MM-DD 作為唯一識別)
 * 完美支援跨年、跨月邊界之自然週對齊
 */
export function getWeekIdentifier(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(Date.UTC(year, month, day));
  const dayOfWeek = d.getUTCDay(); // 0: 日, 1: 一, ..., 6: 六

  // 計算該週週一 (若為週日則往回推 6 天，其餘推 dayOfWeek - 1 天)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + mondayOffset);

  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * 計算移動平均線 (MA5, MA10, MA20, MA60, MA250)
 */
export function calculateKlineMovingAverages(candles: KlineCandleItem[]): KlineCandleItem[] {
  if (!candles || candles.length === 0) return [];

  const calcMa = (endIdx: number, period: number): number | undefined => {
    if (endIdx + 1 < period) return undefined;
    let sum = 0;
    for (let i = endIdx - period + 1; i <= endIdx; i++) {
      sum += candles[i].close;
    }
    return Number((sum / period).toFixed(2));
  };

  return candles.map((item, idx) => ({
    ...item,
    ma5: calcMa(idx, 5),
    ma10: calcMa(idx, 10),
    ma20: calcMa(idx, 20),
    ma60: calcMa(idx, 60),
    ma250: calcMa(idx, 250),
  }));
}

/**
 * 聚合日 K 蠟燭數列為週 K 或月 K
 * 
 * 聚合規則：
 * - 開盤價 (Open)：取該週期第一根之開盤價
 * - 收盤價 (Close)：取該週期最後一根之收盤價
 * - 最高價 (High)：取該週期所有日 K 之最高價最大值
 * - 最低價 (Low)：取該週期所有日 K 之最低價最小值
 * - 成交量 (Volume)：加總該週期所有日 K 成交量
 * - 日期 (Date)：取該週期最後一個有效交易日
 * - 自動依據聚合後的蠟燭重新計算 MA5, MA10, MA20, MA60, MA250
 */
export function aggregateCandlesToTimeframe(
  candles: KlineCandleItem[] | undefined,
  timeframe: KlineTimeframe = 'DAY'
): KlineCandleItem[] {
  if (!candles || candles.length === 0) {
    return [];
  }

  // 確保依日期升冪排序
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));

  if (timeframe === 'DAY') {
    return calculateKlineMovingAverages(sorted);
  }

  // 依週期分組
  const groups: KlineCandleItem[][] = [];
  let currentGroup: KlineCandleItem[] = [];
  let currentKey = '';

  for (const c of sorted) {
    let key = '';
    if (timeframe === 'WEEK') {
      key = getWeekIdentifier(c.date);
    } else if (timeframe === 'MONTH') {
      key = c.date.slice(0, 7); // YYYY-MM
    }

    if (key !== currentKey) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [c];
      currentKey = key;
    } else {
      currentGroup.push(c);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // 聚合各組
  const aggregated: KlineCandleItem[] = groups.map((grp) => {
    const first = grp[0];
    const last = grp[grp.length - 1];

    let high = -Infinity;
    let low = Infinity;
    let volume = 0;

    for (const item of grp) {
      if (item.high > high) high = item.high;
      if (item.low < low) low = item.low;
      volume += item.volume;
    }

    return {
      date: last.date,
      open: first.open,
      close: last.close,
      high,
      low,
      volume,
    };
  });

  return calculateKlineMovingAverages(aggregated);
}
