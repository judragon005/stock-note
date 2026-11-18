import type { DailyCandle } from '../types/indicators';
import type {
  AiMorningBriefDirective,
  MacroDualThermometerResult,
  MacroHoldingSignalInput,
  MacroIndicatorSnapshot,
  MacroPortfolioShield,
  UpcomingDividendInput,
} from '../types/macro';
import type { HoldingPosition } from '../types/stock';
import type { ReceivableDividend } from '../types/dividend';
import { calculate20MABias } from '../engine/macroAdvisorEngine';
import {
  aggregateRecentDividends,
  DEFAULT_MOMENTUM_UNIVERSES,
  evaluateDualMomentum,
} from '../engine/dualMomentumEngine';
import { scanMuscleBookerItem } from '../engine/muscleBookerEngine';
import { evaluateRiskStatus } from '../engine/riskAlertEngine';
import { resolveDispositionAttentionStatus } from '../engine/dispositionWindowEngine';

export const DEFAULT_WAR_ROOM_MACRO_SNAPSHOT: MacroIndicatorSnapshot = {
  date: new Date().toISOString().split('T')[0],
  us10y: 4.18,
  us2y: 4.02,
  yieldSpread: 0.16,
  isYieldInverted: false,
  vix: 18.6,
  vixLevel: 'NORMAL',
  fearAndGreedIndex: 52,
  fearAndGreedLevel: 'NEUTRAL',
  goldPrice: 3350.0,
  oilPrice: 71.5,
  dxy: 103.4,
  usdToTwd: 32.15,
  usM2GrowthYoY: 2.8,
  twM2GrowthYoY: 5.6,
  creditSpreadOAS: 3.45,
  cdsInsuranceIndex: 62,
  cdsRiskLevel: 'LOW',
  twFuturesNetOi: -15000,
  twMarginMaintenance: 165.2,
  twFuturesRiskLevel: 'NEUTRAL',
  twMarginRiskLevel: 'SAFE',
  soxIndex: 5240.5,
  soxChangePercent: 0.85,
  soxBias20Ma: 2.1,
  soxAbove20Ma: true,
  soxAbove60Ma: true,
  tsmAdrPrice: 196.5,
  tsmAdrChangePercent: 1.2,
  tsmTwPrice: 1055,
  tsmAdrConvertedTwd: 1263.5,
  tsmAdrPremiumPercent: 19.76,
  taiexIndex: 23150,
  taiexChangePercent: 0.45,
  taiexBias20Ma: 1.4,
  taiexAbove20Ma: true,
  taiexAbove60Ma: true,
  sourceStatus: 'CACHED',
  updatedAt: Date.now(),
};

/**
 * 萃取在倉持股波段戰術訊號與處置/停損狀態 (純函式)
 */
