import type { MainForceVerdictData } from '../types/aiForceDashboard';

export interface MainForceSemanticInput {
  fiveDaysNetShares?: number;
  vwapBiasPercent?: number;
  rsi?: number;
}

/**
 * 主力行為語意分析合成 (MLP-AI) 演算法引擎
 */
export function synthesizeMainForceVerdict(
  input: MainForceSemanticInput = {}
): MainForceVerdictData {
  const { fiveDaysNetShares = -64, vwapBiasPercent = 7.5, rsi = 60 } = input;

  const biasFormatted = `${vwapBiasPercent >= 0 ? '+' : ''}${vwapBiasPercent.toFixed(1)}%`;
  const sharesFormatted = `${fiveDaysNetShares >= 0 ? '+' : ''}${fiveDaysNetShares.toLocaleString()} 張`;

  let primaryVerb = '區間整理';
  let fullVerdictText = '';

  if (fiveDaysNetShares <= -1000 && vwapBiasPercent < -3) {
    primaryVerb = '賣壓沉重';
    fullVerdictText = `AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 ${sharesFormatted}、收盤相對 20 日 VWAP ${biasFormatted}、RSI ${rsi}），法人大幅撤退，短線偏空防禦為宜。`;
  } else if (fiveDaysNetShares >= 1000 && vwapBiasPercent > 3) {
    primaryVerb = '積極進貨';
    fullVerdictText = `AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 ${sharesFormatted}、收盤相對 20 日 VWAP ${biasFormatted}、RSI ${rsi}），法人強勢買超突破，短線結構偏多。`;
  } else if (fiveDaysNetShares < 0 && vwapBiasPercent > 3) {
    primaryVerb = '調節減碼';
    fullVerdictText = `AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 ${sharesFormatted}、收盤相對 20 日 VWAP ${biasFormatted}、RSI ${rsi}），法人小幅調節，短線宜區間操作。`;
  } else if (fiveDaysNetShares > 0 && vwapBiasPercent < -3) {
    primaryVerb = '逢低承接';
    fullVerdictText = `AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 ${sharesFormatted}、收盤相對 20 日 VWAP ${biasFormatted}、RSI ${rsi}），法人低檔逢低佈局，靜待反彈。`;
  } else {
    primaryVerb = '區間整理';
    fullVerdictText = `AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 ${sharesFormatted}、收盤相對 20 日 VWAP ${biasFormatted}、RSI ${rsi}），籌碼動能均衡，維持區間震盪整理。`;
  }

  return {
    primaryVerb,
    semanticTag: '法人動作',
    fullVerdictText,
  };
}
