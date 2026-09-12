import { MarketType } from '../types/stock';
import { DailyCandle } from '../types/indicators';
import { OmniIndicatorReport } from '../types/omniIndicator';
import { computeOmniIndicators } from './omniIndicatorEngine';
import { backfillSymbolOhlcvAndIndicators } from './historicalOhlcvBackfill';
import { resolveOfficialSecurityName } from './stockNameResolver';
import { fetchStockQuote } from './priceFetcher';
import { logger } from '../utils/logger';

export interface FetchOmniReportOptions {
  forceRefresh?: boolean;
  currentPrice?: number;
  previousClose?: number;
  name?: string;
  chipsContext?: {
    institutional5DayNetBuy?: number;
    majorHoldersDiffPercent?: number;
  };
  backfillFn?: typeof backfillSymbolOhlcvAndIndicators;
  quoteFetcherFn?: typeof fetchStockQuote;
}

/**
 * 隨選拉取歷史 K 線並組裝出個股全指標分析報告
 */
export async function fetchAndBuildOmniReport(
  symbol: string,
  market: MarketType,
  options: FetchOmniReportOptions = {}
): Promise<OmniIndicatorReport> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const backfill = options.backfillFn || backfillSymbolOhlcvAndIndicators;
  const quoteFetcher = options.quoteFetcherFn || fetchStockQuote;

  const resolvedName = options.name || resolveOfficialSecurityName(cleanSymbol) || cleanSymbol;

  // 1. 取得日 K 線
  let candles: DailyCandle[] = [];
  try {
    const res = await backfill(cleanSymbol, market, options.forceRefresh ?? false);
    candles = res.candles || [];
  } catch (err) {
    logger.error(`[OmniPipeline] Failed to backfill OHLCV for ${cleanSymbol}:`, err);
  }

  // 2. 取得即時報價或由日 K 線推算
  let currentPrice = options.currentPrice;
  let previousClose = options.previousClose;

  if (currentPrice === undefined || previousClose === undefined) {
    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const prevCandle = candles.length > 1 ? candles[candles.length - 2] : undefined;
      if (currentPrice === undefined) currentPrice = lastCandle.close;
      if (previousClose === undefined && prevCandle) previousClose = prevCandle.close;
    }

    if (currentPrice === undefined) {
      try {
        const quote = await quoteFetcher(cleanSymbol, market);
        if (quote && quote.price > 0) {
          currentPrice = quote.price;
          if (previousClose === undefined && quote.change !== undefined) {
            previousClose = quote.price - quote.change;
          }
        }
      } catch (err) {
        logger.warn(`[OmniPipeline] Failed to fetch quote for ${cleanSymbol}:`, err);
      }
    }
  }

  const safeCurrentPrice = currentPrice && currentPrice > 0 ? currentPrice : (candles.length > 0 ? candles[candles.length - 1].close : 100);

  return computeOmniIndicators({
    symbol: cleanSymbol,
    name: resolvedName,
    market,
    candles,
    currentPrice: safeCurrentPrice,
    previousClose,
    chipsContext: options.chipsContext,
  });
}

/**
 * 產出符合金融研報與大模型 Prompt 結構之 Markdown 診斷報告 (含三層架構實戰階梯)
 */
