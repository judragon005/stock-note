import { inferMarketFromSymbol } from '../utils/formatters';
import {
  TargetAllocationConfig,
  RebalanceItemRecommendation,
  RebalancePlanResult,
  RebalanceItemStatus,
  RebalanceAction,
  AssetClassClassification,
  EtfNavPremiumValidationResult,
  ZavyRebalanceStrategyMode,
  AssetClassRebalancePlanResult,
  DividendRedirectPlan,
  DebtRepaymentRecommendation,
  WaterfallSellTierItem,
  AssetClassCategory,
} from '../types/allocation';
import { HoldingPosition, MarketType, Currency, StockPosition, StockHolding } from '../types/stock';

export type {
  AssetClassCategory,
  AssetClassSubCategory,
  EtfNavPremiumStatus,
} from '../types/allocation';

/**
 * 下單規格單位結構
 */
export interface OrderUnitsResult {
  shares: number;
  lotsSummary: string;
}

/**
 * 依據偏離度數值與容忍門檻評定健康度等級
 */
export function evaluateDriftStatus(
  driftPercent: number,
  toleranceBandPercent: number
): RebalanceItemStatus {
  const absDrift = Math.abs(driftPercent);
  if (absDrift <= toleranceBandPercent) {
    return 'BALANCED';
  }
  if (absDrift <= toleranceBandPercent * 2) {
    return 'MILD_DRIFT';
  }
  return 'SEVERE_DRIFT';
}

/**
 * 計算總投資組合市值 (包含台股、美股與可用現金，折算 TWD)
 */
export function calculateTotalPortfolioValue(
  holdings: HoldingPosition[],
  cashBalanceTwd: number = 0,
  usdToTwdRate: number = 32
): {
  totalPortfolioValueTwd: number;
  twHoldingValueTwd: number;
  usHoldingValueTwd: number;
  cashBalanceTwd: number;
} {
  const activeHoldings = holdings.filter((h) => h.shares > 0);
  const twHoldingValueTwd = activeHoldings
    .filter((h) => h.market === 'TW')
    .reduce((sum, h) => sum + h.marketValue, 0);

  const usHoldingValueTwd = activeHoldings
    .filter((h) => h.market === 'US')
    .reduce((sum, h) => sum + h.marketValue * usdToTwdRate, 0);

  const cleanCash = Math.max(0, cashBalanceTwd);
  const totalPortfolioValueTwd = twHoldingValueTwd + usHoldingValueTwd + cleanCash;

  return {
    totalPortfolioValueTwd,
    twHoldingValueTwd,
    usHoldingValueTwd,
    cashBalanceTwd: cleanCash,
  };
}

/**
 * 將建議金額換算為建議下單股數與張數描述
 */
export function convertAmountToOrderUnits(
  market: MarketType | undefined,
  price: number,
  amountTwd: number,
  currency: Currency,
  usdToTwdRate: number
): OrderUnitsResult {
  if (price <= 0 || amountTwd <= 0) {
    return { shares: 0, lotsSummary: '0 股' };
  }

  const effectiveRate = currency === 'USD' ? usdToTwdRate : 1;
  const priceInTwd = price * effectiveRate;
  const rawShares = amountTwd / priceInTwd;

  if (market === 'US') {
    const shares = Number(rawShares.toFixed(3));
    return {
      shares,
      lotsSummary: `${shares} 股`,
    };
  }

  // 台股預設整數股
  const integerShares = Math.floor(rawShares);
  const lots = Math.floor(integerShares / 1000);
  const oddShares = integerShares % 1000;

  let lotsSummary = `${integerShares} 股`;
  if (lots > 0 && oddShares > 0) {
    lotsSummary = `${lots} 張 + ${oddShares} 股`;
  } else if (lots > 0) {
    lotsSummary = `${lots} 張`;
  }

  return {
    shares: integerShares,
    lotsSummary,
  };
}

/**
 * 預估交易摩擦成本 (台股手續費 0.1425% + 現股賣稅 0.3%，美股預設 0)
 */
export function estimateTransactionFriction(
  market: MarketType | undefined,
  action: RebalanceAction,
  amountTwd: number
): number {
  if (action === 'HOLD' || amountTwd <= 0) return 0;
  if (market === 'TW') {
    const fee = amountTwd * 0.001425;
    const tax = action === 'SELL' ? amountTwd * 0.003 : 0;
    return Math.max(1, Math.round(fee + tax));
  }
  return 0; // 美股主流零佣金
}

/**
 * 偏離度分析引擎：計算各標的之當前佔比、目標佔比與偏離狀態
 */
