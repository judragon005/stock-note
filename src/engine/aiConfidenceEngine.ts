import type { AiConfidenceData, KlineCandleItem } from '../types/aiForceDashboard';

export interface AiConfidenceInput {
  candles?: Array<{ open: number; high: number; low: number; close: number; volume: number }>;
  klineCandles?: KlineCandleItem[];
  hasInstitutionalData?: boolean;
}

/**
 * 輔助：截斷數值於 [min, max]
 */
function clamp(val: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

/**
 * Ticket 05: Card 14 AI 信心維度量化引擎
 */
export function calculateAiConfidence(input: AiConfidenceInput): AiConfidenceData {
  const { candles = [], klineCandles = [], hasInstitutionalData = false } = input;
  const count = candles.length;

  if (count === 0 || klineCandles.length === 0) {
    return {
      overallConfidence: 45,
      modelAccuracy: 40,
      dataCompleteness: 30,
      signalStability: 50,
      strategyApplicability: 45,
    };
  }

  // 1. 資料完整度 (dataCompleteness): 依日 K 筆數與法人資料有無
  let dataCompleteness = 50;
  if (count >= 120) {
    dataCompleteness = hasInstitutionalData ? 98 : 88;
  } else if (count >= 60) {
    dataCompleteness = hasInstitutionalData ? 85 : 78;
  } else if (count >= 20) {
    dataCompleteness = hasInstitutionalData ? 72 : 65;
  } else {
    dataCompleteness = 50;
  }

  // 2. 訊號穩定度 (signalStability): 檢視近 10 日振幅平均與均線波動
  const recent10 = candles.slice(-10);
  const amplitudePercentages = recent10.map((c) => (c.open > 0 ? (Math.abs(c.high - c.low) / c.open) * 100 : 0));
  const avgAmp = amplitudePercentages.reduce((a, b) => a + b, 0) / Math.max(1, amplitudePercentages.length);

  let signalStability = 80;
  if (avgAmp <= 3.0) signalStability = 88;
  else if (avgAmp <= 5.0) signalStability = 78;
  else if (avgAmp <= 8.0) signalStability = 65;
  else signalStability = 48; // 暴衝劇烈時訊號穩定度下降

  // 3. 模型準確度 (modelAccuracy): 檢驗多期均線方向的一致性
  const lastKline = klineCandles[klineCandles.length - 1];
  const ma5 = lastKline.ma5 ?? lastKline.close;
  const ma20 = lastKline.ma20 ?? lastKline.close;
  const ma60 = lastKline.ma60 ?? lastKline.close;

  let modelAccuracy = 65;
  const isAllBull = lastKline.close > ma5 && ma5 > ma20 && ma20 > ma60;
  const isAllBear = lastKline.close < ma5 && ma5 < ma20 && ma20 < ma60;
  if (isAllBull || isAllBear) {
    modelAccuracy = 82; // 明確趨勢中預測模型命中率最高
  } else if (Math.abs(lastKline.close - ma20) / ma20 < 0.02) {
    modelAccuracy = 60; // 均線糾結黏著震盪區
  } else {
    modelAccuracy = 72;
  }

  // 若樣本短少 (< 30 根)，模型準確度缺乏長天期回測支持
  if (count < 30) {
    modelAccuracy = Math.round(modelAccuracy * 0.75);
  }

  // 4. 策略適用度 (strategyApplicability): 評估成交量能與趨勢清晰度
  let strategyApplicability = 70;
  const last = candles[count - 1];
  const recent20 = candles.slice(-20);
  const avgVol = recent20.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent20.length);
  if (avgVol > 2000 && last.volume > 1000) {
    strategyApplicability = 82;
  } else if (avgVol < 300) {
    strategyApplicability = 45; // 流動性枯竭不易實施量化策略
  }

  if (count < 30) {
    strategyApplicability = Math.round(strategyApplicability * 0.7);
  }

  // 5. 總體信心度 (overallConfidence)
  const overallConfidence = clamp(
    Math.round(dataCompleteness * 0.3 + signalStability * 0.25 + modelAccuracy * 0.25 + strategyApplicability * 0.2)
  );

  return {
    overallConfidence,
    modelAccuracy: clamp(modelAccuracy),
    dataCompleteness: clamp(dataCompleteness),
    signalStability: clamp(signalStability),
    strategyApplicability: clamp(strategyApplicability),
  };
}
