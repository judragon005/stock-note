import { TradeRecord, MarketType } from '../types/stock';
import { ReceivableDividend, DividendSummaryReport, MonthlyDividendDistribution } from '../types/dividend';
import { resolveEffectiveDividendTaxAndNet } from './taxComplianceEngine';
import { estimatePaymentDate } from './receivableDividendEngine';

/**
 * 自交易紀錄中萃取各標的歷史實際發放月份慣性 (消除 Feature Envy，下沉至領域純函式)
 * Spec 0230: 支援 currentDateStr 時序因果屏障，嚴禁未來未到期預約款項倒灌歷史月份
 */
export function extractHistoricalPayoutMonths(
  trades: TradeRecord[],
  currentDateStr?: string
): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const t of trades) {
    if (t.type === 'DIVIDEND') {
      const payDate = getEffectiveDividendPayDate(t);
      if (currentDateStr && payDate > currentDateStr) {
        continue;
      }
      if (payDate && payDate.length >= 7) {
        const monthNum = parseInt(payDate.substring(5, 7), 10);
        if (monthNum >= 1 && monthNum <= 12) {
          const sym = t.symbol.toUpperCase();
          if (!map[sym]) map[sym] = [];
          if (!map[sym].includes(monthNum)) {
            map[sym].push(monthNum);
            map[sym].sort((a, b) => a - b);
          }
        }
      }
    }
  }
  return map;
}

/**
 * 全域單一時序事實來源 (SSOT)：解析現金股利交易之實質入帳發放日 (Effective Payment Date)
 * 優先採用交易紀錄明確指定之 payDate；若無則依據市場慣例推估
 */
export function getEffectiveDividendPayDate(trade: TradeRecord): string {
  if (trade.payDate) return trade.payDate;
  const baseDate = trade.exDate || trade.date;
  return estimatePaymentDate(baseDate, trade.market, trade.symbol);
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
  let currentYearTwDividendsTWD = 0;
  let currentYearGrossTWD = 0;
  let currentYearTaxTWD = 0;
  let previousYearDividendsTWD = 0;

  const currentYearStr = String(selectedYear);
  const previousYearStr = String(selectedYear - 1);

  // 初始化 12 個月分佈 (直接引用 MonthlyDividendDistribution 具名領域型別)
  const monthlyData: MonthlyDividendDistribution[] = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const monthFormatted = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    return {
      monthKey: `${selectedYear}-${monthFormatted}`,
      monthLabel: `${monthNum}月`,
      grossTWD: 0,
      netTWD: 0,
      taxTWD: 0,
      count: 0,
      pendingNetTWD: 0,
      pendingGrossTWD: 0,
      pendingCount: 0,
      pendingItems: [],
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
        if (trade.market === 'TW' || (!trade.market && trade.currency !== 'USD')) {
          currentYearTwDividendsTWD += netTWD;
        }
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

  // 3. 聚合未到期之待入帳應收股利至當年度月度分佈 (Tri-State Accrual)
  for (const rec of receivableDividends) {
    if (rec.status !== 'PENDING_PAYMENT' && rec.status !== 'OVERDUE') continue;
    const effectivePayDate = rec.payDate || estimatePaymentDate(rec.exDate, rec.market || 'TW', rec.symbol);
    if (!effectivePayDate || !effectivePayDate.startsWith(currentYearStr)) continue;

    const monthPart = parseInt(effectivePayDate.substring(5, 7), 10);
    if (monthPart >= 1 && monthPart <= 12) {
      const targetMonth = monthlyData[monthPart - 1];
      const pendingNet = rec.currency === 'USD'
        ? Math.round(rec.estimatedNetDividend * exchangeRate)
        : Math.round(rec.estimatedNetDividendInTWD || rec.estimatedNetDividend);
      const pendingGross = rec.currency === 'USD'
        ? Math.round(rec.estimatedGrossDividend * exchangeRate)
        : Math.round(rec.estimatedGrossDividend);

      targetMonth.pendingNetTWD = (targetMonth.pendingNetTWD || 0) + pendingNet;
      targetMonth.pendingGrossTWD = (targetMonth.pendingGrossTWD || 0) + pendingGross;
      targetMonth.pendingCount = (targetMonth.pendingCount || 0) + 1;
      targetMonth.pendingItems = targetMonth.pendingItems || [];
      targetMonth.pendingItems.push({
        symbol: rec.symbol,
        name: rec.name,
        payDate: effectivePayDate,
        netTWD: pendingNet,
      });
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
    currentYearTwDividendsTWD,
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

/**
 * 建立統一應收股利與預約交易聯集中樞 (Spec 0229 SSOT & Spec 0230 自然鍵防撞協定)
 * 解決外部公告與本地預約交易雙軌分裂，確保全看板消費單一事實來源
 * 以不可變的除息金融自然鍵 `${market}_${symbol}_${exDate}` 防撞去重
 */
export function buildUnifiedPendingReceivables(
  scopedReceivables: ReceivableDividend[],
  scopedTrades: TradeRecord[],
  todayStr: string,
  usdToTwdRate: number
): ReceivableDividend[] {
  const map = new Map<string, ReceivableDividend>();

  // 1. 注入官方公告或引擎識別之應收
  scopedReceivables.forEach((r) => {
    if (
      (r.status === 'PENDING_PAYMENT' || r.status === 'OVERDUE' || r.status === 'DUE_FOR_RECONCILIATION') &&
      r.estimatedNetDividendInTWD > 0
    ) {
      const dateKey = r.exDate || r.payDate || '';
      const key = `${r.market || 'TW'}_${r.symbol.toUpperCase()}_${dateKey}`;
      map.set(key, r);
    }
  });

  // 2. 注入 scopedTrades 中未到期或預約待入之 DIVIDEND 記錄 (如華邦電 2026-12-16)
  scopedTrades.forEach((t) => {
    if (t.type !== 'DIVIDEND') return;
    const effectivePayDate = getEffectiveDividendPayDate(t);
    const isFuture = effectivePayDate > todayStr;
    const exDate = t.exDate || t.date || effectivePayDate;
    const key = `${t.market || 'TW'}_${t.symbol.toUpperCase()}_${exDate}`;

    if (isFuture && !map.has(key)) {
      const gross = t.shares * t.price;
      const res = resolveEffectiveDividendTaxAndNet(t, scopedTrades);
      const netTWD = t.currency === 'USD' ? Math.round(res.netCash * usdToTwdRate) : Math.round(res.netCash);
      const grossTWD = t.currency === 'USD' ? Math.round(gross * usdToTwdRate) : Math.round(gross);
      const taxTWD = grossTWD - netTWD;

      map.set(key, {
        id: `virtual_${t.id}`,
        symbol: t.symbol,
        name: t.name || t.symbol,
        market: t.market,
        currency: (t.currency as any) || 'TWD',
        exDate: exDate,
        payDate: effectivePayDate,
        sharesHeldOnExDate: t.shares,
        cashDividendPerShare: t.price,
        estimatedGrossDividend: gross,
        estimatedTaxOrFee: taxTWD,
        estimatedNetDividend: res.netCash,
        estimatedNetDividendInTWD: netTWD,
        status: 'PENDING_PAYMENT',
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const pA = a.payDate || a.exDate;
    const pB = b.payDate || b.exDate;
    return pA.localeCompare(pB);
  });
}