export function calculateAllocationDrift(
  config: TargetAllocationConfig,
  holdings: HoldingPosition[],
  cashBalanceTwd: number = 0,
  usdToTwdRate: number = 32
): RebalanceItemRecommendation[] {
  const activeHoldings = holdings.filter((h) => h.shares > 0);
  const { totalPortfolioValueTwd, twHoldingValueTwd, usHoldingValueTwd } =
    calculateTotalPortfolioValue(holdings, cashBalanceTwd, usdToTwdRate);

  const tolerance = config.toleranceBandPercent || 5.0;

  // 1. 市場維度試算 (TW / US / CASH)
  if (config.type === 'MARKET') {
    return config.items.map((item) => {
      let currentValueTwd = 0;
      let name = item.name || item.key;
      let market: MarketType | undefined;
      let currency: Currency = 'TWD';
      let currentPrice = 1;

      if (item.key === 'TW') {
        currentValueTwd = twHoldingValueTwd;
        market = 'TW';
        name = name || '台股部位 (TW)';
      } else if (item.key === 'US') {
        currentValueTwd = usHoldingValueTwd;
        market = 'US';
        currency = 'USD';
        name = name || '美股部位 (US)';
      } else if (item.key === 'CASH') {
        currentValueTwd = Math.max(0, cashBalanceTwd);
        name = name || '現金與儲備 (CASH)';
      }

      const currentPercent =
        totalPortfolioValueTwd > 0 ? (currentValueTwd / totalPortfolioValueTwd) * 100 : 0;
      const driftPercent = Number((currentPercent - item.targetPercent).toFixed(2));
      const status = evaluateDriftStatus(driftPercent, tolerance);

      return {
        key: item.key,
        name,
        market,
        currency,
        currentPrice,
        currentValueTwd,
        currentPercent: Number(currentPercent.toFixed(2)),
        targetPercent: item.targetPercent,
        driftPercent,
        status,
        action: 'HOLD',
        recommendedAmountTwd: 0,
        recommendedAmountOriginal: 0,
        recommendedShares: 0,
      };
    });
  }

  // 2. 個股維度試算 (Symbol-level)
  const targetSymbolSet = new Set(config.items.map((i) => i.key.toUpperCase()));
  const directItems: RebalanceItemRecommendation[] = config.items.map((item) => {
    const symbolKey = item.key.toUpperCase();
    const holding = activeHoldings.find((h) => h.symbol.toUpperCase() === symbolKey);

    const market: MarketType = holding ? holding.market : inferMarketFromSymbol(symbolKey);
    const currency: Currency = holding ? holding.currency : market === 'US' ? 'USD' : 'TWD';
    const currentPrice = holding ? holding.currentPrice : 0;
    const rate = currency === 'USD' ? usdToTwdRate : 1;
    const currentValueTwd = holding ? holding.marketValue * rate : 0;
    const name = holding ? holding.name || item.name || item.key : item.name || item.key;

    const currentPercent =
      totalPortfolioValueTwd > 0 ? (currentValueTwd / totalPortfolioValueTwd) * 100 : 0;
    const driftPercent = Number((currentPercent - item.targetPercent).toFixed(2));
    const status = evaluateDriftStatus(driftPercent, tolerance);

    return {
      key: item.key,
      name,
      market,
      currency,
      currentPrice,
      currentValueTwd,
      currentPercent: Number(currentPercent.toFixed(2)),
      targetPercent: item.targetPercent,
      driftPercent,
      status,
      action: 'HOLD',
      recommendedAmountTwd: 0,
      recommendedAmountOriginal: 0,
      recommendedShares: 0,
    };
  });

  // 納入不在目標配置中但在席持有的標的 (目標 0%，建議出清)
  const nonTargetItems: RebalanceItemRecommendation[] = activeHoldings
    .filter((h) => !targetSymbolSet.has(h.symbol.toUpperCase()))
    .map((h) => {
      const rate = h.currency === 'USD' ? usdToTwdRate : 1;
      const currentValueTwd = h.marketValue * rate;
      const currentPercent =
        totalPortfolioValueTwd > 0 ? (currentValueTwd / totalPortfolioValueTwd) * 100 : 0;
      const driftPercent = Number(currentPercent.toFixed(2));

      return {
        key: h.symbol,
        name: h.name || h.symbol,
        market: h.market,
        currency: h.currency,
        currentPrice: h.currentPrice,
        currentValueTwd,
        currentPercent: Number(currentPercent.toFixed(2)),
        targetPercent: 0,
        driftPercent,
        status: 'SEVERE_DRIFT',
        action: 'HOLD',
        recommendedAmountTwd: 0,
        recommendedAmountOriginal: 0,
        recommendedShares: 0,
      };
    });

  return [...directItems, ...nonTargetItems];
}

/**
 * 定期注水加碼再平衡演算法 (Cash-in Only)
 * 優先補足低配標的，絕不賣出任何持股
 */
