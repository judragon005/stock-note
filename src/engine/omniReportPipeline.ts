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

    // 若依然缺漏，嘗試透過 quoteFetcher 補齊
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

  // 確保價格具備基本安全數值
  const safeCurrentPrice = currentPrice && currentPrice > 0 ? currentPrice : (candles.length > 0 ? candles[candles.length - 1].close : 100);

  return computeOmniIndicators({
    symbol: cleanSymbol,
    name: resolvedName,
    market,
    candles,
    currentPrice: safeCurrentPrice,
    previousClose,
  });
}

/**
 * 產出符合金融研報與大模型 Prompt 結構之 Markdown 診斷報告
 */
export function generateOmniReportMarkdown(report: OmniIndicatorReport): string {
  const { symbol, name, market, asOfDate, currentPrice, dailyChange, dailyChangePercent, trend, momentum, volatility, volumeFlow, levels, confluence } = report;

  const marketLabel = market === 'TW' ? '台股' : '美股';
  const currencySymbol = market === 'TW' ? 'NT$' : '$';
  const changeStr = dailyChange !== undefined && dailyChangePercent !== undefined
    ? `${dailyChange >= 0 ? '+' : ''}${dailyChange} (${dailyChangePercent >= 0 ? '+' : ''}${dailyChangePercent}%)`
    : '平盤或無變化';

  const signalsList = confluence.primarySignals.map((s) => `  * ${s}`).join('\n');

  return `# 📊 【${symbol} ${name}】全技術指標透視診斷報告

> **評估日期**：${asOfDate} ｜ **所屬市場**：${marketLabel} ｜ **最新市價**：${currencySymbol} ${currentPrice.toLocaleString()} ｜ **當日漲跌**：${changeStr}

---

## 🎯 多空共振總結 (Technical Confluence)
* **多空共振評分**: **${confluence.score} 分**（評級：\`${confluence.rating}\`）
* **核心多空特徵**：
${signalsList || '  * 目前無顯著單邊特徵，多空平衡震盪'}
* **交易紀律操作建議**：
  > 💡 **${confluence.actionAdvice}**
${confluence.riskAlert ? `* **⚠️ 風險預警**：${confluence.riskAlert}\n` : ''}
---

## 📈 五大指標維度細節剖析

### 1️⃣ 趨勢追蹤矩陣 (Trend)
* **移動平均線**：MA5: ${trend.ma5 ?? '-'} ｜ MA20: ${trend.ma20 ?? '-'} ｜ MA60: ${trend.ma60 ?? '-'} ｜ MA120: ${trend.ma120 ?? '-'}
* **均線型態**：\`${trend.maAlignment === 'BULLISH' ? '多頭排列 (強勢)' : trend.maAlignment === 'BEARISH' ? '空頭排列 (弱勢)' : '均線糾結整理'}\`
* **MACD (12, 26, 9)**：DIF: ${trend.macd.dif} ｜ Signal: ${trend.macd.signal} ｜ 柱狀體: ${trend.macd.hist} (${trend.macd.hist >= 0 ? '紅柱' : '綠柱'})
${trend.dmiAdx ? `* **DMI / ADX**：+DI: ${trend.dmiAdx.pdi} ｜ -DI: ${trend.dmiAdx.mdi} ｜ ADX 強度: ${trend.dmiAdx.adx} (${trend.dmiAdx.trendDirection})\n` : ''}
### 2️⃣ 動能擺盪矩陣 (Momentum)
* **RSI 相對強弱**：RSI(6): ${momentum.rsi6 ?? '-'} ｜ RSI(14): ${momentum.rsi14 ?? '-'} ｜ RSI(24): ${momentum.rsi24 ?? '-'}（狀態：\`${momentum.rsiStatus}\`）
* **KD 隨機指標 (9, 3, 3)**：K 值: ${momentum.kd9.k} ｜ D 值: ${momentum.kd9.d}（狀態：\`${momentum.kd9.status}\`）
* **CCI 順勢指標**：${momentum.cci20 ?? '-'}
* **Williams %R**：${momentum.williamsR14 ?? '-'}

### 3️⃣ 波動通道矩陣 (Volatility)
* **布林通道 (20, 2)**：上軌: ${volatility.bollinger.upper} ｜ 中軌: ${volatility.bollinger.mid} ｜ 下軌: ${volatility.bollinger.lower}
* **布林帶寬與極致壓縮**：帶寬 ${volatility.bollinger.bandwidthPercent}% ｜ ${volatility.bollinger.isSqueeze ? '⚡ **帶寬壓縮進入變盤點**' : '帶寬正常舒展'}
* **ATR (14) 波動度**：${volatility.atr14}
* **動態移動防守價**：**${currencySymbol} ${volatility.trailingDefensePrice}**
* **MA 乖離率**：20 日乖離: ${volatility.bias20Percent}% ｜ 60 日乖離: ${volatility.bias60Percent}%

### 4️⃣ 量能與資金流 (Volume & Flow)
* **成交量能比**：昨日量: ${volumeFlow.yesterdayVolume.toLocaleString()} ｜ 5日均量: ${Math.round(volumeFlow.avgVolume5).toLocaleString()} ｜ 20日均量: ${Math.round(volumeFlow.avgVolume20).toLocaleString()}
* **量能狀態**：${volumeFlow.isSurge ? '🔥 **爆量攻擊 (>= 1.8x)**' : volumeFlow.isDryUp ? '❄️ **量縮窒息 (<= 0.35x)**' : '量能平穩'}
* **OBV 能量潮**：現值 ${volumeFlow.obv.current.toLocaleString()} ｜ 趨勢: \`${volumeFlow.obv.trend}\`

### 5️⃣ 關鍵支撐壓力位 (Support & Resistance)
* **Darvas Box 箱體**：箱頂: ${currencySymbol} ${levels.darvasBox.upper} ｜ 箱底: ${currencySymbol} ${levels.darvasBox.lower}（狀態：\`${levels.darvasBox.status}\`）
* **Fibonacci 黃金分割 (近 60 日)**：
  * 0.236 強阻力: ${currencySymbol} ${levels.fibonacci.fib236}
  * 0.382 轉折位: ${currencySymbol} ${levels.fibonacci.fib382}
  * 0.500 多空中軸: ${currencySymbol} ${levels.fibonacci.fib500}
  * 0.618 強支撐位: ${currencySymbol} ${levels.fibonacci.fib618}
* **經典樞紐點 (Pivot Points)**：
  * 阻力 R2: ${currencySymbol} ${levels.pivotPoints.r2} ｜ 阻力 R1: ${currencySymbol} ${levels.pivotPoints.r1}
  * 樞紐中軸 P: ${currencySymbol} ${levels.pivotPoints.pivot}
  * 支撐 S1: ${currencySymbol} ${levels.pivotPoints.s1} ｜ 支撐 S2: ${currencySymbol} ${levels.pivotPoints.s2}
`;
}
