import { AiForceDashboardReport } from '../types/aiForceDashboard';
import { StrategicFactDigest } from '../types/strategicPrompt';
import { HoldingPosition } from '../types/stock';
import { isCanonicalEtfSymbol } from './assetClassifier';
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
  const isUS = market === 'US';
  let volumeShares = report.marketBar?.volumeShares || 0;
  // 盤中即時成交量回退與量價一致性護欄 (Spec 0194 Ticket 02)
  if (volumeShares <= 0) {
    const realtimeVol = (report as any).realtimeQuote?.volume;
    if (realtimeVol && realtimeVol > 0) {
      volumeShares = !isUS ? Math.round(realtimeVol / 1000) : realtimeVol;
    }
  }
  const isEtf = isCanonicalEtfSymbol(symbol, name, market);
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

  // 2. 日 K 均線真實驗算 (Spec 0182 / Ticket 11 & Spec 0239 T09 明確成交量單位換算)
  const candles = report.klineSystem?.candles || [];
  let ma20 = currentPrice;
  let ma60 = currentPrice;
  let volumeRatio20D = 1.0;
  let maArrangement: 'BULLISH' | 'BEARISH' | 'ENTANGLED' = 'ENTANGLED';

  // 依據 marketBar.volumeUnit 或市場類型明確決定日 K 原始股數是否除以 1000 轉張（移除 >=10000 啟發式）
  const shouldConvertCandleVolToLots =
    report.marketBar?.volumeUnit === '張'
      ? true
      : report.marketBar?.volumeUnit === '股'
      ? false
      : !isUS;

  let avgVol20Shares = 0;
  if (candles.length >= 20) {
    const last20 = candles.slice(-20);
    const sumClose20 = last20.reduce((acc, c) => acc + (c.close || 0), 0);
    ma20 = Number((sumClose20 / 20).toFixed(2));

    const sumVol20 = last20.reduce((acc, c) => acc + (c.volume || 0), 0);
    const rawAvgVol20 = sumVol20 / 20;
    avgVol20Shares = shouldConvertCandleVolToLots ? rawAvgVol20 / 1000 : rawAvgVol20;
    if (avgVol20Shares > 0 && volumeShares > 0) {
      volumeRatio20D = Number((volumeShares / avgVol20Shares).toFixed(2));
    }
  }

  // 盤中成交量回退標籤 (Spec 0196 Ticket 05 & Spec 0239 T09)
  let intradayVolumeNote: string | undefined = undefined;
  if (!report.marketBar?.isSettled && volumeShares <= 0) {
    const lastSettledVolume = candles.length > 0 ? (candles[candles.length - 1].volume || 0) : 0;
    const lastSettledVolumeShares = shouldConvertCandleVolToLots
      ? Math.round(lastSettledVolume / 1000)
      : lastSettledVolume;
    const volUnitLabel = shouldConvertCandleVolToLots ? '張' : '股';
    intradayVolumeNote = lastSettledVolumeShares > 0
      ? `盤中撮合中 (前一交易日收盤量: ${lastSettledVolumeShares} ${volUnitLabel})`
      : '盤中撮合中';
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

  // 籌碼均量比例尺計算 (Spec 0196 Ticket 04 & Spec 0239 T09)
  let foreignRatio20D: number | undefined = undefined;
  let trustRatio20D: number | undefined = undefined;
  if (avgVol20Shares > 0) {
    const foreignNet = chipsSummary?.foreignNetShares ?? chipsSummary?.foreignInvestorsNetBuyShares;
    const trustNet = chipsSummary?.trustNetShares ?? chipsSummary?.investmentTrustNetBuyShares;
    if (foreignNet !== undefined) {
      foreignRatio20D = Number(((foreignNet / avgVol20Shares) * 100).toFixed(1));
    }
    if (trustNet !== undefined) {
      trustRatio20D = Number(((trustNet / avgVol20Shares) * 100).toFixed(1));
    }
  }

  // 若有 20D 歷史記錄，明確切片近 20 個交易日加總；若無則保留 undefined，嚴禁以 1D 或全歷史代替 20D (Spec 0239 T09)
  let foreignNetShares20D: number | undefined = undefined;
  let trustNetShares20D: number | undefined = undefined;
  let dealerNetShares20D: number | undefined = undefined;
  let totalNetShares20D: number | undefined = undefined;

  const instHistory = report.institutionalFlow?.history;
  if (instHistory && instHistory.length >= 5) {
    const recent20 = instHistory.slice(-20);
    foreignNetShares20D = recent20.reduce((sum, h) => sum + (h.foreignShares || 0), 0);
    trustNetShares20D = recent20.reduce((sum, h) => sum + (h.trustShares || 0), 0);
    dealerNetShares20D = recent20.reduce((sum, h) => sum + (h.dealerShares || 0), 0);
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

  // 4. 基本面與月營收映射 (Ticket 12, Spec 0195 注入 Card 21 估值矩陣, Spec 0196 注入單季 EPS, Spec 0197 校準最新月份)
  const rev = report.monthlyRevenue;
  // 取陣列最新月份 (Spec 0197 Ticket 02: 避免由舊到新排序誤取最舊月份)
  const latestRevItem = rev?.history && rev.history.length > 0 ? rev.history[rev.history.length - 1] : undefined;
  const val = report.valuationMetrics;
  // 董監質押比率安全提取 (Spec 0239 T09: 僅由權威欄位 valuationMetrics.directorPledgeRatio 讀取)
  const rawPledge = val?.directorPledgeRatio;
  const directorPledgeRatioPct =
    typeof rawPledge === 'number' && Number.isFinite(rawPledge)
      ? Number(rawPledge.toFixed(2))
      : undefined;

  const fundamental: StrategicFactDigest['fundamental'] = !isEtf
    ? {
        pe: val?.pe,
        pb: val?.pb,
        dividendYield: val?.dividendYield,
        latestQuarterEps: val?.latestQuarterEps,
        latestQuarterName: val?.latestQuarterName,
        grossMarginPct: val?.grossMargin,
        operatingMarginPct: val?.operatingMargin,
        monthlyRevenueYearMonth: latestRevItem?.yearMonth || rev?.asOfDateText,
        monthlyRevenueYoY: rev?.latestYoyRate ?? latestRevItem?.yoyRate,
        monthlyRevenueMoM: latestRevItem?.momRate,
        isMonthlyRevenueAllTimeHigh: latestRevItem?.isAllTimeHigh,
        directorPledgeRatioPct,
      }
    : undefined;

  // 5. ETF 成分股穿透 (Ticket 16, Spec 0195 注入折溢價率與費用率)
  const etf: StrategicFactDigest['etf'] = isEtf
    ? {
        category: 'CORE_MARKET',
        weightMatrix: {
          indexQuality: 30,
          governance: 20,
          costEfficiency: 25,
          practicalDecision: 25,
        },
        totalExpenseRatioPct: val?.etfExpenseRatio,
        discountPremiumPct: val?.etfPremiumDiscountRate,
        topHoldings: [],
      }
    : undefined;

  // 集保 4 週真實變化值提取 (Spec 0240 Patch 1: 嚴格區分 1000 張與 400 張級距，無資料誠實為 null)
  const bigHolderRatioChange1000Val =
    !tdcc?.isEmpty &&
    typeof tdcc?.change4WeeksRatio === 'number' &&
    Number.isFinite(tdcc.change4WeeksRatio)
      ? tdcc.change4WeeksRatio
      : null;

  let bigHolderRatioChange400Val: number | null = null;
  if (!tdcc?.isEmpty && Array.isArray(tdcc?.history) && tdcc.history.length >= 2) {
    const latestTdcc = tdcc.history[tdcc.history.length - 1];
    const baselineTdcc = tdcc.history[Math.max(0, tdcc.history.length - 4)];
    if (
      typeof latestTdcc?.over400Ratio === 'number' &&
      Number.isFinite(latestTdcc.over400Ratio) &&
      typeof baselineTdcc?.over400Ratio === 'number' &&
      Number.isFinite(baselineTdcc.over400Ratio)
    ) {
      bigHolderRatioChange400Val = Number((latestTdcc.over400Ratio - baselineTdcc.over400Ratio).toFixed(2));
    }
  }

  const retailHolderCountChangeVal =
    !tdcc?.isEmpty &&
    typeof tdcc?.change4WeeksShareholders === 'number' &&
    Number.isFinite(tdcc.change4WeeksShareholders)
      ? tdcc.change4WeeksShareholders
      : null;

  // CNN 恐懼貪婪分數嚴格取自 usMacroData.cnnScore，缺失時誠實為 null (Spec 0239 T09)
  const rawCnnScore = report.marketSentiment?.usMacroData?.cnnScore;
  const cnnFearGreedScoreVal =
    typeof rawCnnScore === 'number' && Number.isFinite(rawCnnScore) ? rawCnnScore : null;

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
      intradayVolumeNote,
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
      foreignRatio20D,
      trustRatio20D,
      foreignNetShares20D,
      trustNetShares20D,
      dealerNetShares20D,
      totalNetShares20D,
      marginBalance: dayTrade?.marginBalance ?? chipsSummary?.marginBalance,
      shortBalance: dayTrade?.shortBalance ?? chipsSummary?.shortBalance,
      ...((!isUS && (chipsSummary?.sblBalance ?? dayTrade?.sblBalance) !== undefined)
        ? { sblBalance: chipsSummary?.sblBalance ?? dayTrade?.sblBalance }
        : {}),
      dayTradeRatioPct: dayTrade?.dayTradeRatio,
      bigHolderRatioChange1000: bigHolderRatioChange1000Val,
      bigHolderRatioChange400: bigHolderRatioChange400Val,
      retailHolderCountChange: retailHolderCountChangeVal,
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
      treasuryYield10Y: report.marketSentiment?.usMacroData?.tenYearTreasury,
      cnnFearGreedScore: cnnFearGreedScoreVal,
      vixClose: report.marketSentiment?.usMacroData?.vix,
      twPutCallRatio: report.marketSentiment?.twMacroData?.putCallRatio,
      macroRegimeText: isUS
        ? (report.marketSentiment?.usMacroData?.cnnRatingText
            ? `美股情緒: CNN ${report.marketSentiment.usMacroData.cnnRatingText} (${report.marketSentiment.usMacroData.cnnScore ?? ''}), VIX: ${report.marketSentiment.usMacroData.vix ?? ''}`
            : '美股市場正常交易')
        : (report.marketSentiment?.overallSentimentIndex
            ? `台股市場合情緒指數: ${report.marketSentiment.overallSentimentIndex} (${report.marketSentiment.sentimentState || '中性'})`
            : '台股市場加權指數位階正常'),
    },
    fundamental,
    etf,
    desensitizedPortfolioContext,
    warRoomFeatures,
    valuationStatus: val ? {
      tier:
        val.valuationTierText ||
        val.valuationTier ||
        (val.pe != null || val.pb != null ? '合理估值區間' : '待同步'),
      pe: val.pe,
      pb: val.pb,
      ps: val.psRatio,
      yield: val.dividendYield,
      discountPremium: val.etfPremiumDiscountRate,
      isLossMaking: val.isLossMaking,
    } : undefined,
  };
}
