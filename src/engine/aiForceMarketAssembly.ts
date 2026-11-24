/**
 * aiForceMarketAssembly.ts
 * 主力戰情室雙市場（台股／美股微觀結構、13F 集保、月營收／季營收與 ETF 現金流）純函式組裝子模組
 * 自 aiForceDashboardEngine.ts 抽離 (Spec 0240 T10 / Debt 0062 #4b)
 */

import { MarketType } from '../types/stock';
import {
  InstitutionalFlowData,
  TdccDistributionData,
  Us13fChipData,
  MonthlyRevenueData,
} from '../types/aiForceDashboard';
import { calculateUsMicrostructureInstitutionalScore } from './multiDimensionRadarEngine';
import { isCanonicalEtfSymbol } from './assetClassifier';

export interface RawInstitutionalRecord {
  date: string;
  foreignShares: number;
  trustShares: number;
  dealerShares: number;
  sblBalance?: number;
}

/**
 * 單一權威資產型態判定 (委託 assetClassifier.ts，Spec 0239 T02/T08)
 */
export function isEtfSymbol(
  symbol: string,
  name?: string,
  market?: MarketType,
  metaType?: string
): boolean {
  return isCanonicalEtfSymbol(symbol, name, market, metaType);
}

/**
 * 依據本地 SQLite tw_tdcc_distribution 建立 Card 19「TDCC 集保千張大戶趨勢」資料 (Spec 0169)
 */
