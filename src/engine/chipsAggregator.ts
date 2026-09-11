import { TwseInstitutionalRow } from './smartMoneyFetcher';

export interface InstitutionalSignal {
  signalType: 'BUY_SYNERGY' | 'SELL_DUMP' | 'TRUST_BUY' | 'FOREIGN_BUY' | 'NEUTRAL';
  label: string;
  color: string;
  badgeBg: string;
}

/**
 * 依據選擇之動能週期 (1D / 3D / 5D) 累加歷史日報數據 (Spec 0119 Ticket 04)
 * 能有效濾除隔日沖雜訊，還原法人中短期真實波段進出
 */
export function aggregateMultiDayChips(
  historyReportsMap: Record<string, Record<string, TwseInstitutionalRow>>,
  availableDates: string[],
  horizonDays: 1 | 3 | 5
): Record<string, TwseInstitutionalRow> {
  if (!availableDates || availableDates.length === 0) return {};

  // 取最近 N 個交易日
  const targetDates = availableDates.slice(-horizonDays);
  if (targetDates.length === 1) {
    return historyReportsMap[targetDates[0]] || {};
  }

  const aggregated: Record<string, TwseInstitutionalRow> = {};

  for (const date of targetDates) {
    const dayData = historyReportsMap[date];
    if (!dayData) continue;

    for (const [symbol, row] of Object.entries(dayData)) {
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

  // 1. 雙法人同買認養 (可以買)
  if (foreignNetShares > 0 && trustNetShares > 0) {
    return {
      signalType: 'BUY_SYNERGY',
      label: '🔥 雙法人認養',
      color: '#34d399',
      badgeBg: 'rgba(52, 211, 153, 0.15)',
    };
  }

  // 2. 雙法人同賣出逃 (一定要閃)
  if (foreignNetShares < 0 && trustNetShares < 0) {
    return {
      signalType: 'SELL_DUMP',
      label: '⚠️ 雙法人出逃',
      color: '#f87171',
      badgeBg: 'rgba(248, 113, 113, 0.15)',
    };
  }

  // 3. 投信逆勢加碼
  if (trustNetShares > 0 && foreignNetShares <= 0) {
    return {
      signalType: 'TRUST_BUY',
      label: '🛡️ 投信逆勢護盤',
      color: '#60a5fa',
      badgeBg: 'rgba(96, 165, 250, 0.15)',
    };
  }

  // 4. 外資單邊搶進
  if (foreignNetShares > 0 && trustNetShares <= 0) {
    return {
      signalType: 'FOREIGN_BUY',
      label: '⚡ 外資短多敲進',
      color: '#c084fc',
      badgeBg: 'rgba(192, 132, 252, 0.15)',
    };
  }

  // 5. 中性觀望
  return {
    signalType: 'NEUTRAL',
    label: '❄️ 法人觀望',
    color: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.1)',
  };
}

/**
 * 取得當前週期之【法人聯手搶買榜 (可以買)】與【主力大舉提款榜 (一定要閃)】(Spec 0119 Ticket 04)
 */
export function getTopMomentumSymbols(
  aggregatedData: Record<string, TwseInstitutionalRow>,
  limit = 5
): {
  buyList: TwseInstitutionalRow[];
  dumpList: TwseInstitutionalRow[];
} {
  const rows = Object.values(aggregatedData);

  // 買超榜：外資 > 0 或 投信 > 0，依總買賣超由大到小排序
  const buyList = rows
    .filter((r) => r.totalNetShares > 0 && (r.foreignNetShares > 0 || r.trustNetShares > 0))
    .sort((a, b) => b.totalNetShares - a.totalNetShares)
    .slice(0, limit);

  // 出逃榜：總賣超最劇烈者，由負最多開始排序
  const dumpList = rows
    .filter((r) => r.totalNetShares < 0)
    .sort((a, b) => a.totalNetShares - b.totalNetShares)
    .slice(0, limit);

  return { buyList, dumpList };
}
