import { HoldingPosition } from '../types/stock';

export type AttributionSortField =
  | 'DEFAULT'
  | 'WEIGHT'
  | 'CONTRIBUTION_BPS'
  | 'MARKET_VALUE'
  | 'RETURN_PERCENT';

export type SortDirection = 'ASC' | 'DESC';

export interface HoldingAttributionItem {
  symbol: string;
  weightPercent: number; // 0 ~ 100
  todaysContributionBps: number; // Basis points (1% = 100 bps)
  hhiContribution: number;
}

export interface PortfolioAttributionSummary {
  totalMarketValueTWD: number;
  totalCapitalAtRiskTWD: number;
  hhi: number;
  hhiLevel: 'DIVERSIFIED' | 'MODERATE' | 'CONCENTRATED';
  items: Record<string, HoldingAttributionItem>;
}

/**
 * 計算投資組合個股權重、今日貢獻度 (bps) 與 HHI 集中度指數
 */
export function calculateHoldingsAttribution(
  holdings: HoldingPosition[],
  usdToTwdRate: number = 32.0
): PortfolioAttributionSummary {
  const activeHoldings = holdings.filter((h) => h.shares > 0);

  const totalMarketValueTWD = activeHoldings.reduce((sum, h) => {
    const rate = h.currency === 'USD' ? usdToTwdRate : 1.0;
    return sum + h.marketValue * rate;
  }, 0);

  const items: Record<string, HoldingAttributionItem> = {};
  let totalHhi = 0;

  for (const h of holdings) {
    if (h.shares <= 0 || totalMarketValueTWD <= 0) {
      items[h.symbol] = {
        symbol: h.symbol,
        weightPercent: 0,
        todaysContributionBps: 0,
        hhiContribution: 0,
      };
      continue;
    }

    const rate = h.currency === 'USD' ? usdToTwdRate : 1.0;
    const holdingMvTwd = h.marketValue * rate;
    const weightPercent = Number(((holdingMvTwd / totalMarketValueTWD) * 100).toFixed(2));

    const todaysPnLTwd = (h.todaysPnL || 0) * rate;
    const todaysContributionBps = Math.round((todaysPnLTwd / totalMarketValueTWD) * 10000);

    const hhiContribution = Math.round(weightPercent * weightPercent);
    totalHhi += hhiContribution;

    items[h.symbol] = {
      symbol: h.symbol,
      weightPercent,
      todaysContributionBps,
      hhiContribution,
    };
  }

  // 計算全戶真實有效在險資本 (Capital at Risk)
  // 規則：若有設定停損價 stopLossPrice，風險 = (currentPrice - stopLossPrice) * shares * fxRate
  // 若未設停損，採保守風險基準：市價之 10%
  let totalCapitalAtRiskTWD = 0;
  for (const h of activeHoldings) {
    const rate = (h.currency === 'USD' || h.market === 'US') ? (usdToTwdRate > 0 ? usdToTwdRate : 32.0) : 1.0;
    const curPrice = h.currentPrice > 0 ? h.currentPrice : (h.marketValue > 0 && h.shares > 0 ? h.marketValue / h.shares : h.avgCost);
    const stopLoss = h.riskMetrics?.stopLossPrice;

    let riskPerShare = 0;
    if (typeof stopLoss === 'number' && stopLoss > 0 && stopLoss < curPrice) {
      riskPerShare = curPrice - stopLoss;
    } else {
      // 預設 10% 風險暴險
      riskPerShare = curPrice * 0.1;
    }

    const posRiskTWD = riskPerShare * h.shares * rate;
    totalCapitalAtRiskTWD += Math.max(0, posRiskTWD);
  }

  let hhiLevel: 'DIVERSIFIED' | 'MODERATE' | 'CONCENTRATED' = 'DIVERSIFIED';
  if (totalHhi > 2500) {
    hhiLevel = 'CONCENTRATED';
  } else if (totalHhi >= 1500) {
    hhiLevel = 'MODERATE';
  }

  return {
    totalMarketValueTWD,
    totalCapitalAtRiskTWD: Math.round(totalCapitalAtRiskTWD),
    hhi: totalHhi,
    hhiLevel,
    items,
  };
}

/**
 * 依據法人維度或傳統欄位排序持股
 */
export function sortHoldingsByInstitutionalField(
  holdings: HoldingPosition[],
  attributionItems: Record<string, HoldingAttributionItem>,
  sortField: AttributionSortField,
  direction: SortDirection = 'DESC',
  usdToTwdRate: number = 32.0
): HoldingPosition[] {
  return [...holdings].sort((a, b) => {
    // 平倉部位永遠往後排
    if (a.shares === 0 && b.shares > 0) return 1;
    if (b.shares === 0 && a.shares > 0) return -1;

    let comp = 0;
    const attrA = attributionItems[a.symbol] || { weightPercent: 0, todaysContributionBps: 0 };
    const attrB = attributionItems[b.symbol] || { weightPercent: 0, todaysContributionBps: 0 };

    switch (sortField) {
      case 'WEIGHT':
        comp = attrA.weightPercent - attrB.weightPercent;
        break;
      case 'CONTRIBUTION_BPS':
        comp = attrA.todaysContributionBps - attrB.todaysContributionBps;
        break;
      case 'MARKET_VALUE': {
        // 跨幣別折算為 TWD 基準比較，消除美股未折算之排序偏差
        const rateA = (a.currency === 'USD' || a.market === 'US') ? (usdToTwdRate > 0 ? usdToTwdRate : 32.0) : 1.0;
        const rateB = (b.currency === 'USD' || b.market === 'US') ? (usdToTwdRate > 0 ? usdToTwdRate : 32.0) : 1.0;
        const valA = (a.marketValue || 0) * rateA;
        const valB = (b.marketValue || 0) * rateB;
        comp = valA - valB;
        break;
      }
      case 'RETURN_PERCENT':
        comp = (a.totalReturnPercent ?? a.unrealizedPnLPercent ?? 0) - (b.totalReturnPercent ?? b.unrealizedPnLPercent ?? 0);
        break;
      case 'DEFAULT':
      default:
        // 台股優先排前面，依代碼自然升冪
        if (a.market !== b.market) {
          return a.market === 'TW' ? -1 : 1;
        }
        return a.symbol.localeCompare(b.symbol, undefined, { numeric: true, sensitivity: 'base' });
    }

    return direction === 'DESC' ? -comp : comp;
  });
}

import { formatPrivacyMasked } from '../utils/formatters';
export { formatPrivacyMasked };