export function assembleWarRoomHoldingSignals(params: {
  holdings: HoldingPosition[];
  historicalDailyPrices: Record<string, Record<string, number>>;
  lakehouseCandlesMap: Record<string, DailyCandle[]>;
  totalNavTwd: number;
  usdToTwdRate: number;
  asOfDate: string;
}): MacroHoldingSignalInput[] {
  const { holdings, historicalDailyPrices, lakehouseCandlesMap, totalNavTwd, usdToTwdRate, asOfDate } = params;

  return holdings
    .filter((h) => h.shares > 0)
    .map((h) => {
      const localDailyMap = historicalDailyPrices[h.symbol];
      let candles: DailyCandle[] | undefined = lakehouseCandlesMap[h.symbol];
      if (!candles && localDailyMap && Object.keys(localDailyMap).length >= 5) {
        const sortedDates = Object.keys(localDailyMap).sort();
        candles = sortedDates.slice(-60).map((d) => {
          const c = localDailyMap[d];
          return { date: d, open: c, high: c, low: c, close: c, volume: 0 };
        });
      }
      const currentPrice = h.currentPrice || h.avgCost || 100;
      const scanned = scanMuscleBookerItem(h.symbol, h.name, h.market, currentPrice, candles);

      const fx = h.currency === 'USD' ? usdToTwdRate : 1;
      const marketValueTWD = (h.shares || 0) * currentPrice * fx;
      const weightPercent = totalNavTwd > 0 ? (marketValueTWD / totalNavTwd) * 100 : 0;
      const unrealizedPnlPercent =
        h.avgCost && h.avgCost > 0 ? ((currentPrice - h.avgCost) / h.avgCost) * 100 : 0;

      const customPlan = h.plan;
      const plannedStop = customPlan?.stopLossPrice ?? h.riskMetrics?.stopLossPrice;
      const plannedTarget = customPlan?.takeProfitPrice ?? h.riskMetrics?.takeProfitPrice;
      const planRiskStatus = evaluateRiskStatus(currentPrice, plannedStop, plannedTarget);
      const dispositionStatus = resolveDispositionAttentionStatus(
        h.dispositionEvents ?? [],
        asOfDate
      );
      const bias20MA = calculate20MABias(candles, currentPrice);

      return {
        symbol: h.symbol,
        name: h.name,
        market: h.market,
        action: scanned.actionDecision.action,
        stopLossPrice: plannedStop ?? scanned.actionDecision.stopLossPrice,
        targetPrice: plannedTarget ?? scanned.actionDecision.targetPrice,
        shares: h.shares,
        costBasis: h.avgCost || 0,
        currentPrice,
        marketValueTWD,
        weightPercent: Math.round(weightPercent * 10) / 10,
        unrealizedPnlPercent: Math.round(unrealizedPnlPercent * 10) / 10,
        boxTop: scanned.boxUpper,
        boxBottom: scanned.boxLower,
        bias20MA,
        planRiskStatus,
        dispositionStatus,
      };
    });
}

/**
 * 建置繁體中文晨會每日作戰簡報 Markdown（統一採用雙溫度計 recommendedEquityCapPercent SSOT）
 */
