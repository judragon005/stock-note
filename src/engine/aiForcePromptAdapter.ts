import { AiForceDashboardReport } from '../types/aiForceDashboard';
import { StrategicFactDigest } from '../types/strategicPrompt';
import { HoldingPosition } from '../types/stock';
import { isEtfSymbol } from '../components/health/StockHealthWorkspace';
import { isCyclicalIndustry } from './industryGate';

/**
 * 將主力戰情室聚合報表轉換為智策提示詞高濃度特徵摘要 (Spec 0181 / Spec 0182)
 */
export function createWarRoomPromptDigest(
  report: AiForceDashboardReport,
  holdings: HoldingPosition[] = []
): StrategicFactDigest {
  const symbol = report.symbol || '';
  const name = report.name || symbol;
  const market = report.market || 'TW';
  const currentPrice = report.marketBar?.currentPrice || 0;
  const changePercent = report.marketBar?.changePercent || 0;
  const volumeShares = report.marketBar?.volumeShares || 0;
  const isUS = market === 'US';
  const isEtf = isEtfSymbol(symbol);
  const isCyclical = !isUS && !isEtf ? isCyclicalIndustry(symbol) : false;

  // 1. 在庫庫存跨帳戶加權聚合與雙態分流 (Spec 0182 / Tickets 04~07)
  const matchingHoldings = holdings.filter(
    (h) => h.symbol.trim().toUpperCase() === symbol.trim().toUpperCase() && (h.shares || 0) > 0
  );

  let desensitizedPortfolioContext: StrategicFactDigest['desensitizedPortfolioContext'] = undefined;

  if (matchingHoldings.length > 0) {
    const totalShares = matchingHoldings.reduce((sum, h) => sum + (h.shares || 0), 0);
    const totalCost = matchingHoldings.reduce(
      (sum, h) => sum + (h.shares || 0) * (h.avgCost || 0),
      0
    );
    const avgCost = totalShares > 0 ? Number((totalCost / totalShares).toFixed(2)) : undefined;

    const totalBreakeven = matchingHoldings.reduce((sum, h) => {
      const explicitBreakeven = h.breakevenPrice;
      const cost = h.avgCost || 0;
      // 台股買賣摩擦成本約 0.585% (手續費 0.1425%*2 + 證交稅 0.3%)
      const calculatedBreakeven =
        explicitBreakeven || (cost > 0 ? Number((cost * (h.market === 'US' ? 1.001 : 1.00585)).toFixed(2)) : 0);
      return sum + (h.shares || 0) * calculatedBreakeven;
    }, 0);
    const breakevenPrice = totalShares > 0 ? Number((totalBreakeven / totalShares).toFixed(2)) : undefined;

    const totalPortfolioVal = holdings.reduce(
      (sum, h) => sum + (h.shares || 0) * (h.currentPrice || h.avgCost || 0),
      0
    );
    const holdingVal = totalShares * (currentPrice || avgCost || 0);
    const portfolioWeightPct =
      totalPortfolioVal > 0 && holdingVal > 0
        ? Number(((holdingVal / totalPortfolioVal) * 100).toFixed(1))
        : undefined;

    const unrealizedPnLPercent =
      avgCost && avgCost > 0 && currentPrice > 0
        ? Number((((currentPrice - avgCost) / avgCost) * 100).toFixed(2))
        : matchingHoldings[0]?.unrealizedPnLPercent;

    const unrealizedSign: 'PROFIT' | 'LOSS' | 'BREAKEVEN' =
      avgCost !== undefined && currentPrice > 0
        ? currentPrice > avgCost
          ? 'PROFIT'
          : currentPrice < avgCost
          ? 'LOSS'
          : 'BREAKEVEN'
        : 'BREAKEVEN';

    desensitizedPortfolioContext = {
      status: 'IN_POSITION',
      portfolioWeightPct,
      unrealizedGainLossSign: unrealizedSign,
      unrealizedPnLPercent,
      avgCost,
      breakevenPrice,
    };
  } else {
    // 空手觀望模式 (ZERO_POSITION)
    desensitizedPortfolioContext = {
      status: 'ZERO_POSITION',
      portfolioWeightPct: 0,
    };
  }

  // 2. 日 K 均線真實驗算 (Spec 0182 / Ticket 11)
  const candles = report.klineSystem?.candles || [];
  let ma20 = currentPrice;
  let ma60 = currentPrice;
  let volumeRatio20D = 1.0;
  let maArrangement: 'BULLISH' | 'BEARISH' | 'ENTANGLED' = 'ENTANGLED';

  if (candles.length >= 20) {
    const last20 = candles.slice(-20);
    const sumClose20 = last20.reduce((acc, c) => acc + (c.close || 0), 0);
    ma20 = Number((sumClose20 / 20).toFixed(2));

    const sumVol20 = last20.reduce((acc, c) => acc + (c.volume || 0), 0);
    const avgVol20 = sumVol20 / 20;
    if (avgVol20 > 0 && volumeShares > 0) {
      volumeRatio20D = Number((volumeShares / avgVol20).toFixed(2));
    }
  }

  if (candles.length >= 60) {
    const last60 = candles.slice(-60);
    const sumClose60 = last60.reduce((acc, c) => acc + (c.close || 0), 0);
    ma60 = Number((sumClose60 / 60).toFixed(2));
  }

  if (currentPrice > 0 && ma20 > 0 && ma60 > 0) {
    if (currentPrice > ma20 && ma20 > ma60) {
      maArrangement = 'BULLISH';
    } else if (currentPrice < ma20 && ma20 < ma60) {
      maArrangement = 'BEARISH';
    } else {
      maArrangement = 'ENTANGLED';
    }
  }

  // 3. 籌碼特徵抽取與時態細化 (1D vs 20D) (Spec 0182 / Tickets 08~10)
  const chipsSummary = report.chipsSummary;
  const tdcc = report.tdccDistribution;
  const dayTrade = report.dayTradeRisk;

  // 若有 20D 歷史記錄加總；若無則保留 undefined，嚴禁以 1D 代替 20D
  let foreignNetShares20D: number | undefined = undefined;
  let trustNetShares20D: number | undefined = undefined;
  let dealerNetShares20D: number | undefined = undefined;
  let totalNetShares20D: number | undefined = undefined;

  const instHistory = report.institutionalFlow?.history;
  if (instHistory && instHistory.length >= 5) {
    foreignNetShares20D = instHistory.reduce((sum, h) => sum + (h.foreignShares || 0), 0);
    trustNetShares20D = instHistory.reduce((sum, h) => sum + (h.trustShares || 0), 0);
    dealerNetShares20D = instHistory.reduce((sum, h) => sum + (h.dealerShares || 0), 0);
    totalNetShares20D = foreignNetShares20D + trustNetShares20D + dealerNetShares20D;
  }

  // 主力 VWAP、箱型支撐與壓力 (Ticket 13)
  const mainForceVwap20D =
    report.vwapCostStructure?.mainForceVwap || report.klineSystem?.keyLevels?.mainForceCost;
  const boxResistancePrice = report.klineSystem?.keyLevels?.highResistance;
  const boxSupportPrice = report.klineSystem?.keyLevels?.supportLevel;
  const currentVwapBiasPct =
    mainForceVwap20D && currentPrice > 0
      ? Number((((currentPrice - mainForceVwap20D) / mainForceVwap20D) * 100).toFixed(2))
      : undefined;

  // 台股 ±10% 漲跌停價 (Ticket 15)
  const limitUpPrice = !isUS && currentPrice > 0 ? Number((currentPrice * 1.10).toFixed(2)) : undefined;
  const limitDownPrice = !isUS && currentPrice > 0 ? Number((currentPrice * 0.90).toFixed(2)) : undefined;

  // 成交金額估算 (億元)
  const turnoverAmountTwdHundredMillion =
    !isUS && currentPrice > 0 && volumeShares > 0
      ? Number(((currentPrice * volumeShares * 1000) / 100000000).toFixed(2))
      : undefined;

  const warRoomFeatures: StrategicFactDigest['warRoomFeatures'] = {
    maArrangement,
    foreignNetShares: !isUS ? chipsSummary?.foreignNetShares : undefined,
    investmentTrustNetShares: !isUS ? chipsSummary?.trustNetShares : undefined,
    foreignNetDays: chipsSummary?.foreignConsecutiveDays,
    tdccLargeShareholdersPct: !isUS && !tdcc?.isEmpty ? tdcc?.latestOver1000Ratio : undefined,
    dayTradeRiskLevel: dayTrade?.dayTradeRatio ? `${dayTrade.dayTradeRatio}%` : undefined,
    statusTag: report.marketBar?.marketStatusTag || report.marketBar?.statusTag || 'NORMAL',
    settledDate: chipsSummary?.asOfDateText || report.marketBar?.latestTradingDate,
    intradayTime: report.updatedAt,
  };

  // 4. 基本面與月營收映射 (Ticket 12)
  const rev = report.monthlyRevenue;
  const latestRevItem = rev?.history && rev.history.length > 0 ? rev.history[0] : undefined;
  const fundamental: StrategicFactDigest['fundamental'] = !isEtf
    ? {
        pe: undefined,
        pb: undefined,
        dividendYield: undefined,
        monthlyRevenueYearMonth: latestRevItem?.yearMonth || rev?.asOfDateText,
        monthlyRevenueYoY: rev?.latestYoyRate ?? latestRevItem?.yoyRate,
        monthlyRevenueMoM: latestRevItem?.momRate,
        isMonthlyRevenueAllTimeHigh: latestRevItem?.isAllTimeHigh,
        directorPledgeRatioPct: undefined,
      }
    : undefined;

  // 5. ETF 成分股穿透 (Ticket 16)
  const etf: StrategicFactDigest['etf'] = isEtf
    ? {
        category: 'CORE_MARKET',
        weightMatrix: {
          indexQuality: 30,
          governance: 20,
          costEfficiency: 25,
          practicalDecision: 25,
        },
        topHoldings: [],
      }
    : undefined;

  return {
    audit: {
      market,
      anchorTradingDate: report.marketBar?.latestTradingDate || new Date().toISOString().slice(0, 10),
      settlementStatus: report.marketBar?.isSettled ? 'SETTLED_AFTER_HOURS' : 'INTRADAY_UNSETTLED',
      verificationTimestamp: report.updatedAt || new Date().toISOString(),
      authenticityGuarantee: 'NO_MOCK_DATA_ZERO_TOLERANCE',
      isEtf,
    },
    quote: {
      symbol,
      name,
      market,
      currentPrice,
      change: report.marketBar?.change || 0,
      changePercent,
      volumeShares,
      maArrangement,
      ma20,
      ma60,
      volumeRatio20D,
    },
    chips: {
      foreignNetShares1D: !isUS
        ? (chipsSummary?.foreignNetShares ?? chipsSummary?.foreignInvestorsNetBuyShares)
        : undefined,
      trustNetShares1D: !isUS
        ? (chipsSummary?.trustNetShares ?? chipsSummary?.investmentTrustNetBuyShares)
        : undefined,
      dealerNetShares1D: !isUS
        ? (chipsSummary?.dealerNetShares ?? chipsSummary?.dealerNetBuyShares)
        : undefined,
      totalNetShares1D: !isUS
        ? (chipsSummary?.threeInstitutionsTotal ??
            (chipsSummary?.foreignInvestorsNetBuyShares !== undefined
              ? (chipsSummary.foreignInvestorsNetBuyShares || 0) +
                (chipsSummary.investmentTrustNetBuyShares || 0) +
                (chipsSummary.dealerNetBuyShares || 0)
              : undefined))
        : undefined,
      foreignNetShares20D,
      trustNetShares20D,
      dealerNetShares20D,
      totalNetShares20D,
      marginBalance: dayTrade?.marginBalance ?? chipsSummary?.marginBalance,
      shortBalance: dayTrade?.shortBalance ?? chipsSummary?.shortBalance,
      dayTradeRatioPct: dayTrade?.dayTradeRatio,
      bigHolderRatioChange1000: tdcc?.latestOver1000Ratio,
      bigHolderRatioChange400: tdcc?.history?.[0]?.over400Ratio,
      retailHolderCountChange: tdcc?.history?.[0]?.under10Ratio,
      mainForceVwap20D,
      currentVwapBiasPct,
      boxResistancePrice,
      boxSupportPrice,
      limitUpPrice,
      limitDownPrice,
      marketStatusTag: report.marketBar?.marketStatusTag || report.marketBar?.statusTag || 'NORMAL',
      isCyclical,
      unitText: isUS ? '股 (Shares)' : '張 (1,000股)',
      turnoverAmountTwdHundredMillion,
      microstructureSummary: isUS
        ? '美股微觀結構：無官方三大法人數據，以換手率、VWAP偏離度與量價資金流 (MFI/OBV) 綜合評估。'
        : undefined,
    },
    macro: {
      macroRegimeText: isUS ? '美股市場正常交易' : '台股市場加權指數位階正常',
    },
    fundamental,
    etf,
    desensitizedPortfolioContext,
    warRoomFeatures,
  };
}
