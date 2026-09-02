import { TradeRecord, MarketType } from '../types/stock';
import { ReceivableDividend, DividendSummaryReport } from '../types/dividend';
import { resolveEffectiveDividendTaxAndNet } from './taxComplianceEngine';

/**
 * 彙整全歷史與指定年度之股利成長報告、月度現金流與標的貢獻榜 (支援全歷史 vs 當年度切換)
 */
export function aggregateDividendReport(
  trades: TradeRecord[],
  receivableDividends: ReceivableDividend[] = [],
  selectedYear: number = new Date().getFullYear(),
  exchangeRate: number = 32.0,
  currentDateStr: string = new Date().toISOString().split('T')[0]
): DividendSummaryReport {
  const dividendTrades = trades.filter((t) => t.type === 'DIVIDEND');

  let totalHistoricalDividendsTWD = 0;
  let currentYearDividendsTWD = 0;
  let previousYearDividendsTWD = 0;

  const currentYearStr = String(selectedYear);
  const previousYearStr = String(selectedYear - 1);

  // 初始化 12 個月分佈
  const monthlyData: {
    monthKey: string;
    monthLabel: string;
    grossTWD: number;
    netTWD: number;
    taxTWD: number;
    count: number;
  }[] = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const monthFormatted = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    return {
      monthKey: `${selectedYear}-${monthFormatted}`,
      monthLabel: `${monthNum}月`,
      grossTWD: 0,
      netTWD: 0,
      taxTWD: 0,
      count: 0,
    };
  });

  const allTimeContributorMap = new Map<string, { symbol: string; name: string; market: MarketType; totalDividendsTWD: number }>();
  const currentYearContributorMap = new Map<string, { symbol: string; name: string; market: MarketType; totalDividendsTWD: number }>();

  for (const trade of dividendTrades) {
    const res = resolveEffectiveDividendTaxAndNet(trade, trades);
    const rawGross = res.gross;
    const net = res.netCash;

    const grossTWD = trade.currency === 'USD' ? Math.round(rawGross * exchangeRate) : Math.round(rawGross);
    const netTWD = trade.currency === 'USD' ? Math.round(net * exchangeRate) : Math.round(net);
    const taxTWD = grossTWD - netTWD;

    // 全歷史累計（僅計入已實質到期入帳者）
    if (trade.date <= currentDateStr) {
      totalHistoricalDividendsTWD += netTWD;
    }

    // 全歷史標的貢獻度統計
    const symbolKey = trade.symbol.toUpperCase();
    const existingAll = allTimeContributorMap.get(symbolKey) || {
      symbol: trade.symbol,
      name: trade.name || trade.symbol,
      market: trade.market,
      totalDividendsTWD: 0,
    };
    existingAll.totalDividendsTWD += netTWD;
    allTimeContributorMap.set(symbolKey, existingAll);

    // 指定年度統計與月份分佈
    if (trade.date.startsWith(currentYearStr)) {
      // 只有在已入帳時才算入實領股息
      if (trade.date <= currentDateStr) {
        currentYearDividendsTWD += netTWD;
      }

      // 當年度個股貢獻度統計
      const existingYear = currentYearContributorMap.get(symbolKey) || {
        symbol: trade.symbol,
        name: trade.name || trade.symbol,
        market: trade.market,
        totalDividendsTWD: 0,
      };
      existingYear.totalDividendsTWD += netTWD;
      currentYearContributorMap.set(symbolKey, existingYear);

      // 月份分佈 (1~12月，包含當年度所有月份)
      const monthPart = parseInt(trade.date.substring(5, 7), 10);
      if (monthPart >= 1 && monthPart <= 12) {
        const targetMonth = monthlyData[monthPart - 1];
        targetMonth.grossTWD += grossTWD;
        targetMonth.netTWD += netTWD;
        targetMonth.taxTWD += taxTWD;
        targetMonth.count += 1;
      }
    } else if (trade.date.startsWith(previousYearStr) && trade.date <= currentDateStr) {
      previousYearDividendsTWD += netTWD;
    }
  }

  // YoY 成長率
  const yoyGrowthPercent = previousYearDividendsTWD > 0
    ? ((currentYearDividendsTWD - previousYearDividendsTWD) / previousYearDividendsTWD) * 100
    : currentYearDividendsTWD > 0 ? 100 : 0;

  // 近 12 個月滾動統計
  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
  const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0];

  let trailing12mDividendsTWD = 0;
  for (const trade of dividendTrades) {
    if (trade.date >= twelveMonthsAgoStr && trade.date <= currentDateStr) {
      const rawGross = trade.shares * trade.price;
      const tax = trade.tax || 0;
      const net = Math.max(0, rawGross - tax);
      trailing12mDividendsTWD += trade.currency === 'USD' ? Math.round(net * exchangeRate) : Math.round(net);
    }
  }

  // 全歷史 Top 貢獻榜
  const topDividendContributors = Array.from(allTimeContributorMap.values())
    .sort((a, b) => b.totalDividendsTWD - a.totalDividendsTWD)
    .map((c) => ({
      ...c,
      percentageOfTotal: totalHistoricalDividendsTWD > 0
        ? Number(((c.totalDividendsTWD / totalHistoricalDividendsTWD) * 100).toFixed(1))
        : 0,
    }));

  // 當年度 Top 貢獻榜
  const currentYearTotalForRank = currentYearDividendsTWD > 0
    ? currentYearDividendsTWD
    : Array.from(currentYearContributorMap.values()).reduce((sum, c) => sum + c.totalDividendsTWD, 0);

  const currentYearTopContributors = Array.from(currentYearContributorMap.values())
    .sort((a, b) => b.totalDividendsTWD - a.totalDividendsTWD)
    .map((c) => ({
      ...c,
      percentageOfTotal: currentYearTotalForRank > 0
        ? Number(((c.totalDividendsTWD / currentYearTotalForRank) * 100).toFixed(1))
        : 0,
    }));

  return {
    totalHistoricalDividendsTWD,
    currentYearDividendsTWD,
    previousYearDividendsTWD,
    yoyGrowthPercent: Number(yoyGrowthPercent.toFixed(2)),
    trailing12mDividendsTWD,
    monthlyDistribution: monthlyData,
    topDividendContributors,
    currentYearTopContributors,
    upcomingDividends: receivableDividends,
  };
}
