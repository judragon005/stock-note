import { RiskSpiderData } from '../types/aiForceDashboard';

export interface CandleRiskInput {
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
}

export interface RiskSpiderOptions {
  institutionalNetVolume?: number; // 法人買賣超 (張)
  turnoverRate?: number; // 當日週轉率 (%)
  avgVolume20?: number; // 20 日均量 (張)
}

/**
 * 依據價格序列與市場特徵計算五維量化風險指標
 */
export function calculateRiskSpider(
  candles: CandleRiskInput[],
  options?: RiskSpiderOptions
): RiskSpiderData {
  // 邊界防禦：空資料或不足
  if (!candles || candles.length === 0) {
    return {
      liquidityRisk: 30,
      volatilityRisk: 50,
      trendRisk: 45,
      institutionalRisk: 55,
      chipRisk: 48,
      mainForceRiskLevel: 'MEDIUM_HIGH',
      mainForceRiskIndex: 60,
    };
  }

  const count = candles.length;

  // 1. 波動風險 (Volatility Risk)
  // 計算近期平均振幅比例 (high - low) / close
  let totalAmplitudePct = 0;
  candles.forEach((c) => {
    const denom = c.close > 0 ? c.close : 1;
    const amp = Math.max(0, c.high - c.low) / denom;
    totalAmplitudePct += amp;
  });
  const avgAmplitude = totalAmplitudePct / count;

  // 若平均振幅為 0，風險 10；若平均振幅達 8%，風險 85
  // 線性映射 + clamp: 振幅 1% 約 25 分，5% 約 65 分，8% 約 85 分
  let volatilityRisk = Math.round(10 + (avgAmplitude / 0.08) * 75);
  volatilityRisk = Math.max(10, Math.min(100, volatilityRisk));

  // 2. 流動性風險 (Liquidity Risk)
  // 以平均成交量為依歸
  let totalVolume = 0;
  candles.forEach((c) => {
    totalVolume += c.volume;
  });
  const avgVol = totalVolume / count;

  // 成交量 > 5000 張 -> 低風險 (~15-25)
  // 成交量 < 300 張 -> 高風險 (> 70)
  let liquidityRisk = 50;
  if (avgVol >= 5000) {
    liquidityRisk = 20;
  } else if (avgVol <= 200) {
    liquidityRisk = Math.round(85 - (avgVol / 200) * 15);
  } else {
    // 200 ~ 5000 之間平滑過渡
    const ratio = (avgVol - 200) / (5000 - 200);
    liquidityRisk = Math.round(70 - ratio * 45);
  }
  liquidityRisk = Math.max(10, Math.min(100, liquidityRisk));

  // 3. 趨勢風險 (Trend Risk)
  // 最新收盤價與近期均價比較
  const latestClose = candles[count - 1]?.close ?? 1;
  const firstClose = candles[0]?.close ?? latestClose;
  const totalReturn = (latestClose - firstClose) / (firstClose > 0 ? firstClose : 1);

  // 若大幅走跌 (> -10%) 趨勢風險高 (> 70)
  // 若穩健上漲 趨勢風險低 (~30-40)
  let trendRisk = Math.round(50 - totalReturn * 100 * 1.5);
  trendRisk = Math.max(15, Math.min(95, trendRisk));

  // 4. 法人風險 (Institutional Risk)
  let institutionalRisk = 50;
  if (options?.institutionalNetVolume !== undefined) {
    if (options.institutionalNetVolume < -2000) {
      institutionalRisk = 80;
    } else if (options.institutionalNetVolume < 0) {
      institutionalRisk = Math.round(55 + Math.abs(options.institutionalNetVolume) / 100);
    } else if (options.institutionalNetVolume > 2000) {
      institutionalRisk = 25;
    } else {
      institutionalRisk = Math.round(50 - (options.institutionalNetVolume / 2000) * 20);
    }
  } else {
    // 若無法人資料，以長黑 K 比例模擬
    let blackCandleCount = 0;
    candles.forEach((c) => {
      if (c.close < c.high * 0.98) blackCandleCount++;
    });
    institutionalRisk = Math.round(40 + (blackCandleCount / count) * 30);
  }
  institutionalRisk = Math.max(15, Math.min(95, institutionalRisk));

  // 5. 籌碼風險 (Chip Risk)
  let chipRisk = 48;
  if (options?.turnoverRate !== undefined) {
    // 週轉率 > 15% 屬於過熱短沖，籌碼風險高
    if (options.turnoverRate > 15) {
      chipRisk = Math.round(75 + Math.min(20, (options.turnoverRate - 15) * 2));
    } else if (options.turnoverRate < 2) {
      chipRisk = 30;
    } else {
      chipRisk = Math.round(35 + (options.turnoverRate / 15) * 35);
    }
  } else {
    chipRisk = Math.round((volatilityRisk + institutionalRisk) / 2);
  }
  chipRisk = Math.max(15, Math.min(95, chipRisk));

  // 6. 綜合主力風險指數 (加權計算)
  const weightedIndex =
    volatilityRisk * 0.25 +
    trendRisk * 0.2 +
    institutionalRisk * 0.2 +
    chipRisk * 0.2 +
    liquidityRisk * 0.15;
  const mainForceRiskIndex = Math.max(0, Math.min(100, Math.round(weightedIndex)));

  // 等級判定
  let mainForceRiskLevel: RiskSpiderData['mainForceRiskLevel'] = 'MEDIUM';
  if (mainForceRiskIndex >= 75) {
    mainForceRiskLevel = 'HIGH';
  } else if (mainForceRiskIndex >= 55) {
    mainForceRiskLevel = 'MEDIUM_HIGH';
  } else if (mainForceRiskIndex >= 35) {
    mainForceRiskLevel = 'MEDIUM';
  } else {
    mainForceRiskLevel = 'LOW';
  }

  return {
    liquidityRisk,
    volatilityRisk,
    trendRisk,
    institutionalRisk,
    chipRisk,
    mainForceRiskLevel,
    mainForceRiskIndex,
  };
}
