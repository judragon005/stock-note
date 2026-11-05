import { TwseInstitutionalRow } from './smartMoneyFetcher';

export interface InstitutionalSignal {
  signalType: 'BUY_SYNERGY' | 'SELL_DUMP' | 'TRUST_BUY' | 'FOREIGN_BUY' | 'NEUTRAL';
  label: string;
  color: string;
  badgeBg: string;
}

/**
 * 判斷是否為 ETF 標的 (代號以 00 或 01 開頭)
 */
export function isEtfSymbol(symbol: string): boolean {
  if (!symbol) return false;
  return /^(00|01)/.test(symbol.trim());
}

/**
 * 計算最新交易日之連續買進或賣出天數 (Streak)
 * 數列為依日期升序排列 (由遠到近)
 * 正數代表連買天數，負數代表連賣天數，0 為持平
 */
export function calculateStreaks(series: number[]): number {
  if (!series || series.length === 0) return 0;
  const lastVal = series[series.length - 1];
  if (!lastVal || lastVal === 0) return 0;

  const isBuy = lastVal > 0;
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    const val = series[i];
    if (isBuy && val > 0) {
      streak++;
    } else if (!isBuy && val < 0) {
      streak--;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * 依據選擇之動能週期 (1D / 3D / 5D) 累加歷史日報數據 (Spec 0119 & Spec 0217 Ticket 04)
 * 能有效濾除隔日沖雜訊，還原法人中短期真實波段進出與連續買賣超 Streak
 */
export function aggregateMultiDayChips(
  historyReportsMap: Record<string, Record<string, TwseInstitutionalRow>>,
  availableDates: string[],
  horizonDays: 1 | 3 | 5
): Record<string, TwseInstitutionalRow> {
  if (!availableDates || availableDates.length === 0) return {};

  const targetDates = availableDates.slice(-horizonDays);
  if (targetDates.length === 1) {
    const dayData = historyReportsMap[targetDates[0]] || {};
    const res: Record<string, TwseInstitutionalRow> = {};
    for (const [sym, r] of Object.entries(dayData)) {
      res[sym] = {
        ...r,
        foreignStreak: calculateStreaks([r.foreignNetShares]),
        trustStreak: calculateStreaks([r.trustNetShares]),
      };
    }
    return res;
  }

  const aggregated: Record<string, TwseInstitutionalRow> = {};
  const foreignSeriesMap: Record<string, number[]> = {};
  const trustSeriesMap: Record<string, number[]> = {};

  for (const date of targetDates) {
    const dayData = historyReportsMap[date];
    if (!dayData) continue;

    for (const [symbol, row] of Object.entries(dayData)) {
      if (!foreignSeriesMap[symbol]) foreignSeriesMap[symbol] = [];
      if (!trustSeriesMap[symbol]) trustSeriesMap[symbol] = [];
      foreignSeriesMap[symbol].push(row.foreignNetShares || 0);
      trustSeriesMap[symbol].push(row.trustNetShares || 0);

      if (!aggregated[symbol]) {
        aggregated[symbol] = {
          symbol: row.symbol,
          name: row.name,
          foreignBuyShares: row.foreignBuyShares,
          foreignSellShares: row.foreignSellShares,
          foreignNetShares: row.foreignNetShares,
          trustBuyShares: row.trustBuyShares,
          trustSellShares: row.trustSellShares,
          trustNetShares: row.trustNetShares,
          dealerNetShares: row.dealerNetShares,
          totalNetShares: row.totalNetShares,
        };
      } else {
        const acc = aggregated[symbol];
        acc.foreignBuyShares += row.foreignBuyShares;
        acc.foreignSellShares += row.foreignSellShares;
        acc.foreignNetShares += row.foreignNetShares;
        acc.trustBuyShares += row.trustBuyShares;
        acc.trustSellShares += row.trustSellShares;
        acc.trustNetShares += row.trustNetShares;
        acc.dealerNetShares += row.dealerNetShares;
        acc.totalNetShares += row.totalNetShares;
      }
    }
  }

  // 注入 Streak
  for (const symbol of Object.keys(aggregated)) {
    const fSeries = foreignSeriesMap[symbol] || [];
    const tSeries = trustSeriesMap[symbol] || [];
    aggregated[symbol].foreignStreak = calculateStreaks(fSeries);
    aggregated[symbol].trustStreak = calculateStreaks(tSeries);
  }

  return aggregated;
}

/**
 * 法人動能決策信號識別器 (Spec 0119 Ticket 04)
 */
export function classifyInstitutionalSignal(row?: TwseInstitutionalRow | null): InstitutionalSignal {
  if (!row) {
    return {
      signalType: 'NEUTRAL',
      label: '❄️ 法人觀望',
      color: '#94a3b8',
      badgeBg: 'rgba(148, 163, 184, 0.1)',
    };
  }

  const { foreignNetShares, trustNetShares } = row;

  if (foreignNetShares > 0 && trustNetShares > 0) {
    return {
      signalType: 'BUY_SYNERGY',
      label: '🔥 雙法人認養',
      color: '#34d399',
      badgeBg: 'rgba(52, 211, 153, 0.15)',
    };
  }

  if (foreignNetShares < 0 && trustNetShares < 0) {
    return {
      signalType: 'SELL_DUMP',
      label: '⚠️ 雙法人出逃',
      color: '#f87171',
      badgeBg: 'rgba(248, 113, 113, 0.15)',
    };
  }

  if (trustNetShares > 0 && foreignNetShares <= 0) {
    return {
      signalType: 'TRUST_BUY',
      label: '🛡️ 投信逆勢護盤',
      color: '#60a5fa',
      badgeBg: 'rgba(96, 165, 250, 0.15)',
    };
  }

  if (foreignNetShares > 0 && trustNetShares <= 0) {
    return {
      signalType: 'FOREIGN_BUY',
      label: '⚡ 外資短多敲進',
      color: '#c084fc',
      badgeBg: 'rgba(192, 132, 252, 0.15)',
    };
  }

  return {
    signalType: 'NEUTRAL',
    label: '❄️ 法人觀望',
    color: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.1)',
  };
}

/**
 * 取得當前週期之【法人聯手搶買榜 (可以買)】與【主力大舉提款榜 (一定要閃)】(Spec 0119 & Spec 0217 Ticket 04)
 * 預設排除 ETF 造市標的
 */
export function getTopMomentumSymbols(
  aggregatedData: Record<string, TwseInstitutionalRow>,
  limit = 5,
  options?: { excludeEtf?: boolean; market?: 'TW' | 'US' }
): {
  buyList: TwseInstitutionalRow[];
  dumpList: TwseInstitutionalRow[];
} {
  const shouldExcludeEtf = options?.excludeEtf !== false;
  let rows = Object.values(aggregatedData);

  if (shouldExcludeEtf) {
    rows = rows.filter((r) => !isEtfSymbol(r.symbol));
  }

  const buyList = rows
    .filter((r) => r.totalNetShares > 0 && (r.foreignNetShares > 0 || r.trustNetShares > 0))
    .sort((a, b) => b.totalNetShares - a.totalNetShares)
    .slice(0, limit);

  const dumpList = rows
    .filter((r) => r.totalNetShares < 0)
    .sort((a, b) => a.totalNetShares - b.totalNetShares)
    .slice(0, limit);

  return { buyList, dumpList };
}
