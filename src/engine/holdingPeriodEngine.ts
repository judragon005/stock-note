import { TaxLot } from '../types/lot';
import {
  HoldingPeriodCategory,
  HoldingPeriodCategoryInfo,
  HoldingPeriodMetrics,
} from '../types/holdingPeriod';

/**
 * 取得週期分類的繁中標籤、顏色與說明
 */
export function getHoldingPeriodCategoryInfo(category: HoldingPeriodCategory): HoldingPeriodCategoryInfo {
  switch (category) {
    case 'ULTRA_SHORT':
      return {
        category: 'ULTRA_SHORT',
        label: '⚡ 超短線 (<7天)',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700',
        description: '持有未滿 7 天，為超短線快速週轉部位。',
      };
    case 'SHORT_TERM':
      return {
        category: 'SHORT_TERM',
        label: '🚀 短線波段 (7~30天)',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        description: '持有 7 至 30 天，為標準短線動能與波段交易部位。',
      };
    case 'MEDIUM_TERM':
      return {
        category: 'MEDIUM_TERM',
        label: '📈 中期波段 (1~6月)',
        badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
        description: '持有 1 至 6 個月，參與波段趨勢或財報季度行情的部位。',
      };
    case 'LONG_TERM':
      return {
        category: 'LONG_TERM',
        label: '💎 長線存股 (6~12月)',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        description: '持有半年以上之核心存股或長線價值投資部位。',
      };
    case 'TAX_EXEMPT_LONG':
      return {
        category: 'TAX_EXEMPT_LONG',
        label: '🛡️ 稅務長期 (≥1年)',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        description: '持有已滿 365 天，享有美國國稅局 (IRS) 與國際長期資本利得優惠稅率門檻。',
      };
  }
}

/**
 * 計算兩日期之間的自然日天數差
 */
function diffDays(fromDateStr: string, toDateStr: string): number {
  if (!fromDateStr || !toDateStr) return 0;
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  const diffTime = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * 計算單一標的之加權平均持股天數與週期標籤 (Weighted Holding Period Engine)
 */
export function calculateHoldingPeriodMetrics(
  lots: TaxLot[],
  symbol: string,
  asOfDateStr: string = new Date().toISOString().split('T')[0]
): HoldingPeriodMetrics {
  const activeLots = lots.filter((lot) => lot.remainingShares > 0);

  if (activeLots.length === 0) {
    const categoryInfo = getHoldingPeriodCategoryInfo('ULTRA_SHORT');
    return {
      symbol,
      weightedHoldingDays: 0,
      firstBuyDate: '',
      latestBuyDate: '',
      category: 'ULTRA_SHORT',
      categoryInfo,
      isTaxExemptEligible: false,
      activeLotsCount: 0,
    };
  }

  let totalWeightedDayCost = 0;
  let totalCostSum = 0;
  let firstBuyDate = activeLots[0].buyDate;
  let latestBuyDate = activeLots[0].buyDate;

  for (const lot of activeLots) {
    const holdingDays = diffDays(lot.buyDate, asOfDateStr);
    const cost = lot.totalCostBasis || (lot.remainingShares * lot.unitCost);
    totalWeightedDayCost += holdingDays * cost;
    totalCostSum += cost;

    if (lot.buyDate < firstBuyDate) firstBuyDate = lot.buyDate;
    if (lot.buyDate > latestBuyDate) latestBuyDate = lot.buyDate;
  }

  const weightedHoldingDays = totalCostSum > 0 ? Math.round(totalWeightedDayCost / totalCostSum) : 0;

  // 週期分類判定
  let category: HoldingPeriodCategory = 'ULTRA_SHORT';
  if (weightedHoldingDays >= 365) {
    category = 'TAX_EXEMPT_LONG';
  } else if (weightedHoldingDays > 180) {
    category = 'LONG_TERM';
  } else if (weightedHoldingDays > 30) {
    category = 'MEDIUM_TERM';
  } else if (weightedHoldingDays >= 7) {
    category = 'SHORT_TERM';
  } else {
    category = 'ULTRA_SHORT';
  }

  const categoryInfo = getHoldingPeriodCategoryInfo(category);
  const isTaxExemptEligible = weightedHoldingDays >= 365;

  return {
    symbol,
    weightedHoldingDays,
    firstBuyDate,
    latestBuyDate,
    category,
    categoryInfo,
    isTaxExemptEligible,
    activeLotsCount: activeLots.length,
  };
}
