import { TradeRecord } from '../types/stock';
import {
  CalculateExposureParams,
  PortfolioExposureMetrics,
  LeverageRiskTier,
  LeverageRiskTierInfo,
} from '../types/exposure';
import { calculateLoanInterestAndPayoff } from './cashLedgerEngine';

/**
 * 計算在席融資買進之未償還券商負債 (TWD)
 */
export function calculateActiveMarginDebt(
  trades: TradeRecord[] = [],
  usdToTwdRate: number = 32.0
): number {
  const marginLotsBySymbol: Record<string, { shares: number; debtPerShare: number; currency: string }[]> = {};

  const sortedTrades = [...trades].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt - b.createdAt;
  });

  for (const trade of sortedTrades) {
    const sym = trade.symbol.trim().toUpperCase();
    const isMarginBuy = trade.type === 'MARGIN_BUY' || (trade.type === 'BUY' && Boolean(trade.isMargin));
    const isMarginSell = trade.type === 'MARGIN_SELL' || (trade.type === 'SELL' && Boolean(trade.isMargin));

    if (isMarginBuy && trade.shares > 0) {
      const marginRate = trade.marginRate ?? 0.4;
      const totalCost = trade.shares * trade.price;
      const debtAmount = totalCost * (1 - marginRate);
      if (!marginLotsBySymbol[sym]) {
        marginLotsBySymbol[sym] = [];
      }
      marginLotsBySymbol[sym].push({
        shares: trade.shares,
        debtPerShare: debtAmount / trade.shares,
        currency: trade.currency || (trade.market === 'US' ? 'USD' : 'TWD'),
      });
    } else if (isMarginSell && trade.shares > 0) {
      let remainingToSell = trade.shares;
      const lots = marginLotsBySymbol[sym] || [];
      while (remainingToSell > 0 && lots.length > 0) {
        const lot = lots[0];
        const match = Math.min(remainingToSell, lot.shares);
        lot.shares -= match;
        remainingToSell -= match;
        if (lot.shares <= 1e-6) {
          lots.shift();
        }
      }
    }
  }

  let totalMarginDebtTWD = 0;
  for (const lots of Object.values(marginLotsBySymbol)) {
    for (const lot of lots) {
      if (lot.shares > 1e-6) {
        const debtNative = lot.shares * lot.debtPerShare;
        const debtTWD = lot.currency === 'USD' ? debtNative * usdToTwdRate : debtNative;
        totalMarginDebtTWD += debtTWD;
      }
    }
  }

  return Math.round(totalMarginDebtTWD);
}




/**
 * 取得槓桿風險等級的中文標籤、主題顏色與說明
 */
export function getLeverageRiskInfo(tier: LeverageRiskTier): LeverageRiskTierInfo {
  switch (tier) {
    case 'CONSERVATIVE':
      return {
        tier: 'CONSERVATIVE',
        label: '穩健無槓桿 (≤1.0x)',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        description: '手頭現金充裕或未啟動借貸槓桿，處於極高安全防守區間，無強制平倉風險。',
      };
    case 'MODERATE':
      return {
        tier: 'MODERATE',
        label: '溫和槓桿 (1.0x~1.3x)',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        description: '適度運用低成本借款或質押放大投資收益，資產波動與負債在良好可控範圍。',
      };
    case 'ELEVATED':
      return {
        tier: 'ELEVATED',
        label: '積極擴張 (1.3x~1.6x)',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        description: '財務槓桿偏高，若遭遇大盤 15%~20% 劇烈回檔需密切留意質押維持率與現金流。',
      };
    case 'HIGH_RISK':
      return {
        tier: 'HIGH_RISK',
        label: '極度危險 (>1.6x)',
        badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
        description: '財務槓桿高度集中或資不抵債，面對黑天鵝極端行情容易引發流動性斷頭危機。',
      };
  }
}


/**
 * 計算整戶總曝險與淨槓桿率 (Portfolio Gross/Net Exposure & Leverage Engine)
 */