export function buildMorningBriefMarkdownReport(params: {
  macroSnapshot: MacroIndicatorSnapshot;
  dualThermometer: MacroDualThermometerResult;
  morningBrief: AiMorningBriefDirective;
  shield: MacroPortfolioShield;
  holdingSignals: MacroHoldingSignalInput[];
  isMasked?: boolean;
}): string {
  const { macroSnapshot, dualThermometer, morningBrief, shield, holdingSignals, isMasked = false } = params;
  const { strategicRegime, tacticalSwing } = dualThermometer;

  const stanceLabel =
    strategicRegime.stance === 'AGGRESSIVE'
      ? '進攻・積極擴張'
      : strategicRegime.stance === 'DEFENSIVE'
        ? '防禦・現金為王'
        : '平衡・區間操作';

  const sortedSignals = [...holdingSignals].sort((a, b) => (b.weightPercent || 0) - (a.weightPercent || 0));
  const matrixLines = sortedSignals.map((s) => {
    const pnlSign = (s.unrealizedPnlPercent || 0) >= 0 ? '+' : '';
    const stopPriceStr = s.stopLossPrice
      ? `$${s.stopLossPrice.toFixed(2)}`
      : s.boxBottom
        ? `$${s.boxBottom.toFixed(2)} (箱底)`
        : '動態移動';
    const actionBadge =
      s.action === 'SELL'
        ? '⚠️ 減碼/停損'
        : s.action === 'BUY'
          ? '⚡ 突破加碼'
          : s.action === 'AVOID'
            ? '🛑 弱勢觀望'
            : '🟢 續抱';
    return `| ${s.symbol} | ${s.name || ''} | ${s.weightPercent || 0}% | ${pnlSign}${s.unrealizedPnlPercent || 0}% | $${(s.currentPrice || 0).toFixed(2)} | ${stopPriceStr} | ${actionBadge} |`;
  });

  const maskAmt = (val: number) => `NT$ ${Math.round(val).toLocaleString()}`;

  return [
    `> 【系統指令 (System Directive)】：`,
    `> 你現在是首席風險官 (CRO) 與高階避險基金投資經理。本報告為個人投資組合「戰情室 3.5 本地模型推演簡報」，所有宏觀數據、費半/台積電 ADR 溢折價、籌碼廣度指標與持股風控防守價均為本地快照。請嚴格基於報告內給定的客觀數據進行壓力測試、調倉驗算與極端風險審核，並於回覆末尾附上 JSON 戰略釘選區塊（含 recommendedEquityCapPercent, soxSupportLevel, taiexSupportLevel, tacticalSummary）。`,
    '',
    `# 🏦 宏觀戰情室 3.5 每日晨會簡報 (${macroSnapshot.date})`,
    `> 作戰定調：${morningBrief.headline} (${morningBrief.tone})`,
    '',
    `## 🌡️ 雙軌水溫計：長線總經 ${strategicRegime.score} 分【${stanceLabel}】｜波段戰術 ${tacticalSwing.score} 分【${tacticalSwing.label}】`,
    `- 建議股票總倉位上限：${strategicRegime.recommendedEquityCapPercent}%`,
    `- 費城半導體 (^SOX)：${macroSnapshot.soxIndex ?? 'N/A'} (20MA 乖離 ${macroSnapshot.soxBias20Ma ?? 0}%)｜台積電 ADR 溢折價：${macroSnapshot.tsmAdrPremiumPercent ?? 0}%`,
    `- 決策推論：${strategicRegime.drivers.join('；')}`,
    '',
    `## 🛡️ 個人在險、真·自由子彈與穿透風控 (1-Day 95% VaR)`,
    isMasked
      ? `- 帳戶實質總淨值 (Effective NAV)：NT$ [已隱私遮蔽] (約 ${sortedSignals.length} 檔持股組合)`
      : `- 帳戶實質總淨值 (Effective NAV)：${maskAmt(shield.totalNavTWD)}`,
    isMasked
      ? `- 真·自由可動用子彈：佔總淨值 ${shield.cashRatioPercent}% (金額已隱私遮蔽)`
      : `- 真·自由可動用子彈：${maskAmt(shield.freeDeployableCashTWD ?? shield.cashBalanceTWD)}`,
    `- ETF 穿透半導體權重：${shield.semiLookThroughWeightPercent ?? 0}% (台積電 ${shield.tsmcLookThroughWeightPercent ?? 0}%)`,
    isMasked
      ? `- 單日 95% 最大在險價值 (VaR)：佔總淨值 ${shield.varRatioPercent || 0}% (金額已隱私遮蔽)`
      : `- 單日 95% 最大在險價值 (VaR)：${maskAmt(shield.valueAtRisk95TWD || 0)} (佔總淨值 ${shield.varRatioPercent || 0}%)`,
    `- 質押維持率：${shield.hasLoans && shield.marginMaintenanceRatio !== null ? `${shield.marginMaintenanceRatio}% (${shield.marginStatus})` : '無質押負債 (零槓桿)'}`,
    '',
    `## 🎯 今日執行要點`,
    ...morningBrief.actionPoints.map((p, idx) => `${idx + 1}. ${p}`),
    '',
    `## 🌐 台美關鍵金絲雀與實體商品`,
    `- 美債 10Y/2Y：${macroSnapshot.us10y}% / ${macroSnapshot.us2y}% (利差 ${macroSnapshot.yieldSpread}% ${macroSnapshot.isYieldInverted ? '倒掛' : '正常'})`,
    `- VIX 恐慌指數：${macroSnapshot.vix} (${macroSnapshot.vixLevel})｜國際黃金現貨/期貨 (GC=F)：$${macroSnapshot.goldPrice} USD/oz`,
    `- 高收益債/CCC/投等債利差 (OAS)：${macroSnapshot.creditSpreadOAS ?? 3.5}% / ${macroSnapshot.cccSpreadOAS ?? '--'}% / ${macroSnapshot.igSpreadOAS ?? '--'}%`,
    `- 外資台指期未平倉：${(macroSnapshot.twFuturesNetOi ?? 0).toLocaleString()} 口 | 全市場融資維持率：${macroSnapshot.twMarginMaintenance ?? 165.2}%`,
    '',
    `## 📋 持股技術防守與權重矩陣 (按權重排序)`,
    `| 代號 | 名稱 | 權重 | 損益% | 市價 | 防守價/箱底 | 建議動作 |`,
    `|---|---|---|---|---|---|---|`,
    ...matrixLines,
  ].join('\n');
}