export function generateCashInRebalancePlan(
  config: TargetAllocationConfig,
  holdings: HoldingPosition[],
  cashInflowTwd: number,
  cashBalanceTwd: number = 0,
  usdToTwdRate: number = 32
): RebalancePlanResult {
  const driftItems = calculateAllocationDrift(config, holdings, cashBalanceTwd, usdToTwdRate);

  const { totalPortfolioValueTwd } = calculateTotalPortfolioValue(holdings, cashBalanceTwd, usdToTwdRate);
  const newTotalValueTwd = totalPortfolioValueTwd + cashInflowTwd;
  const tolerance = config.toleranceBandPercent || 5.0;

  // 1. 計算各標的理論目標市值與資金缺口
  const gapItems = driftItems.map((item) => {
    const targetValueTwd = (newTotalValueTwd * item.targetPercent) / 100;
    const gapTwd = Math.max(0, targetValueTwd - item.currentValueTwd);
    return {
      ...item,
      targetValueTwd,
      gapTwd,
    };
  });

  const totalGapTwd = gapItems.reduce((sum, i) => sum + i.gapTwd, 0);
  let totalBuyAmountTwd = 0;
  let totalFrictionTwd = 0;

  // 2. 分配注水資金
  const recommendations: RebalanceItemRecommendation[] = gapItems.map((item) => {
    let allocatedTwd = 0;

    if (cashInflowTwd > 0) {
      if (totalGapTwd <= cashInflowTwd) {
        // 資金充足：完全補足缺口，剩餘現金等比分配
        const remainingCash = cashInflowTwd - totalGapTwd;
        allocatedTwd = item.gapTwd + (remainingCash * item.targetPercent) / 100;
      } else {
        // 資金不足：依缺口比例分配
        allocatedTwd = totalGapTwd > 0 ? cashInflowTwd * (item.gapTwd / totalGapTwd) : 0;
      }
    }

    allocatedTwd = Math.round(allocatedTwd);
    const action: RebalanceAction = allocatedTwd > 50 ? 'BUY' : 'HOLD';
    const effectiveRate = item.currency === 'USD' ? usdToTwdRate : 1;
    const amountOriginal = Number((allocatedTwd / effectiveRate).toFixed(2));

    const units = convertAmountToOrderUnits(
      item.market,
      item.currentPrice,
      allocatedTwd,
      item.currency,
      usdToTwdRate
    );

    if (action === 'BUY') {
      totalBuyAmountTwd += allocatedTwd;
      totalFrictionTwd += estimateTransactionFriction(item.market, 'BUY', allocatedTwd);
    }

    return {
      key: item.key,
      name: item.name,
      market: item.market,
      currency: item.currency,
      currentPrice: item.currentPrice,
      currentValueTwd: item.currentValueTwd,
      currentPercent: item.currentPercent,
      targetPercent: item.targetPercent,
      driftPercent: item.driftPercent,
      status: item.status,
      action,
      recommendedAmountTwd: allocatedTwd,
      recommendedAmountOriginal: amountOriginal,
      recommendedShares: units.shares,
      recommendedLotsSummary: units.lotsSummary,
    };
  });

  const isFullyBalanced = recommendations.every((r) => r.status === 'BALANCED');

  return {
    mode: 'CASH_IN',
    totalPortfolioValueTwd,
    newTotalValueTwd,
    cashInflowTwd,
    isFullyBalanced,
    toleranceBandPercent: tolerance,
    recommendations,
    summary: {
      totalBuyAmountTwd,
      totalSellAmountTwd: 0,
      estimatedFrictionTwd: totalFrictionTwd,
    },
  };
}

/**
 * 全量買賣再平衡演算法 (Full Rebalancing)
 * 嚴格重置至目標權重，計算超配賣出與低配買進
 */
export function generateFullRebalancePlan(
  config: TargetAllocationConfig,
  holdings: HoldingPosition[],
  cashBalanceTwd: number = 0,
  usdToTwdRate: number = 32
): RebalancePlanResult {
  const activeHoldings = holdings.filter((h) => h.shares > 0);
  const driftItems = calculateAllocationDrift(config, holdings, cashBalanceTwd, usdToTwdRate);
  const { totalPortfolioValueTwd } = calculateTotalPortfolioValue(holdings, cashBalanceTwd, usdToTwdRate);
  const tolerance = config.toleranceBandPercent || 5.0;

  let totalBuyAmountTwd = 0;
  let totalSellAmountTwd = 0;
  let totalFrictionTwd = 0;

  const recommendations: RebalanceItemRecommendation[] = driftItems.map((item) => {
    const targetValueTwd = (totalPortfolioValueTwd * item.targetPercent) / 100;
    const diffTwd = targetValueTwd - item.currentValueTwd;

    let action: RebalanceAction = 'HOLD';
    let recommendedAmountTwd = 0;

    // 偏離超過容忍帶且金額顯著時建議調倉；若為非目標在倉持股 (targetPercent === 0 且在席持有)，一律建議出清
    const isExceededDrift = Math.abs(item.driftPercent) > tolerance && Math.abs(diffTwd) >= 1000;
    const isNonTargetLiquidate = item.targetPercent === 0 && item.currentValueTwd > 0;

    if (isExceededDrift || isNonTargetLiquidate) {
      if (diffTwd > 0) {
        action = 'BUY';
        recommendedAmountTwd = Math.round(diffTwd);
        totalBuyAmountTwd += recommendedAmountTwd;
        totalFrictionTwd += estimateTransactionFriction(item.market, 'BUY', recommendedAmountTwd);
      } else if (diffTwd < 0) {
        action = 'SELL';
        recommendedAmountTwd = Math.round(Math.abs(diffTwd));
        totalSellAmountTwd += recommendedAmountTwd;
        totalFrictionTwd += estimateTransactionFriction(item.market, 'SELL', recommendedAmountTwd);
      }
    }

    const effectiveRate = item.currency === 'USD' ? usdToTwdRate : 1;
    const recommendedAmountOriginal = Number((recommendedAmountTwd / effectiveRate).toFixed(2));

    let units = convertAmountToOrderUnits(
      item.market,
      item.currentPrice,
      recommendedAmountTwd,
      item.currency,
      usdToTwdRate
    );

    if (isNonTargetLiquidate && action === 'SELL') {
      const pos = activeHoldings.find((h) => h.symbol.toUpperCase() === item.key.toUpperCase());
      if (pos && pos.shares > 0) {
        units = {
          shares: pos.shares,
          lotsSummary: `${pos.shares} 股`,
        };
      }
    }

    return {
      key: item.key,
      name: item.name,
      market: item.market,
      currency: item.currency,
      currentPrice: item.currentPrice,
      currentValueTwd: item.currentValueTwd,
      currentPercent: item.currentPercent,
      targetPercent: item.targetPercent,
      driftPercent: item.driftPercent,
      status: item.status,
      action,
      recommendedAmountTwd,
      recommendedAmountOriginal,
      recommendedShares: units.shares,
      recommendedLotsSummary: units.lotsSummary,
    };
  });

  const isFullyBalanced = recommendations.every((r) => r.status === 'BALANCED');

  return {
    mode: 'FULL_REBALANCE',
    totalPortfolioValueTwd,
    newTotalValueTwd: totalPortfolioValueTwd,
    cashInflowTwd: 0,
    isFullyBalanced,
    toleranceBandPercent: tolerance,
    recommendations,
    summary: {
      totalBuyAmountTwd,
      totalSellAmountTwd,
      estimatedFrictionTwd: totalFrictionTwd,
    },
  };
}

