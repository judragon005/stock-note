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
  avgVolume20?: number; // 20 日均量 (張/股)
  volumeUnit?: 'LOTS' | 'SHARES';
  volumeInShares?: boolean;
  market?: 'TW' | 'US';
  usMicroScore?: number; // 美股微結構機構評分 (0~100)
}

/**
 * 依據價格序列與市場特徵計算五維量化風險指標
 */
export function calculateRiskSpider(
  candles: CandleRiskInput[],
  options?: RiskSpiderOptions
): RiskSpiderData {
  // 邊界防禦：空資料或不足 2 根 K 線回傳零造假中性基準 (Spec 0239 Zero-Mock)
  if (!candles || candles.length < 2) {
    return {
      liquidityRisk: 0,
      volatilityRisk: 0,
      trendRisk: 0,
      institutionalRisk: 0,
      chipRisk: 0,
      mainForceRiskLevel: 'LOW',
      mainForceRiskIndex: 0,
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
  // 以平均成交量為依歸：雙市場量綱校準 (Spec 0239)
  let totalVolume = 0;
  candles.forEach((c) => {
    totalVolume += c.volume;
  });
  const rawAvgVol = totalVolume / count;
  let liquidityRisk = 50;

  if (options?.market === 'US') {
    // 美股成交量以「股」為單位 (<5萬股極高風險、5萬~50萬中高、50萬~200萬中低、>=200萬低風險20)
    const avgShares = options.volumeUnit === 'LOTS' ? rawAvgVol * 1000 : rawAvgVol;
    if (avgShares >= 2_000_000) {
      liquidityRisk = 20;
    } else if (avgShares < 50_000) {
      // 0 股 -> 95，50,000 股 -> 75 (如日均 3,000 股約 94 分)
      liquidityRisk = Math.round(95 - (avgShares / 50_000) * 20);
    } else if (avgShares < 500_000) {
      // 50,000 ~ 500,000 股：中高風險 75 -> 55
      const ratio = (avgShares - 50_000) / (500_000 - 50_000);
      liquidityRisk = Math.round(75 - ratio * 20);
    } else {
      // 500,000 ~ 2,000,000 股：中低風險 55 -> 20
      const ratio = (avgShares - 500_000) / (2_000_000 - 500_000);
      liquidityRisk = Math.round(55 - ratio * 35);
    }
  } else {
    // 台股以「張」為單位 (若輸入為股數先除以 1000)
    const isSharesUnit =
      options?.volumeUnit === 'SHARES' || options?.volumeInShares === true;
    const avgVol = isSharesUnit ? rawAvgVol / 1000 : rawAvgVol;

    // 成交量 >= 5000 張 -> 低風險 (20)
    // 成交量 <= 200 張 -> 高風險 (70~85)
    if (avgVol >= 5000) {
      liquidityRisk = 20;
    } else if (avgVol <= 200) {
      liquidityRisk = Math.round(85 - (avgVol / 200) * 15);
    } else {
      // 200 ~ 5000 之間平滑過渡
      const ratio = (avgVol - 200) / (5000 - 200);
      liquidityRisk = Math.round(70 - ratio * 45);
    }
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
  if (
    options?.market === 'US' &&
    options.usMicroScore !== undefined &&
    Number.isFinite(options.usMicroScore)
  ) {
    // 美股微結構機構評分映射：高機構評分對應低風險
    institutionalRisk = Math.max(10, Math.min(95, Math.round(100 - options.usMicroScore)));
  } else if (options?.institutionalNetVolume !== undefined) {
    if (options.institutionalNetVolume < -2000) {
      institutionalRisk = 80;
    } else if (options.institutionalNetVolume < 0) {
      institutionalRisk = Math.round(55 + Math.abs(options.institutionalNetVolume) / 100);
    } else if (options.institutionalNetVolume > 2000) {
      institutionalRisk = 25;
    } else {
      institutionalRisk = Math.round(50 - (options.institutionalNetVolume / 2000) * 20);
    }
    institutionalRisk = Math.max(15, Math.min(95, institutionalRisk));
  } else {
    // 若無法人資料，以長黑 K 比例模擬
    let blackCandleCount = 0;
    candles.forEach((c) => {
      if (c.close < c.high * 0.98) blackCandleCount++;
    });
    institutionalRisk = Math.round(40 + (blackCandleCount / count) * 30);
    institutionalRisk = Math.max(15, Math.min(95, institutionalRisk));
  }

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
