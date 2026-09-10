import { TradeRecord, HoldingPosition } from '../types/stock';
import {
  BehavioralAuditReport,
  DispositionEffectMetrics,
  FOMOEntryAuditMetrics,
  FrictionCostMetrics,
} from '../types/behavioralAudit';

/**
 * 計算兩日期之間的自然日天數差
 */
function diffDays(fromDateStr: string, toDateStr: string): number {
  if (!fromDateStr || !toDateStr) return 0;
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  const diffTime = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * 交易行為心理學與情緒偏誤量化覆盤引擎
 */
export function calculateBehavioralAuditReport(
  trades: TradeRecord[],
  holdings: HoldingPosition[] = [],
  averageNAV: number = 1000000
): BehavioralAuditReport {
  const today = new Date().toISOString().split('T')[0];

  // 防禦性拷貝並確保按交易日期 (由舊至新) 穩定排序，消除處置效應比對時的倖存者偏差
  const sortedTrades = [...trades].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // 1. 處置效應 (Disposition Effect) 量化
  const gainDaysList: number[] = [];
  const lossDaysList: number[] = [];
  let realizedGainTradesCount = 0;
  let realizedLossTradesCount = 0;

  // 建立標的買進歷史快速檢索：symbol -> TradeRecord[] (BUY) (已按時序升冪排列)
  const buyTradesMap = new Map<string, TradeRecord[]>();
  for (const t of sortedTrades) {
    if (t.type === 'BUY' || t.type === 'MARGIN_BUY') {
      const sym = t.symbol.trim().toUpperCase();
      if (!buyTradesMap.has(sym)) {
        buyTradesMap.set(sym, []);
      }
      buyTradesMap.get(sym)!.push(t);
    }
  }

  // 遍歷所有賣出平倉紀錄
  for (const t of sortedTrades) {
    if (t.type === 'SELL' || t.type === 'MARGIN_SELL') {
      const sym = t.symbol.trim().toUpperCase();
      const priorBuys = buyTradesMap.get(sym) || [];
      // 尋找此筆賣出前最近的買進日 (priorBuys 已按時序排序，pop 即為最近一筆)
      const buyTrade = priorBuys.filter((b) => b.date <= t.date).pop();
      const holdingDays = buyTrade ? Math.max(1, diffDays(buyTrade.date, t.date)) : 1;

      const proceeds = (t.shares || 0) * (t.price || 0) - (t.fee || 0) - (t.tax || 0);
      const approxCost = buyTrade ? (t.shares || 0) * (buyTrade.price || 0) : 0;
      const profit = approxCost > 0 ? proceeds - approxCost : 0;

      if (profit >= 0) {
        gainDaysList.push(holdingDays);
        realizedGainTradesCount++;
      } else {
        lossDaysList.push(holdingDays);
        realizedLossTradesCount++;
      }
    }
  }

  // 將當前未實現浮虧部位納入虧損持有天數統計（防範死抱拗單盲區）
  for (const h of holdings) {
    if (h.shares > 0 && (h.unrealizedPnL || 0) < 0) {
      const buyDate = h.lastTradeDate || today;
      const holdingDays = Math.max(1, diffDays(buyDate, today));
      lossDaysList.push(holdingDays);
    }
  }

  const avgHoldingDaysGain =
    gainDaysList.length > 0 ? gainDaysList.reduce((a, b) => a + b, 0) / gainDaysList.length : 0;
  const avgHoldingDaysLoss =
    lossDaysList.length > 0 ? lossDaysList.reduce((a, b) => a + b, 0) / lossDaysList.length : 0;

  const holdingDaysBiasRatio =
    avgHoldingDaysGain > 0 ? avgHoldingDaysLoss / avgHoldingDaysGain : avgHoldingDaysLoss > 0 ? 99 : 1.0;

  const totalClosedTrades = realizedGainTradesCount + realizedLossTradesCount;
  const pgr = totalClosedTrades > 0 ? realizedGainTradesCount / totalClosedTrades : 0;
  const plr = totalClosedTrades > 0 ? realizedLossTradesCount / totalClosedTrades : 0;

  let severity: 'HEALTHY' | 'MODERATE' | 'SEVERE' = 'HEALTHY';
  let diagnosisText = '✅ 交易心態健康：持有獲利與虧損部位的時間分佈理性平衡。';

  if (holdingDaysBiasRatio > 3.0) {
    severity = 'SEVERE';
    diagnosisText = `🚨 顯著處置效應：虧損部位平均抱牢 ${avgHoldingDaysLoss.toFixed(1)} 天，是獲利部位 (${avgHoldingDaysGain.toFixed(1)} 天) 的 ${holdingDaysBiasRatio.toFixed(1)} 倍！習慣急於停利、不願認賠。`;
  } else if (holdingDaysBiasRatio > 1.5) {
    severity = 'MODERATE';
    diagnosisText = `⚠️ 輕度處置效應：獲利抱不住 (${avgHoldingDaysGain.toFixed(1)} 天)，虧損易凹單 (${avgHoldingDaysLoss.toFixed(1)} 天)。`;
  }

  const disposition: DispositionEffectMetrics = {
    avgHoldingDaysGain,
    avgHoldingDaysLoss,
    holdingDaysBiasRatio,
    pgr,
    plr,
    severity,
    diagnosisText,
  };

  // 2. 摩擦成本與年化資產拖累率
  let totalFeesPaid = 0;
  let totalTaxesPaid = 0;
  for (const t of sortedTrades) {
    totalFeesPaid += Number(t.fee) || 0;
    totalTaxesPaid += Number(t.tax) || 0;
  }
  const totalFrictionCost = totalFeesPaid + totalTaxesPaid;
  const safeNAV = averageNAV > 0 ? averageNAV : 1000000;
  const annualizedDragRatePercent = (totalFrictionCost / safeNAV) * 100;

  // 依據市場慣常摩擦費率反推資金年化週轉率：
  // 完整來回買賣摩擦率約 0.5% ~ 2.0%（台股手續費 0.1425% * 2 折扣後 + 證交稅 0.3% ≈ 0.6%）
  // 此處以估算乘數 50（等價於保守假設來回摩擦率為 2% 進行資金換手倍數推導：1 / 0.02 = 50）
  const APPROX_ROUNDTRIP_FRICTION_MULTIPLIER = 50;
  const annualizedTurnoverRate = safeNAV > 0 ? (totalFrictionCost / safeNAV) * APPROX_ROUNDTRIP_FRICTION_MULTIPLIER : 0;

  const friction: FrictionCostMetrics = {
    totalFeesPaid,
    totalTaxesPaid,
    totalFrictionCost,
    annualizedTurnoverRate,
    annualizedDragRatePercent,
  };

  // 3. FOMO 追高情緒進場審計 (依賴買進價格與平均價粗略正乖離)
  let totalBuyTradesCount = 0;
  let chasingHighTradesCount = 0;

  for (const t of sortedTrades) {
    if (t.type === 'BUY' || t.type === 'MARGIN_BUY') {
      totalBuyTradesCount++;
      // 若無真實歷史 K 線，檢視當前持倉成本與買進價之相對偏離
      const holding = holdings.find((h) => h.symbol === t.symbol);
      if (holding && holding.avgCost > 0) {
        const biasPercent = ((t.price - holding.avgCost) / holding.avgCost) * 100;
        if (biasPercent > 15) {
          chasingHighTradesCount++;
        }
      }
    }
  }

  const chasingHighRatio = totalBuyTradesCount > 0 ? (chasingHighTradesCount / totalBuyTradesCount) * 100 : 0;
  const chasingHighWinRate = 35.0; // 預設追高平均勝率基準
  const calmEntryWinRate = 65.0; // 冷靜進場勝率基準
  const alphaDragPercentage = Math.max(0, calmEntryWinRate - chasingHighWinRate);

  const fomo: FOMOEntryAuditMetrics = {
    totalBuyTradesCount,
    chasingHighTradesCount,
    chasingHighRatio,
    chasingHighWinRate,
    calmEntryWinRate,
    alphaDragPercentage,
  };

  // 4. 動態客觀交易紀律建議卡片生成
  const actionableInsights: string[] = [];

  if (severity === 'SEVERE') {
    actionableInsights.push(
      `🎯 截斷虧損：您的虧損部位抱牢時間高達 ${avgHoldingDaysLoss.toFixed(0)} 天，請務必在進場前設定硬性停損價（如 -8%），跌破無條件離場。`
    );
  }

  if (avgHoldingDaysGain < 7 && gainDaysList.length > 0) {
    actionableInsights.push(
      `🚀 讓利潤奔馳：您的獲利部位平均持有僅 ${avgHoldingDaysGain.toFixed(1)} 天便急著離場，建議改採移動停利（如跌破 10MA 或前低才出場），避免賣在起漲點。`
    );
  }

  if (annualizedDragRatePercent > 1.0) {
    actionableInsights.push(
      `💸 摩擦成本過高：手續費與證交稅已吃掉您 +${annualizedDragRatePercent.toFixed(2)}% 的年化淨報酬，請降低非必要的短線頻繁換手。`
    );
  }

  if (actionableInsights.length === 0) {
    actionableInsights.push('👏 表現優異：您的各項行為心理指標均在健康範圍內，請繼續嚴格維持目前的交易紀律！');
  }

  return {
    period: {
      startDate: trades.length > 0 ? trades[0].date : today,
      endDate: today,
    },
    disposition,
    fomo,
    friction,
    actionableInsights,
  };
}