// ==========================================
// Zavy 慢富大類資產分類器與 ETF 折溢價守門員
// ==========================================

/**
 * Zavy 慢富大類資產分類器
 * 依據標的代碼、名稱精準分流為：
 * 1. BOND_GOV (純公債 / 國庫券)：真避險防彈衣
 *    - 長天期 (BOND_GOV_LONG): 00679B, 00687B, 00795B, 00764B, TLT, VGLT, EDV 等
 *    - 中天期 (BOND_GOV_MID): 00697B, 00718B, IEF, VGIT, BNDW 等
 *    - 短天期 (BOND_GOV_SHORT): 00719B, 00865B, SHY, SGOV, BIL 等
 * 2. BOND_CORP_IG (投資級公司債)：00720B, 00725B, 00751B, 00772B, 00937B, LQD, VCIT 等 (防禦性風險資產，非純避險)
 * 3. GOLD (黃金)：00635U, GLD, IAU 等真避險防彈衣
 * 4. REITS (房地產信託)：
 *    - 權益型：VNQ, IYR, XLRE 等
 *    - 抵押權型 mREITs (00712, NLY, AGNC 等)：剔除於核心資產
 * 5. EQUITY (股票)：
 *    - 市值核心：0050, 006208, 00692, VTI, VOO, QQQ, VT 等
 *    - 高股息：00878, 00919, 00929, 0056, 00713, VYM, SCHD 等
 *    - 衛星個股：2330, AAPL, NVDA 等
 * 6. 剔除池 (EXCLUDED)：
 *    - 槓桿反向：00631L, 00632R, 00680L, TQQQ, SQQQ, SOXL, TMF 等 (警示時間價值耗損)
 *    - 抵押權型 mREITs：00712 等 (警示信用槓桿與中斷風險)
 * 7. CASH (現金)：CASH, USD_CASH, TWD_CASH
 */
