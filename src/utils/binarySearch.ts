export interface CandleDateClose {
  date: string;
  close: number;
}

/**
 * 在依日期升序排序的日 K 線陣列中，以二元搜尋尋找小於或等於目標日期的最新交易日收盤價。
 * 時間複雜度：O(log N)，空間複雜度：O(1)，零陣列拷貝與反轉。
 *
 * @param candles 升序排序的日 K 線陣列 (具備 date 與 close 屬性)
 * @param targetDate 目標日期字串 (YYYY-MM-DD)
 * @returns 收盤價數值；若無符合或無日 K 線則回傳 null
 */
export function findLatestCloseBeforeDate(
  candles: CandleDateClose[] | undefined | null,
  targetDate: string
): number | null {
  if (!candles || candles.length === 0) {
    return null;
  }

  // 邊界防禦：早於首日則無可用收盤價
  if (targetDate < candles[0].date) {
    return null;
  }

  // 邊界快速通道：晚於或等於最後一日直接取最新收盤價
  const lastIndex = candles.length - 1;
  if (targetDate >= candles[lastIndex].date) {
    return candles[lastIndex].close;
  }

  let low = 0;
  let high = lastIndex;
  let bestIndex = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (candles[mid].date <= targetDate) {
      bestIndex = mid;
      low = mid + 1; // 嘗試向右尋找更接近目標日期的交易日
    } else {
      high = mid - 1;
    }
  }

  return bestIndex !== -1 ? candles[bestIndex].close : null;
}