export function generateOmniReportMarkdown(report: OmniIndicatorReport): string {
  const { symbol, name, market, asOfDate, currentPrice, dailyChange, dailyChangePercent, trend, momentum, volatility, volumeFlow, levels, confluence } = report;

  const marketLabel = market === 'TW' ? '台股' : '美股';
  const currencySymbol = market === 'TW' ? 'NT$' : '$';
  const changeStr = dailyChange !== undefined && dailyChangePercent !== undefined
    ? `${dailyChange >= 0 ? '+' : ''}${dailyChange} (${dailyChangePercent >= 0 ? '+' : ''}${dailyChangePercent}%)`
    : '平盤或無變化';

  const signalsList = confluence.primarySignals.map((s) => `  * ${s}`).join('\n');
  const matrix = confluence.actionMatrix;

  return `# 📊 【${symbol} ${name}】全能技術指標透視診斷報告

> **評估日期**：${asOfDate} ｜ **所屬市場**：${marketLabel} ｜ **最新市價**：${currencySymbol} ${currentPrice.toLocaleString()} ｜ **當日漲跌**：${changeStr}

---

## 🎯 【第 1 層】0秒決策核心 (Executive Summary)
* **市場狀態**：\`${confluence.regimeLabel}\`
* **多空共振評分**: **${confluence.score} 分**（評級：\`${confluence.rating}\`）${confluence.contradictionPenaltyApplied ? ' ⚠️ *(已套用無趨勢矛盾懲罰)*' : ''}
* **操盤大白話指引**：
  > 💡 **${confluence.oneSentenceBottomLine}**

* **當前盤勢特徵條列**：
${signalsList || '  * 目前無顯著單邊特徵，多空平衡震盪'}

${confluence.riskAlert ? `> ⚠️ **風險雷達**：${confluence.riskAlert}\n` : ''}

---

## 🗺️ 【第 2 層】3秒實戰作戰地圖 (Actionable Trade Matrix)

| 作戰目標 / 階梯位階 | 關鍵價格區間 | 距離現價 (%) | 依據指標與形態 |
| :--- | :--- | :--- | :--- |
| 🎯 **第一減碼 / 阻力區** | **${currencySymbol} ${matrix.primaryResistanceZone.price.toLocaleString()}** | \`${matrix.primaryResistanceZone.distancePercent >= 0 ? '+' : ''}${matrix.primaryResistanceZone.distancePercent}%\` | ${matrix.primaryResistanceZone.label} |
| 🚀 **突破續強 / 加碼點** | **${currencySymbol} ${matrix.expansionTargetZone.price.toLocaleString()}** | \`${matrix.expansionTargetZone.distancePercent >= 0 ? '+' : ''}${matrix.expansionTargetZone.distancePercent}%\` | ${matrix.expansionTargetZone.label} |
| 🛡️ **短線動態防守線** | **${currencySymbol} ${matrix.shortTermDefenseLine.price.toLocaleString()}** | \`${matrix.shortTermDefenseLine.distancePercent}%\` | ${matrix.shortTermDefenseLine.label} |
| ⛔ **結構底線 (停損)** | **${currencySymbol} ${matrix.structuralInvalidationLine.price.toLocaleString()}** | \`${matrix.structuralInvalidationLine.distancePercent}%\` | ${matrix.structuralInvalidationLine.label} |

---

## 🔬 【第 3 層】深度佐證與五大維度矩陣

### 1️⃣ 趨勢追蹤矩陣 (Trend)
* **移動平均線**：MA5: ${trend.ma5 ?? '-'} ｜ MA20: ${trend.ma20 ?? '-'} ｜ MA60: ${trend.ma60 ?? '-'} ｜ MA120: ${trend.ma120 ?? '-'}
* **均線排列**：\`${trend.maAlignment === 'BULLISH' ? '多頭排列 (強勢)' : trend.maAlignment === 'BEARISH' ? '空頭排列 (弱勢)' : '均線糾結整理'}\`
* **MACD (12, 26, 9)**：DIF: ${trend.macd.dif} ｜ Signal: ${trend.macd.signal} ｜ 柱狀體: ${trend.macd.hist} (${trend.macd.hist >= 0 ? '紅柱' : '綠柱'})
${trend.dmiAdx ? `* **DMI / ADX**：+DI: ${trend.dmiAdx.pdi} ｜ -DI: ${trend.dmiAdx.mdi} ｜ ADX 強度: ${trend.dmiAdx.adx} (${trend.dmiAdx.trendDirection})\n` : ''}
### 2️⃣ 動能擺盪矩陣 (Momentum)
* **RSI 相對強弱**：RSI(6): ${momentum.rsi6 ?? '-'} ｜ RSI(14): ${momentum.rsi14 ?? '-'} ｜ RSI(24): ${momentum.rsi24 ?? '-'}（狀態：\`${momentum.rsiStatus}\`）
* **KD 隨機指標 (9, 3, 3)**：K: ${momentum.kd9.k} ｜ D: ${momentum.kd9.d}（狀態：\`${momentum.kd9.status}\`）
* **CCI 順勢指標 (20)**：${momentum.cci20 ?? '-'} ｜ **Williams %R (14)**：${momentum.williamsR14 ?? '-'}

### 3️⃣ 波動通道與真實波幅 (Volatility & ATR)
* **布林通道 (20, 2SD)**：上軌: ${volatility.bollinger.upper} ｜ 中軌: ${volatility.bollinger.mid} ｜ 下軌: ${volatility.bollinger.lower} ｜ 帶寬: ${volatility.bollinger.bandwidthPercent}% (${volatility.bollinger.isSqueeze ? '⚡ 極致壓縮 Squeeze' : '正常'})
* **真實波幅 ATR(14)**：${volatility.atr14} ｜ **吊燈動態防守點**：${currencySymbol} ${volatility.trailingDefensePrice}
* **乖離率**：20日乖離: ${volatility.bias20Percent}% ｜ 60日乖離: ${volatility.bias60Percent}%

### 4️⃣ 量能與資金流矩陣 (Volume & Money Flow)
* **成交量**：昨日量: ${volumeFlow.yesterdayVolume.toLocaleString()} ｜ 5日均量: ${volumeFlow.avgVolume5.toLocaleString()} ｜ 量比: ${volumeFlow.volumeRatio5}x
* **量能狀態**：${volumeFlow.isSurge ? '🔥 爆量攻擊' : volumeFlow.isDryUp ? '❄️ 窒息量縮' : '平穩量能'} ｜ OBV 能量潮: \`${volumeFlow.obv.trend}\`

### 5️⃣ 關鍵點位與箱體 (Key Levels)
* **Darvas 箱體**：箱頂: ${levels.darvasBox.upper} ｜ 箱底: ${levels.darvasBox.lower} ｜ 狀態: \`${levels.darvasBox.status}\`
* **Fibonacci 回撤**：0.236 (${levels.fibonacci.fib236}) ｜ 0.382 (${levels.fibonacci.fib382}) ｜ 0.500 (${levels.fibonacci.fib500}) ｜ 0.618 (${levels.fibonacci.fib618})
* **樞紐點 (Pivot Points)**：Pivot: ${levels.pivotPoints.pivot} ｜ R1: ${levels.pivotPoints.r1} ｜ R2: ${levels.pivotPoints.r2} ｜ S1: ${levels.pivotPoints.s1} ｜ S2: ${levels.pivotPoints.s2}

---
*報告由 Omni Technical Matrix & Regime Brain 自動生成，僅供技術分析與策略規劃參考，投資決策請自負盈虧。*
`;
}