export function classifyZavyAssetClass(
  stockOrSymbol: StockPosition | StockHolding | { symbol: string; name?: string; market?: MarketType } | string
): AssetClassClassification {
  const symbol = (typeof stockOrSymbol === 'string' ? stockOrSymbol : stockOrSymbol.symbol || '').trim().toUpperCase();
  const name = (typeof stockOrSymbol === 'object' && stockOrSymbol.name ? stockOrSymbol.name : '').trim();

  // 1. 現金識別
  if (
    symbol === 'CASH' ||
    symbol === 'TWD_CASH' ||
    symbol === 'USD_CASH' ||
    symbol.includes('現金') ||
    name.includes('現金')
  ) {
    return {
      category: 'CASH',
      subCategory: 'CASH',
      isExcluded: false,
      isTrueDefensive: true,
    };
  }

  // 2. 槓桿與反向型 ETF (剔除池)
  // 台股正2/反1代碼規則：通常結尾帶 L 或 R（如 00631L, 00632R, 00680L, 00675L, 00670L, 00671R 等）
  const isTwLeveragedOrInverse = /^\d{5}[LR]$/i.test(symbol);
  // 美股常見槓桿反向代碼清單
  const usLeveragedOrInverseSet = new Set([
    'TQQQ', 'SQQQ', 'UPRO', 'SPXU', 'SSO', 'SDS', 'SOXL', 'SOXS', 'TMF', 'TMV',
    'QLD', 'QID', 'FNGU', 'FNGD', 'NUGT', 'DUST', 'JNUG', 'JDST', 'LABU', 'LABD',
    'UVXY', 'SVXY', 'VIXY', 'YANG', 'YINN'
  ]);
  const isNameLeveragedOrInverse =
    name.includes('正2') ||
    name.includes('正3') ||
    name.includes('反1') ||
    name.includes('反2') ||
    name.includes('槓桿') ||
    name.includes('反向') ||
    /leveraged|inverse|2x|3x|-2x|-3x/i.test(name);

  if (isTwLeveragedOrInverse || usLeveragedOrInverseSet.has(symbol) || isNameLeveragedOrInverse) {
    return {
      category: 'EQUITY',
      subCategory: 'EXCLUDED',
      isExcluded: true,
      exclusionReason: 'LEVERAGED_INVERSE',
      warningMessage: '槓桿與反向型標的帶有時間價值耗損，嚴禁納入慢富被動長期資產配置。',
      isTrueDefensive: false,
    };
  }

  // 3. 抵押權型 mREITs (剔除池)
  const mortgageReitSymbols = new Set(['00712', 'NLY', 'AGNC', 'TWO', 'NRZ', 'DX', 'CIM', 'MFA']);
  const isNameMortgageReit = name.includes('富時不動產') || name.includes('抵押權') || /mortgage reit/i.test(name);
  if (mortgageReitSymbols.has(symbol) || isNameMortgageReit) {
    return {
      category: 'REITS',
      subCategory: 'EXCLUDED',
      isExcluded: true,
      exclusionReason: 'MORTGAGE_REIT',
      warningMessage: '抵押權型 mREITs 包含借短買長利率放大風險與信用槓桿，不具備抗通膨實物地產屬性，剔除於慢富核心資產。',
      isTrueDefensive: false,
    };
  }

  // 4. 黃金 (GOLD)
  const goldSymbols = new Set(['00635U', 'GLD', 'IAU', 'GLDM', 'SGOL', 'BAR']);
  const isGoldName = name.includes('黃金') || /gold/i.test(name);
  if (goldSymbols.has(symbol) || isGoldName) {
    return {
      category: 'GOLD',
      subCategory: 'GOLD',
      isExcluded: false,
      isTrueDefensive: true,
    };
  }

  // 5. 權益型 REITs
  const equityReitSymbols = new Set(['VNQ', 'IYR', 'XLRE', 'SCHH', 'REET', '00714']);
  const isEquityReitName = name.includes('道瓊美國地產') || name.includes('房地產信託') || /real estate/i.test(name);
  if (equityReitSymbols.has(symbol) || isEquityReitName) {
    return {
      category: 'REITS',
      subCategory: 'REITS_EQUITY',
      isExcluded: false,
      isTrueDefensive: false,
    };
  }

  // 6. 投資級公司債 (BOND_CORP_IG)
  const igBondSymbols = new Set([
    '00720B', '00725B', '00751B', '00772B', '00937B', '00740B', '00773B', '00780B', '00781B', '00782B',
    'LQD', 'VCIT', 'VCSH', 'IGSB', 'USIG', 'SPLB'
  ]);
  const isIgBondName =
    name.includes('公司債') ||
    name.includes('投資級') ||
    name.includes('投等債') ||
    name.includes('金融債') ||
    name.includes('產業債') ||
    /corporate bond|investment grade/i.test(name);

  if (igBondSymbols.has(symbol) || (isIgBondName && !name.includes('公債') && !name.includes('美債'))) {
    return {
      category: 'BOND_CORP_IG',
      subCategory: 'BOND_CORP_IG',
      isExcluded: false,
      isTrueDefensive: false, // 帶有信用利差風險，非真避險防彈衣
    };
  }

  // 7. 純政府公債 (BOND_GOV)
  // 7a. 長天期美債 (20Y+)
  const govLongSymbols = new Set(['00679B', '00687B', '00795B', '00764B', '00696B', '00768B', 'TLT', 'VGLT', 'EDV', 'ZROZ', 'GOVZ', 'SPTL']);
  const isGovLongName = (name.includes('美債') || name.includes('公債')) && (name.includes('20') || name.includes('25') || /20\+?\s*year/i.test(name));
  if (govLongSymbols.has(symbol) || isGovLongName) {
    return {
      category: 'BOND_GOV',
      subCategory: 'BOND_GOV_LONG',
      isExcluded: false,
      isTrueDefensive: true,
    };
  }

  // 7b. 短天期公債 / 國庫券 (1-3Y / 0-3M)
  const govShortSymbols = new Set(['00719B', '00865B', 'SHY', 'SGOV', 'BIL', 'GBIL', 'VGSH', 'CLIP', 'TBIL']);
  const isGovShortName = (name.includes('美債') || name.includes('公債')) && (name.includes('1-3') || name.includes('國庫券') || /1-3\s*year|treasury bill/i.test(name));
  if (govShortSymbols.has(symbol) || isGovShortName) {
    return {
      category: 'BOND_GOV',
      subCategory: 'BOND_GOV_SHORT',
      isExcluded: false,
      isTrueDefensive: true,
    };
  }

  // 7c. 中天期 / 綜合型公債 (7-10Y, 綜合債)
  const govMidSymbols = new Set(['00697B', '00718B', 'IEF', 'VGIT', 'IEI', 'BNDW', 'BND', 'GOVT', 'AGG']);
  const isGovMidName = (name.includes('美債') || name.includes('公債')) && (name.includes('7-10') || /7-10\s*year/i.test(name));
  if (govMidSymbols.has(symbol) || isGovMidName) {
    return {
      category: 'BOND_GOV',
      subCategory: 'BOND_GOV_MID',
      isExcluded: false,
      isTrueDefensive: true,
    };
  }

  // 8. 股票型 (EQUITY)
  // 8a. 市值核心型 ETF
  const coreEquitySymbols = new Set(['0050', '006208', '00692', '00850', 'VTI', 'VOO', 'SPY', 'IVV', 'QQQ', 'VT', 'VEA', 'VWO', 'IWM', 'DIA', '00646']);
  if (coreEquitySymbols.has(symbol)) {
    return {
      category: 'EQUITY',
      subCategory: 'EQUITY_CORE',
      isExcluded: false,
      isTrueDefensive: false,
    };
  }

  // 8b. 高股息型 ETF
  const dividendEquitySymbols = new Set(['0056', '00878', '00919', '00929', '00713', '00940', '00918', '00915', '00939', '00934', '00936', 'VYM', 'SCHD', 'DVY', 'HDV', 'DGRO']);
  const isDividendName = name.includes('高股息') || name.includes('高息') || /high dividend/i.test(name);
  if (dividendEquitySymbols.has(symbol) || isDividendName) {
    return {
      category: 'EQUITY',
      subCategory: 'EQUITY_DIVIDEND',
      isExcluded: false,
      isTrueDefensive: false,
    };
  }

  // 8c. 預設一般個股 / 波段衛星
  return {
    category: 'EQUITY',
    subCategory: 'EQUITY_SATELLITE',
    isExcluded: false,
    isTrueDefensive: false,
  };
}