export function buildTdccDistribution(
  records?: Array<{
    date: string;
    totalShareholders?: number;
    over400Ratio?: number;
    over1000Ratio?: number;
    under10Ratio?: number;
  }>,
  market: MarketType = 'TW',
  symbol?: string,
  us13fData?: Us13fChipData
): TdccDistributionData {
  if (market === 'US') {
    if (us13fData) {
      const isSqueeze = us13fData.isSqueezeRisk ?? ((us13fData.shortFloatRatio ?? 0) > 10);
      const isConcentrated = (us13fData.institutionalRatio ?? 0) > 60;
      return {
        symbol,
        isUsMarket: true,
        us13fData: {
          ...us13fData,
          isSqueezeRisk: isSqueeze,
        },
        history: [],
        concentrationBadge: isSqueeze
          ? '軋空警戒 (Squeeze Alert)'
          : isConcentrated
          ? '機構高度控盤'
          : '籌碼正常分散',
        asOfDateText: us13fData.asOfQuarterText || 'SEC 13F 最新申報',
        isEmpty: false,
      };
    }
    return {
      symbol,
      isUsMarket: true,
      history: [],
      concentrationBadge: '美股不適用',
      asOfDateText: '美股市場',
      isEmpty: true,
      emptyMessage: '美股無集保機制 (採 13F 機構申報)',
    };
  }

  if (!records || records.length === 0) {
    return {
      symbol,
      history: [],
      concentrationBadge: '集保待補',
      asOfDateText: '集保無資料',
      isEmpty: true,
      emptyMessage: '集保數據累積中 (週五盤後結算)',
    };
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const history = sorted.map((r) => ({
    date: r.date,
    totalShareholders: r.totalShareholders ?? (r as any).total_shareholders ?? 0,
    over1000Ratio: r.over1000Ratio ?? (r as any).over_1000_ratio ?? 0,
    over400Ratio: r.over400Ratio ?? (r as any).over_400_ratio,
    under10Ratio: r.under10Ratio ?? (r as any).under_10_ratio,
  }));

  const latest = history[history.length - 1];
  if (history.length === 1) {
    const latestUnder10Ratio = latest.under10Ratio !== undefined ? Number(latest.under10Ratio.toFixed(2)) : undefined;
    return {
      symbol,
      history,
      latestOver1000Ratio: latest.over1000Ratio,
      latestUnder10Ratio,
      latestShareholders: latest.totalShareholders,
      change4WeeksRatio: undefined,
      change4WeeksUnder10Ratio: undefined,
      change4WeeksShareholders: undefined,
      retailScissorsText: undefined,
      concentrationBadge: '首週基準建立',
      asOfDateText: `集保基準日: ${latest.date}`,
      isEmpty: false,
    };
  }

  const calcDiffDays = (dateA: string, dateB: string): number => {
    const tA = Date.parse(`${dateA.slice(0, 10)}T00:00:00Z`);
    const tB = Date.parse(`${dateB.slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(tA) || !Number.isFinite(tB)) return 0;
    return Math.round(Math.abs(tA - tB) / 86400000);
  };

  // Spec 0245 T10: 以真實 28 天日曆窗 (21~35 天容許連假彈性) 尋找 4 週基準點，杜絕陣列索引盲減將 11 週變動偽標為 4 週
  let baseline = history[0];
  let bestInWindowDiff = Infinity;
  let foundInStandardWindow = false;
  let bestOverallDiff = Infinity;

  for (let i = 0; i < history.length - 1; i++) {
    const days = calcDiffDays(latest.date, history[i].date);
    const distFrom28 = Math.abs(days - 28);
    if (days >= 21 && days <= 35) {
      if (!foundInStandardWindow || distFrom28 < bestInWindowDiff) {
        foundInStandardWindow = true;
        bestInWindowDiff = distFrom28;
        baseline = history[i];
      }
    } else if (!foundInStandardWindow && distFrom28 < bestOverallDiff) {
      bestOverallDiff = distFrom28;
      baseline = history[i];
    }
  }

  const actualSpanDays = calcDiffDays(latest.date, baseline.date);
  const compareSpanWeeks = foundInStandardWindow
    ? 4
    : Math.max(1, Math.round(actualSpanDays / 7));
  const compareLabel =
    compareSpanWeeks === 4 ? '近 4 週大戶變動' : `近 ${compareSpanWeeks} 週大戶變動`;

  let hasDateGaps = false;
  for (let i = 1; i < history.length; i++) {
    if (calcDiffDays(history[i].date, history[i - 1].date) > 11) {
      hasDateGaps = true;
      break;
    }
  }

  const change4WeeksRatio = Number((latest.over1000Ratio - baseline.over1000Ratio).toFixed(2));
  const change4WeeksShareholders = latest.totalShareholders - baseline.totalShareholders;

  const latestUnder10Ratio = latest.under10Ratio !== undefined ? Number(latest.under10Ratio.toFixed(2)) : undefined;
  const baselineUnder10Ratio = baseline.under10Ratio;
  const change4WeeksUnder10Ratio =
    latestUnder10Ratio !== undefined && baselineUnder10Ratio !== undefined
      ? Number((latestUnder10Ratio - baselineUnder10Ratio).toFixed(2))
      : undefined;

  let retailScissorsText: string | undefined = undefined;
  if (change4WeeksRatio > 0 && change4WeeksUnder10Ratio !== undefined && change4WeeksUnder10Ratio < 0) {
    retailScissorsText = '大戶增持·散戶退場 (籌碼集中)';
  } else if (change4WeeksRatio < 0 && change4WeeksUnder10Ratio !== undefined && change4WeeksUnder10Ratio > 0) {
    retailScissorsText = '大戶調節·散戶接刀 (籌碼渙散)';
  } else if (change4WeeksRatio > 0) {
    retailScissorsText = '大戶積極增持';
  } else if (change4WeeksRatio < 0) {
    retailScissorsText = '大戶持續減碼';
  }

  let concentrationBadge = '籌碼中性整理';
  if (change4WeeksRatio > 0 && change4WeeksShareholders < 0) {
    concentrationBadge = '籌碼高度集中 (波段起漲)';
  } else if (change4WeeksRatio < 0 && change4WeeksShareholders > 0) {
    concentrationBadge = '散戶接刀警戒';
  } else if (change4WeeksRatio > 0.5) {
    concentrationBadge = '大戶持續增持';
  } else if (change4WeeksRatio < -0.5) {
    concentrationBadge = '大戶明顯調節';
  }

  return {
    symbol,
    history,
    latestOver1000Ratio: latest.over1000Ratio,
    latestUnder10Ratio,
    latestShareholders: latest.totalShareholders,
    change4WeeksRatio,
    change4WeeksUnder10Ratio,
    change4WeeksShareholders,
    compareSpanWeeks,
    compareLabel,
    hasDateGaps,
    retailScissorsText,
    concentrationBadge,
    asOfDateText: `集保基準日: ${latest.date}`,
    isEmpty: false,
  };
}

/**
 * 台灣主流 ETF 規模 (億元) 與總費用率基準對照 (Spec 0238 Ticket 04)
 * 美股 ETF 一律由 us_fundamentals_daily 即時抓取，嚴禁靜態回退造假 (Spec 0239 Zero-Mock)
 */
export const ETF_BASELINE_META: Record<string, { aumBillion: number; expenseRatio: number }> = {
  '0050': { aumBillion: 4380, expenseRatio: 0.43 },
  '0056': { aumBillion: 3650, expenseRatio: 0.44 },
  '00878': { aumBillion: 3520, expenseRatio: 0.42 },
  '00919': { aumBillion: 2890, expenseRatio: 0.42 },
  '006208': { aumBillion: 1750, expenseRatio: 0.24 },
  '00713': { aumBillion: 1120, expenseRatio: 0.45 },
  '00929': { aumBillion: 2350, expenseRatio: 0.43 },
  '00940': { aumBillion: 1620, expenseRatio: 0.45 },
  '00679B': { aumBillion: 2980, expenseRatio: 0.16 },
  '00687B': { aumBillion: 2560, expenseRatio: 0.17 },
};

/**
 * 依據近一年歷史除權息反推 ETF/個股真實年化配息率 (%)
 */
export function deriveTrailingDividendYield(
  corporateActions?: Array<{ exDate: string; cashDividendPerShare?: number }>,
  currentPrice?: number,
  referenceDateStr?: string
): number | undefined {
  if (!corporateActions || corporateActions.length === 0 || !currentPrice || currentPrice <= 0) {
    return undefined;
  }
  const refMs = referenceDateStr ? new Date(referenceDateStr).getTime() : Date.now();
  const oneYearMs = 370 * 24 * 60 * 60 * 1000;
  const recentDividends = corporateActions.filter((ca) => {
    if (typeof ca.cashDividendPerShare !== 'number' || ca.cashDividendPerShare <= 0) return false;
    const exMs = new Date(ca.exDate).getTime();
    if (Number.isNaN(exMs)) return true;
    return exMs <= refMs + 30 * 24 * 60 * 60 * 1000 && refMs - exMs <= oneYearMs;
  });
  const source = recentDividends.length > 0 ? recentDividends : corporateActions.filter((ca) => (ca.cashDividendPerShare ?? 0) > 0).slice(0, 4);
  if (source.length === 0) return undefined;
  const sumCash = source.reduce((sum, ca) => sum + (ca.cashDividendPerShare ?? 0), 0);
  if (sumCash <= 0) return undefined;
  return Number(((sumCash / currentPrice) * 100).toFixed(2));
}

/**
 * 依據本地 SQLite tw_monthly_revenue 建立 Card 20「月營收成長走勢」(含 ETF 自適應與美股 10-Q/10-K) 資料 (Spec 0169 / Spec 0239)
 */
export function buildMonthlyRevenue(
  symbol: string,
  name: string,
  market: MarketType = 'TW',
  records?: Array<{
    yearMonth: string;
    revenue: number;
    lastYearRevenue?: number;
    yoyRate?: number;
    momRate?: number;
    isAllTimeHigh?: number;
  }>,
  tdccRecords?: Array<{
    date: string;
    totalShareholders?: number;
    over400Ratio?: number;
    over1000Ratio?: number;
    under10Ratio?: number;
  }>,
  etfOptions?: {
    corporateActions?: Array<{
      exDate: string;
      paymentDate?: string;
      cashDividendPerShare?: number;
      stockDividendRatio?: number;
    }>;
    dividendYield?: number | null;
    aumBillion?: number | null;
    expenseRatio?: number | null;
    currentPrice?: number;
    referenceDateStr?: string;
    metaType?: string;
    quarterlyFinancials?: Array<{
      year: number;
      quarter: number;
      revenue?: number | null;
      periodDate?: string;
    }>;
  }
): MonthlyRevenueData {
  const isUs = market === 'US';
  const isEtf = isEtfSymbol(symbol, name, market, etfOptions?.metaType);

  if (isEtf) {
    const cleanSym = symbol.trim().toUpperCase().replace(/\.(TW|TWO|US)$/i, '');
    const latestTdcc = tdccRecords && tdccRecords.length > 0 ? tdccRecords[tdccRecords.length - 1] : undefined;
    const beneficiaries = latestTdcc?.totalShareholders;
    const derivedYield = deriveTrailingDividendYield(
      etfOptions?.corporateActions,
      etfOptions?.currentPrice,
      etfOptions?.referenceDateStr
    );
    const dividendYield =
      typeof etfOptions?.dividendYield === 'number' && Number.isFinite(etfOptions.dividendYield)
        ? etfOptions.dividendYield
        : derivedYield;
    const hasAnyDynamicEtfSignal =
      beneficiaries !== undefined ||
      dividendYield !== undefined ||
      (etfOptions?.corporateActions && etfOptions.corporateActions.length > 0) ||
      typeof etfOptions?.aumBillion === 'number' ||
      typeof etfOptions?.expenseRatio === 'number';
    const aumBillion =
      typeof etfOptions?.aumBillion === 'number' && Number.isFinite(etfOptions.aumBillion)
        ? etfOptions.aumBillion
        : hasAnyDynamicEtfSignal
        ? ETF_BASELINE_META[cleanSym]?.aumBillion
        : undefined;

    const quarterlyDividends = (etfOptions?.corporateActions ?? [])
      .filter((ca) => typeof ca.cashDividendPerShare === 'number' && ca.cashDividendPerShare > 0)
      .sort((a, b) => b.exDate.localeCompare(a.exDate))
      .slice(0, 12)
      .map((ca) => {
        const perPayoutYield =
          etfOptions?.currentPrice && etfOptions.currentPrice > 0
            ? Number(((ca.cashDividendPerShare! / etfOptions.currentPrice) * 100).toFixed(2))
            : dividendYield ?? 0;
        return {
          quarter: ca.exDate,
          amount: ca.cashDividendPerShare!,
          yieldRate: perPayoutYield,
        };
      });

    const hasRealEtfData =
      quarterlyDividends.length > 0 ||
      dividendYield !== undefined ||
      beneficiaries !== undefined ||
      aumBillion !== undefined;

    if (!hasRealEtfData) {
      return {
        isEtf: true,
        isUsMarket: isUs,
        currency: isUs ? 'USD' : 'TWD',
        history: [],
        latestRevenueText: undefined,
        growthBadge: 'ETF 資料待補',
        asOfDateText: 'ETF 規模與殖利率',
        etfData: undefined,
        isEmpty: true,
        emptyMessage: isUs ? '美股 ETF 規模與配息資料累積中' : 'ETF 配息與受益人資料累積中',
      };
    }

    const asOfDateText = latestTdcc?.date
      ? `ETF 規模與受益人 (${latestTdcc.date})`
      : isUs
      ? '美股 ETF 規模與收益分配 (USD)'
      : 'ETF 規模與殖利率';

    return {
      isEtf: true,
      isUsMarket: isUs,
      currency: isUs ? 'USD' : 'TWD',
      history: [],
      latestRevenueText: undefined,
      growthBadge: 'ETF 規模穩健',
      asOfDateText,
      etfData: {
        aumBillion,
        dividendYield,
        beneficiaries,
        quarterlyDividends,
      },
      isEmpty: false,
    };
  }

  // Spec 0239 T07: 美股個股 10-Q/10-K 近 8 季營收成長走勢
  if (isUs && Array.isArray(etfOptions?.quarterlyFinancials) && etfOptions.quarterlyFinancials.length > 0) {
    const validQ = etfOptions.quarterlyFinancials
      .filter((q) => typeof q.revenue === 'number' && Number.isFinite(q.revenue) && q.revenue > 0)
      .sort((a, b) => (a.year * 10 + a.quarter) - (b.year * 10 + b.quarter));

    if (validQ.length > 0) {
      const qMap = new Map<string, number>();
      for (const q of validQ) {
        qMap.set(`${q.year}-Q${q.quarter}`, q.revenue!);
      }
      const recentQ = validQ.slice(-8);
      let runningMax = 0;
      const history = recentQ.map((q, idx) => {
        const rev = q.revenue!;
        const lastYearRev = qMap.get(`${q.year - 1}-Q${q.quarter}`);
        const prevQ = idx > 0 ? recentQ[idx - 1].revenue! : undefined;
        const yoyRate =
          lastYearRev && lastYearRev > 0
            ? Number((((rev - lastYearRev) / lastYearRev) * 100).toFixed(1))
            : undefined;
        const momRate =
          prevQ && prevQ > 0 ? Number((((rev - prevQ) / prevQ) * 100).toFixed(1)) : undefined;
        const isAllTimeHigh = rev >= runningMax && runningMax > 0;
        if (rev > runningMax) runningMax = rev;
        return {
          yearMonth: `${q.year}Q${q.quarter}`,
          revenue: rev,
          lastYearRevenue: lastYearRev,
          yoyRate,
          momRate,
          isAllTimeHigh,
        };
      });

      const latest = history[history.length - 1];
      let streak = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if ((history[i].yoyRate ?? 0) > 0 && (history[i].momRate ?? 0) > 0) streak++;
        else break;
      }

      const formatUsdRevenue = (val: number) => {
        if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
        return `$${val.toLocaleString()}`;
      };

      let growthBadge = '季營收穩健成長';
      if (streak >= 3) growthBadge = '連續 3 季年季雙增';
      else if (latest.isAllTimeHigh) growthBadge = '單季創高 (ATH)';
      else if ((latest.yoyRate ?? 0) > 20) growthBadge = '季營收強勁雙位數成長';
      else if ((latest.yoyRate ?? 0) < 0) growthBadge = '季營收年減衰退';

      return {
        isEtf: false,
        isQuarterly: true,
        isUsMarket: true,
        currency: 'USD',
        history,
        latestRevenueText: formatUsdRevenue(latest.revenue),
        latestYoyRate: latest.yoyRate,
        growthStreakMonths: streak,
        athCount: history.filter((h) => h.isAllTimeHigh).length,
        growthBadge,
        asOfDateText: `10-Q/10-K 季營收基準: ${latest.yearMonth}`,
        isEmpty: false,
      };
    }
  }

  if (!records || records.length === 0) {
    return {
      isEtf: false,
      isUsMarket: isUs,
      currency: isUs ? 'USD' : 'TWD',
      history: [],
      growthBadge: '尚無營收',
      asOfDateText: '無營收資料',
      isEmpty: true,
      emptyMessage: isUs ? '美股採季度財報 (10-Q/10-K)，季報資料累積中' : '月營收數據累積中 (每月 10 日公布)',
    };
  }

  const sorted = [...records].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const history = sorted.map((r) => ({
    yearMonth: r.yearMonth,
    revenue: r.revenue,
    lastYearRevenue: r.lastYearRevenue ?? (r as any).last_year_revenue,
    yoyRate: r.yoyRate ?? (r as any).yoy_rate ?? (r as any).yoyGrowth,
    momRate: r.momRate ?? (r as any).mom_rate ?? (r as any).momGrowth,
    isAllTimeHigh: Boolean(r.isAllTimeHigh ?? (r as any).is_all_time_high),
  }));

  const latest = history[history.length - 1];
  const athCount = history.filter((h) => h.isAllTimeHigh).length;

  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if ((item.yoyRate ?? 0) > 0 && (item.momRate ?? 0) > 0) {
      streak++;
    } else {
      break;
    }
  }

  let growthBadge = '營收穩健成長';
  if (streak >= 3) {
    growthBadge = '連續 3 個月年月雙增';
  } else if (latest.isAllTimeHigh) {
    growthBadge = '創歷史新高 (ATH)';
  } else if (latest.yoyRate !== undefined && latest.yoyRate > 20) {
    growthBadge = '營收強勁雙位數成長';
  } else if (latest.yoyRate !== undefined && latest.yoyRate < 0) {
    growthBadge = '營收年減衰退';
  }

  const formatRevenue = (revThousands: number) => {
    const revTotal = revThousands * 1000;
    if (Math.abs(revTotal) >= 100_000_000) {
      return `${(revTotal / 100_000_000).toFixed(1)} 億元`;
    }
    return `${(revTotal / 10_000).toFixed(0)} 萬元`;
  };

  return {
    isEtf: false,
    history,
    latestRevenueText: formatRevenue(latest.revenue),
    latestYoyRate: latest.yoyRate,
    growthStreakMonths: streak,
    athCount,
    growthBadge,
    asOfDateText: `營收基準: ${latest.yearMonth}`,
    isEmpty: false,
  };
}

/**
 * 依據真實法人進出記錄或美股微觀量價模型建構卡片 08 之雙軸圖數列與明細 (Spec 0169: 完全零假數據)
 */
export function buildInstitutionalFlow(
  candles: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>,
  records?: RawInstitutionalRecord[],
  market: MarketType = 'TW'
): InstitutionalFlowData {
  const formatSigned = (num: number) => (num >= 0 ? `+${num.toLocaleString()}` : num.toLocaleString());

  // 美股標的：100% 根除三大法人偽數據，切換為微觀量價動能評分
  if (market === 'US') {
    const usMicroScore = calculateUsMicrostructureInstitutionalScore(candles as any);
    const last20Candles = candles.slice(-20);
    const avgVol20 = last20Candles.reduce((a, c) => a + c.volume, 0) / Math.max(1, last20Candles.length);
    const last5Candles = candles.slice(-5);
    const avgVol5 = last5Candles.reduce((a, c) => a + c.volume, 0) / Math.max(1, last5Candles.length);
    const volumeRatio = avgVol20 > 0 ? Number((avgVol5 / avgVol20).toFixed(2)) : 1.0;
    let sentimentLabel = '動能中性';
    if (usMicroScore >= 65) sentimentLabel = '機構量價偏多';
    else if (usMicroScore <= 40) sentimentLabel = '機構調節中';

    return {
      history: [],
      recentDaysTable: [],
      cumulative20DaysSummary: `美股微觀量價動能評估 (${usMicroScore}分)`,
      recent5DaysSummary: '美股無三大法人日報',
      isUsMarket: true,
      usMicrostructure: {
        score: usMicroScore,
        sentimentLabel,
        mfi: Math.min(100, Math.max(0, usMicroScore)),
        obvTrend: usMicroScore >= 55 ? 'UP' : usMicroScore <= 45 ? 'DOWN' : 'FLAT',
        volumeRatio,
        note: '美股無三大法人日報，已切換為機構量價評分',
      },
      asOfDateText: candles.length > 0 ? candles[candles.length - 1].date : undefined,
    };
  }

  // 台股標的：若有真實三大法人資料
  if (records && records.length > 0) {
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    const history = sorted.map((r) => {
      const net = r.foreignShares + r.trustShares + r.dealerShares;
      cumulative += net;
      return {
        date: r.date,
        foreignShares: r.foreignShares,
        trustShares: r.trustShares,
        dealerShares: r.dealerShares,
        cumulativeTotalShares: cumulative,
      };
    });

    const recent5 = sorted.slice(-5).reverse().map((r) => ({
      date: r.date.includes('-') ? r.date.substring(5).replace('-', '/') : r.date,
      foreignShares: r.foreignShares,
      trustShares: r.trustShares,
      dealerShares: r.dealerShares,
      totalShares: r.foreignShares + r.trustShares + r.dealerShares,
    }));

    const last20 = sorted.slice(-20);
    const sum20 = last20.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    const last5 = sorted.slice(-5);
    const sum5 = last5.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    const lastDate = sorted[sorted.length - 1].date;

    return {
      history,
      recentDaysTable: recent5,
      cumulative20DaysSummary: `${sum20 >= 0 ? '多頭' : '偏空'} (20日 ${formatSigned(sum20)}張)`,
      recent5DaysSummary: `${sum5 >= 0 ? '偏多' : '偏空'} (${formatSigned(sum5)}張)`,
      isUsMarket: false,
      asOfDateText: `法人基準日: ${lastDate}`,
    };
  }

  // Zero-Mock Policy: 無法人資料時嚴禁假造張數
  return {
    history: [],
    recentDaysTable: [],
    cumulative20DaysSummary: '尚無法人日報數據',
    recent5DaysSummary: '待三大法人公布',
    isUsMarket: false,
    asOfDateText: '法人資料待公布',
  };
}
