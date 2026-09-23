import { TradeRecord, MarketType } from '../types/stock';
import { ReceivableDividend, DividendSummaryReport } from '../types/dividend';
import { resolveEffectiveDividendTaxAndNet } from './taxComplianceEngine';
import { estimatePaymentDate } from './receivableDividendEngine';

/**
 * 全域單一時序事實來源 (SSOT)：解析現金股利交易之實質入帳發放日 (Effective Payment Date)
 * 優先採用交易紀錄明確指定之 payDate；若無則依據市場慣例推估
 */
export function getEffectiveDividendPayDate(trade: TradeRecord): string {
  if (trade.payDate) return trade.payDate;
  const baseDate = trade.exDate || trade.date;
  return estimatePaymentDate(baseDate, trade.market);
}

/**
 * 彙整全歷史與指定年度之股利成長報告、月度現金流與標的貢獻榜 (支援全歷史 vs 當年度切換)
 * 嚴格以「實質入帳發放日 (Payment Date)」為現金流唯一時序核心
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
  let currentYearGrossTWD = 0;
  let currentYearTaxTWD = 0;
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
    const effectivePayDate = getEffectiveDividendPayDate(trade);
    const isSettled = effectivePayDate <= currentDateStr;

    const res = resolveEffectiveDividendTaxAndNet(trade, trades);
    const rawGross = res.gross;
    const net = res.netCash;

    const grossTWD = trade.currency === 'USD' ? Math.round(rawGross * exchangeRate) : Math.round(rawGross);
    const netTWD = trade.currency === 'USD' ? Math.round(net * exchangeRate) : Math.round(net);
    const taxTWD = grossTWD - netTWD;

    const symbolKey = trade.symbol.toUpperCase();

    // 1. 全歷史累計（僅計入已實質到期入帳者）
    if (isSettled) {
      totalHistoricalDividendsTWD += netTWD;

      // 全歷史標的貢獻度統計（僅納入已到期入帳者，確保分子分母口徑同步）
      const existingAll = allTimeContributorMap.get(symbolKey) || {
        symbol: trade.symbol,
        name: trade.name || trade.symbol,
        market: trade.market,
        totalDividendsTWD: 0,
      };
      existingAll.totalDividendsTWD += netTWD;
      allTimeContributorMap.set(symbolKey, existingAll);
    }

    // 2. 指定年度統計與月份分佈（以 effectivePayDate 為唯一歸屬判定）
    if (effectivePayDate.startsWith(currentYearStr)) {
      // 只有在已入帳時才算入實領股息與當年度貢獻榜
      if (isSettled) {
        currentYearDividendsTWD += netTWD;
        currentYearGrossTWD += grossTWD;
        currentYearTaxTWD += taxTWD;

        // 當年度個股貢獻度統計（僅計入已入帳者）
        const existingYear = currentYearContributorMap.get(symbolKey) || {
          symbol: trade.symbol,
          name: trade.name || trade.symbol,
          market: trade.market,
          totalDividendsTWD: 0,
        };
        existingYear.totalDividendsTWD += netTWD;
        currentYearContributorMap.set(symbolKey, existingYear);

        // 月份分佈 (1~12月，依據實質入帳月份歸屬)
        const monthPart = parseInt(effectivePayDate.substring(5, 7), 10);
        if (monthPart >= 1 && monthPart <= 12) {
          const targetMonth = monthlyData[monthPart - 1];
          targetMonth.grossTWD += grossTWD;
          targetMonth.netTWD += netTWD;
          targetMonth.taxTWD += taxTWD;
          targetMonth.count += 1;
        }
      }
    } else if (effectivePayDate.startsWith(previousYearStr) && isSettled) {
      previousYearDividendsTWD += netTWD;
    }
  }

  // YoY 成長率
  const yoyGrowthPercent = previousYearDividendsTWD > 0
    ? ((currentYearDividendsTWD - previousYearDividendsTWD) / previousYearDividendsTWD) * 100
    : currentYearDividendsTWD > 0 ? 100 : 0;

  // 近 12 個月滾動統計 (TTM)
  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
  const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0];

  let trailing12mDividendsTWD = 0;
  for (const trade of dividendTrades) {
    const effectivePayDate = getEffectiveDividendPayDate(trade);
    if (effectivePayDate >= twelveMonthsAgoStr && effectivePayDate <= currentDateStr) {
      const res = resolveEffectiveDividendTaxAndNet(trade, trades);
      const netTWD = trade.currency === 'USD' ? Math.round(res.netCash * exchangeRate) : Math.round(res.netCash);
      trailing12mDividendsTWD += netTWD;
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
    currentYearGrossTWD,
    currentYearTaxTWD,
    previousYearDividendsTWD,
    yoyGrowthPercent: Number(yoyGrowthPercent.toFixed(2)),
    trailing12mDividendsTWD,
    monthlyDistribution: monthlyData,
    topDividendContributors,
    currentYearTopContributors,
    upcomingDividends: receivableDividends,
  };
}