/**
 * ETF 折溢價平價替代標的字典對照表
 */
const ETF_NAV_PEER_ALTERNATIVES: Record<string, string[]> = {
  // 長天期美債
  '00679B': ['00687B', '00795B'],
  '00687B': ['00679B', '00795B'],
  '00795B': ['00679B', '00687B'],
  '00764B': ['00687B', '00795B'],
  // 中短天期公債
  '00697B': ['IEF', 'VGIT'],
  '00719B': ['00865B', 'SGOV'],
  '00865B': ['00719B', 'SHY'],
  // 投資級公司債
  '00720B': ['00725B', '00751B'],
  '00725B': ['00720B', '00751B'],
  '00751B': ['00720B', '00772B'],
  '00772B': ['00720B', '00751B'],
  '00937B': ['00720B', '00751B', '00772B'],
  // 市值型核心
  '0050': ['006208'],
  '006208': ['0050'],
  'VOO': ['IVV', 'SPLG', 'SPY'],
  'SPY': ['VOO', 'IVV', 'SPLG'],
  'QQQ': ['QQQM'],
  // 高股息
  '00878': ['0056', '00713', '00919'],
  '0056': ['00878', '00713', '00919'],
  '00919': ['00878', '00713', '0056'],
  '00929': ['00878', '00919', '00713'],
  '00713': ['00878', '0056', '00919'],
  // 黃金
  '00635U': ['GLD', 'IAU'],
};

/**
 * ETF 即時/日度折溢價守門員 (validateEtfNavPremium)
 * @param symbol 標的代碼
 * @param premiumRate 溢價率 % (例如 0.8 代表溢價 0.8%，-0.3 代表折價 0.3%)
 * @param thresholdPercent 高溢價攔截臨界值 % (預設 1.0%)
 */
export function validateEtfNavPremium(
  symbol: string,
  premiumRate: number,
  thresholdPercent: number = 1.0
): EtfNavPremiumValidationResult {
  const cleanSymbol = symbol.trim().toUpperCase();

  // 1. 高溢價風險攔截 (> thresholdPercent, 預設 1.0%)
  if (premiumRate > thresholdPercent) {
    const peers = ETF_NAV_PEER_ALTERNATIVES[cleanSymbol];
    const suggestedAlternatives = peers && peers.length > 0 ? peers : undefined;
    const peerText = suggestedAlternatives ? `，建議轉向同類型平價替代標的 (${suggestedAlternatives.join('、')})` : '';

    return {
      symbol: cleanSymbol,
      premiumRate,
      status: 'HIGH_PREMIUM_RISK',
      isBlocked: true,
      warningMessage: `⚠️ ${cleanSymbol} 當前溢價率高達 +${premiumRate.toFixed(2)}%，已突破門檻 (+${thresholdPercent.toFixed(1)}%)，嚴禁追價買貴${peerText}。`,
      suggestedAlternatives,
    };
  }

  // 2. 輕度溢價警示 (0.5% ~ thresholdPercent)
  if (premiumRate > 0.5) {
    return {
      symbol: cleanSymbol,
      premiumRate,
      status: 'ELEVATED_PREMIUM_WARNING',
      isBlocked: false,
      warningMessage: `ℹ️ ${cleanSymbol} 處於輕度溢價 (+${premiumRate.toFixed(2)}%)，建議分批或待折溢價收斂後再行建倉。`,
    };
  }

  // 3. 正常折溢價區間 (<= 0.5% 或折價)
  return {
    symbol: cleanSymbol,
    premiumRate,
    status: 'NORMAL',
    isBlocked: false,
  };
}

export interface CalculateAssetClassRebalanceOptions {
  config: TargetAllocationConfig;
  holdings: HoldingPosition[];
  cashBalanceTwd?: number;
  usdToTwdRate?: number;
  strategyMode?: ZavyRebalanceStrategyMode;
  annualEstimatedDividendsTwd?: number;
  activeLoanPrincipalTwd?: number;
  pledgedSharesMap?: Record<string, number>;
}