/**
 * 建置雙重動能視圖模型：動態選擇無風險利率、組裝日 K 並計算持倉交集與權重映射
 */
export function buildDualMomentumViewModel(params: {
  selectedUniverseId: string;
  us3m?: number;
  lakehouseCandlesMap: Record<string, DailyCandle[]>;
  historicalDailyPrices: Record<string, Record<string, number>>;
  receivableDividends: ReceivableDividend[];
  asOfDate: string;
  holdings: HoldingPosition[];
  holdingSignals: MacroHoldingSignalInput[];
}) {
  const {
    selectedUniverseId,
    us3m,
    lakehouseCandlesMap,
    historicalDailyPrices,
    receivableDividends,
    asOfDate,
    holdings,
    holdingSignals,
  } = params;

  const selectedUniverse =
    DEFAULT_MOMENTUM_UNIVERSES.find((u) => u.id === selectedUniverseId) ||
    DEFAULT_MOMENTUM_UNIVERSES[0];

  const isTwPool = selectedUniverse.id.startsWith('tw_');
  const effectiveRiskFreeRate = isTwPool
    ? (selectedUniverse.riskFreeRateAnnualized ?? 0.02)
    : us3m !== undefined && us3m > 0
      ? Number((us3m / 100).toFixed(4))
      : (selectedUniverse.riskFreeRateAnnualized ?? 0.04);

  const quotesMap: Record<string, DailyCandle[]> = { ...lakehouseCandlesMap };
  if (historicalDailyPrices && Object.keys(historicalDailyPrices).length > 0) {
    for (const [sym, dateMap] of Object.entries(historicalDailyPrices)) {
      if (!dateMap || quotesMap[sym]?.length) continue;
      const sortedDates = Object.keys(dateMap).sort();
      quotesMap[sym] = sortedDates.map((d) => ({
        date: d,
        open: dateMap[d],
        high: dateMap[d],
        low: dateMap[d],
        close: dateMap[d],
        volume: 0,
      }));
    }
  }

  const dividendAdjustments3M = aggregateRecentDividends(receivableDividends, asOfDate, 90);
  const momentumSignal = evaluateDualMomentum({
    universeConfig: selectedUniverse,
    quotesMap,
    riskFreeRateAnnualized: effectiveRiskFreeRate,
    dividendAdjustments3M,
  });

  const currentUniverseSymbols = new Set(selectedUniverse.symbols.map((s) => s.symbol));
  const holdingMatchingAsset = holdings.find(
    (h) => currentUniverseSymbols.has(h.symbol) || currentUniverseSymbols.has(`${h.symbol}.TW`)
  );

  const holdingWeightMap: Record<string, number> = {};
  for (const s of holdingSignals) {
    if (s.weightPercent && s.weightPercent > 0) {
      holdingWeightMap[s.symbol] = s.weightPercent;
    }
  }

  return {
    effectiveRiskFreeRate,
    momentumSignal,
    holdingMatchingSymbol: holdingMatchingAsset?.symbol,
    holdingWeightMap,
  };
}

export function toUpcomingDividends(receivableDividends: ReceivableDividend[]): UpcomingDividendInput[] {
  const today = new Date().toISOString().split('T')[0];
  const todayTime = new Date(`${today}T00:00:00`).getTime();
  return receivableDividends
    .map((r) => {
      const payTime = new Date(`${r.payDate}T00:00:00`).getTime();
      const diffDays = Math.round((payTime - todayTime) / (1000 * 60 * 60 * 24));
      return {
        symbol: r.symbol,
        amount: r.estimatedNetDividendInTWD || r.estimatedGrossDividend || 0,
        payDate: r.payDate,
        daysLeft: diffDays,
      };
    })
    .filter((d) => d.daysLeft >= 0);
}