export function calculatePortfolioExposure(params: CalculateExposureParams): PortfolioExposureMetrics {
  const { holdings, cashBalances, inTransitSummary, loans, usdToTwdRate, asOfDate, receivableDividendsTWD = 0 } = params;

  // 1. 計算所有股票現值 (折合 TWD)
  let totalStockValueTWD = 0;
  for (const h of holdings) {
    if (h.shares <= 0) continue;
    const price = h.currentPrice || (h.totalCostBasis / h.shares);
    const valNative = h.shares * price;
    const valTWD = h.currency === 'USD' ? valNative * usdToTwdRate : valNative;
    totalStockValueTWD += valTWD;
  }

  // 2. 計算可用現金 (含在途淨額)
  const twdCash = cashBalances.TWD || 0;
  const usdCashInTWD = (cashBalances.USD || 0) * usdToTwdRate;
  const inTransitNet = inTransitSummary?.netSettlementTWD || 0;
  const totalAvailableCashTWD = twdCash + usdCashInTWD + inTransitNet;

  // 3. 計算總借款負債 (本金 + 應計利息 + 設質規費 + 在席融資買進未償借款)
  let totalDebtTWD = 0;
  for (const loan of loans) {
    if (!loan.principal || loan.principal <= 0) continue;
    const payoff = calculateLoanInterestAndPayoff(loan, asOfDate);
    const debtNative = payoff.totalPayoffAmount;
    const debtTWD = loan.currency === 'USD' ? debtNative * usdToTwdRate : debtNative;
    totalDebtTWD += debtTWD;
  }

  const marginDebtTWD = params.trades ? calculateActiveMarginDebt(params.trades, usdToTwdRate) : 0;
  totalDebtTWD += marginDebtTWD;

  // 4. 計算帳戶淨資產 NAV
  const isZeroDebt = totalDebtTWD <= 0;
  let effectiveNavTWD = totalStockValueTWD + totalAvailableCashTWD + receivableDividendsTWD - totalDebtTWD;
  if (isZeroDebt && totalAvailableCashTWD <= 0 && receivableDividendsTWD <= 0) {
    effectiveNavTWD = totalStockValueTWD;
  }
  let isUnderwater = !isZeroDebt && effectiveNavTWD <= 0;

  // 5. 總曝險額 (等同總股票市值)
  const grossExposureTWD = totalStockValueTWD;

  // 6. 計算槓桿率與淨曝險比率（基底現貨為 1.00x，非 0.00x 跳變）
  let grossLeverage = 1.0;
  let netLeverage = 1.0;

  if (effectiveNavTWD > 0) {
    grossLeverage = totalStockValueTWD / effectiveNavTWD;

    netLeverage = totalStockValueTWD / effectiveNavTWD;
  } else if (!isZeroDebt) {
    grossLeverage = totalStockValueTWD > 0 ? 99.99 : 0;
    netLeverage = 99.99;
    isUnderwater = true;
  }

  const netExposureRatioPercent = effectiveNavTWD > 0
    ? (totalStockValueTWD / effectiveNavTWD) * 100
    : 100;

  // 7. 現金佔淨資產比率
  const navTWD = isZeroDebt && (totalAvailableCashTWD + receivableDividendsTWD) <= 0 ? totalStockValueTWD : (totalStockValueTWD + totalAvailableCashTWD + receivableDividendsTWD - totalDebtTWD);
  const cashToNavRatio = navTWD > 0 ? (totalAvailableCashTWD / navTWD) : 0;

  // 8. 判定風險等級
  let riskTier: LeverageRiskTier = 'CONSERVATIVE';
  if (isUnderwater || (!isZeroDebt && netLeverage > 1.6)) {
    riskTier = 'HIGH_RISK';
  } else if (!isZeroDebt && netLeverage > 1.3) {
    riskTier = 'ELEVATED';
  } else if (!isZeroDebt && netLeverage > 1.0) {
    riskTier = 'MODERATE';
  } else {
    riskTier = 'CONSERVATIVE';
  }

  const riskInfo = getLeverageRiskInfo(riskTier);

  return {
    totalStockValueTWD,
    totalAvailableCashTWD,
    totalDebtTWD,
    navTWD,
    grossExposureTWD,
    grossLeverage,
    netLeverage,
    cashToNavRatio,
    riskTier,
    riskInfo,
    isUnderwater,
    effectiveNavTWD,
    marginDebtTWD,
    netExposureRatioPercent,
  };
}