/**
 * Zavy 慢富大類資產再平衡與股息活水轉向引擎 (Spec 0221 Ticket 03)
 */
export function calculateAssetClassRebalancePlan(
  options: CalculateAssetClassRebalanceOptions
): AssetClassRebalancePlanResult {
  const {
    config,
    holdings,
    cashBalanceTwd = 0,
    usdToTwdRate = 32,
    strategyMode = 'NORMAL',
    annualEstimatedDividendsTwd = 0,
    activeLoanPrincipalTwd = 0,
    pledgedSharesMap = {},
  } = options;

  const toleranceBand = config.toleranceBandPercent ?? 5.0;
  const cleanCash = Math.max(0, cashBalanceTwd);

  // 1. 各大類資產市值聚合
  const categoryValues: Record<AssetClassCategory, number> = {
    EQUITY: 0,
    BOND_GOV: 0,
    BOND_CORP_IG: 0,
    GOLD: 0,
    REITS: 0,
    CASH: cleanCash,
  };

  const activeHoldings = holdings.filter((h) => h.shares > 0);
  const categorizedHoldings: Array<{
    holding: HoldingPosition;
    classification: AssetClassClassification;
    marketValueTwd: number;
  }> = [];

  for (const h of activeHoldings) {
    const classification = classifyZavyAssetClass(h);
    const fxRate = h.currency === 'USD' ? usdToTwdRate : 1;
    const valTwd = h.marketValue * fxRate;

    categorizedHoldings.push({
      holding: h,
      classification,
      marketValueTwd: valTwd,
    });

    if (!classification.isExcluded) {
      categoryValues[classification.category] = (categoryValues[classification.category] || 0) + valTwd;
    }
  }

  const totalPortfolioValueTwd = Object.values(categoryValues).reduce((a, b) => a + b, 0);

  // 2. 構建大類資產偏離度與建議
  const targetMap = new Map<string, { targetPercent: number; name?: string }>();
  for (const item of config.items) {
    targetMap.set(item.key, { targetPercent: item.targetPercent, name: item.name });
  }

  const categoryNameMap: Record<AssetClassCategory, string> = {
    EQUITY: '股票資產',
    BOND_GOV: '純政府公債防彈衣',
    BOND_CORP_IG: '投資級公司債',
    GOLD: '黃金儲備',
    REITS: '權益型房地產',
    CASH: '現金防護網',
  };

  const assetClassRecommendations: RebalanceItemRecommendation[] = [];
  let isFullyBalanced = true;

  // 遍歷所有在目標設定中的資產大類 (或有持倉的大類)
  const allCategories: AssetClassCategory[] = ['EQUITY', 'BOND_GOV', 'BOND_CORP_IG', 'GOLD', 'REITS', 'CASH'];
  const relevantCategories = allCategories.filter((cat) => targetMap.has(cat) || categoryValues[cat] > 0);

  for (const cat of relevantCategories) {
    const valTwd = categoryValues[cat] || 0;
    const currentPercent =
      totalPortfolioValueTwd > 0
        ? Number(((valTwd / totalPortfolioValueTwd) * 100).toFixed(1))
        : 0;

    const targetInfo = targetMap.get(cat);
    const targetPercent = targetInfo?.targetPercent ?? 0;
    const driftPercent = Number((currentPercent - targetPercent).toFixed(1));
    const status = evaluateDriftStatus(driftPercent, toleranceBand);

    if (status !== 'BALANCED') {
      isFullyBalanced = false;
    }

    let action: RebalanceAction = 'HOLD';
    let recommendedAmountTwd = 0;

    const idealTargetValTwd = Math.round((totalPortfolioValueTwd * targetPercent) / 100);
    const diffTwd = idealTargetValTwd - valTwd;

    if (driftPercent < -toleranceBand) {
      action = 'BUY';
      recommendedAmountTwd = Math.max(0, diffTwd);
    } else if (driftPercent > toleranceBand) {
      action = 'SELL';
      recommendedAmountTwd = Math.max(0, -diffTwd);
    }

    assetClassRecommendations.push({
      key: cat,
      name: targetInfo?.name || categoryNameMap[cat] || cat,
      currency: 'TWD',
      currentPrice: 1,
      currentValueTwd: valTwd,
      currentPercent,
      targetPercent,
      driftPercent,
      status,
      action,
      recommendedAmountTwd,
      recommendedAmountOriginal: recommendedAmountTwd,
      recommendedShares: 0,
      recommendedLotsSummary: `${Math.round(recommendedAmountTwd).toLocaleString()} 元`,
    });
  }

  // 3. 股票質押與負債償還建議
  let debtRepayment: DebtRepaymentRecommendation | undefined;
  if (activeLoanPrincipalTwd > 0) {
    const equityRec = assetClassRecommendations.find((r) => r.key === 'EQUITY');
    const equityOverweightTwd = equityRec && equityRec.action === 'SELL' ? equityRec.recommendedAmountTwd : 0;
    const recommendedRepayment = Math.min(
      activeLoanPrincipalTwd,
      equityOverweightTwd > 0 ? equityOverweightTwd : Math.round(activeLoanPrincipalTwd * 0.3)
    );

    debtRepayment = {
      hasActiveLoans: true,
      totalLoanPrincipalTwd: activeLoanPrincipalTwd,
      recommendedRepaymentAmountTwd: recommendedRepayment,
      rationale:
        '榮景期或股票超配時，負債即為負向債券；優先償還股票質押本金可直接降低維持率斷頭風險，強化防彈衣韌性。',
    };
  }

  // 4. 股息活水轉向 (DIVIDEND_REDIRECT)
  let dividendRedirectPlan: DividendRedirectPlan | undefined;
  if (strategyMode === 'DIVIDEND_REDIRECT' || annualEstimatedDividendsTwd > 0) {
    const underweightDefensives = assetClassRecommendations.filter(
      (r) => (r.key === 'BOND_GOV' || r.key === 'GOLD') && r.driftPercent < 0
    );

    const totalUnderweightTwd = underweightDefensives.reduce(
      (sum, r) => sum + r.recommendedAmountTwd,
      0
    );

    const redirectTargets = underweightDefensives.map((r) => {
      const shareRatio = totalUnderweightTwd > 0 ? r.recommendedAmountTwd / totalUnderweightTwd : 1 / underweightDefensives.length;
      const allocatedAmount = Math.round(annualEstimatedDividendsTwd * shareRatio);
      const suggestedSymbol = r.key === 'BOND_GOV' ? '00687B' : '00635U';
      const suggestedName = r.key === 'BOND_GOV' ? '國泰20年美債' : '期元大S&P黃金';

      return {
        category: r.key as AssetClassCategory,
        suggestedSymbol,
        suggestedName,
        allocatedAmountTwd: allocatedAmount,
        allocationPercent: Number((shareRatio * 100).toFixed(1)),
        rationale: `${r.name}目前低配 ${Math.abs(r.driftPercent)}%，利用每年 ${annualEstimatedDividendsTwd.toLocaleString()} 元股息活水導流買進，免賣股票存量無痛完成再平衡。`,
      };
    });

    dividendRedirectPlan = {
      annualEstimatedDividendsTwd,
      monthlyAverageDividendTwd: Math.round(annualEstimatedDividendsTwd / 12),
      targets: redirectTargets,
      guidanceMessage:
        '存量不動、增量轉向：高股息部位每年產生的現金流不再盲目滾入股票，全數導流至公債與黃金防彈衣，兼顧現金流與風險抗震力。',
    };
  }

  // 5. 四階減碼瀑布流 (Waterfall Sell Suggestions)
  const waterfallSellSuggestions: WaterfallSellTierItem[] = [];
  for (const item of categorizedHoldings) {
    const { holding, classification, marketValueTwd } = item;
    if (classification.category !== 'EQUITY') continue;

    let tier: 1 | 2 | 3 | 4 = 4;
    let tierName = '第四階：核心寬基底倉 (最後防線)';
    let reason = '市值型核心底倉，維持長線複利，非極端系統性衰退不減碼。';

    if (classification.subCategory === 'EQUITY_SATELLITE') {
      tier = 1;
      tierName = '第一階：波段個股/衛星 (優先減碼)';
      reason = '個別股票波動大且具非系統性風險，在股票超配或中期修正時優先獲利了結或停損。';
    } else if (classification.isExcluded) {
      tier = 1;
      tierName = '第一階：投機/槓桿標的 (立即出清)';
      reason = classification.warningMessage || '高風險槓桿反向標的，優先剔除。';
    } else if (classification.subCategory === 'EQUITY_DIVIDEND') {
      tier = 3;
      tierName = '第三階：高股息 ETF (維持存量)';
      reason = '高股息為現金流支柱，存量原則上不動，僅在極度超配時微調非設質部分。';
    }

    const pledgedShares = pledgedSharesMap[holding.symbol] || 0;
    const isPledged = pledgedShares > 0;
    const unpledgedShares = Math.max(0, holding.shares - pledgedShares);
    const canSell = unpledgedShares > 0;

    waterfallSellSuggestions.push({
      tier,
      tierName,
      symbol: holding.symbol,
      name: holding.name,
      marketValueTwd,
      shares: holding.shares,
      isPledged,
      pledgedShares,
      unpledgedShares,
      canSell,
      reason,
    });
  }

  // 依 Tier 由小到大排序 (Tier 1 優先減碼)
  waterfallSellSuggestions.sort((a, b) => a.tier - b.tier);

  return {
    mode: 'FULL_REBALANCE',
    strategyMode,
    totalPortfolioValueTwd,
    newTotalValueTwd: totalPortfolioValueTwd,
    cashInflowTwd: 0,
    isFullyBalanced,
    toleranceBandPercent: toleranceBand,
    recommendations: assetClassRecommendations,
    assetClassRecommendations,
    summary: {
      totalBuyAmountTwd: assetClassRecommendations
        .filter((r) => r.action === 'BUY')
        .reduce((sum, r) => sum + r.recommendedAmountTwd, 0),
      totalSellAmountTwd: assetClassRecommendations
        .filter((r) => r.action === 'SELL')
        .reduce((sum, r) => sum + r.recommendedAmountTwd, 0),
      estimatedFrictionTwd: 0,
    },
    dividendRedirectPlan,
    debtRepayment,
    waterfallSellSuggestions,
  };
}
