import type { MainForceVerdictData } from '../types/aiForceDashboard';

export interface MainForceSemanticInput {
  fiveDaysNetShares?: number;
  vwapBiasPercent?: number;
  rsi?: number;
  market?: 'TW' | 'US';
  usMicroScore?: number;
  rvol?: number;
  mfi?: number;
  shortFloatRatio?: number;
}

/**
 * 主力行為語意分析合成 (MLP-AI) 演算法引擎 (支援台股三大法人 / 美股機構量價雙市場語意)
 */
export function synthesizeMainForceVerdict(
  input: MainForceSemanticInput = {}
): MainForceVerdictData {
  const {
    fiveDaysNetShares = 0,
    vwapBiasPercent = 0,
    rsi = 50,
    market = 'TW',
    usMicroScore = 50,
    rvol,
    mfi,
    shortFloatRatio,
  } = input;

  const biasFormatted = `${vwapBiasPercent >= 0 ? '+' : ''}${vwapBiasPercent.toFixed(1)}%`;

  if (market === 'US') {
    const score = Math.round(usMicroScore);
    const rvolText = rvol !== undefined && Number.isFinite(rvol) ? `${rvol.toFixed(2)}x` : '1.00x';
    const rsiText = Number.isFinite(rsi) ? Math.round(rsi) : 50;
    const mfiSuffix = mfi !== undefined && Number.isFinite(mfi) ? `、MFI ${Math.round(mfi)}` : '';
    const squeezeSuffix =
      shortFloatRatio !== undefined && Number.isFinite(shortFloatRatio) && shortFloatRatio >= 10
        ? `；空單流通比達 ${shortFloatRatio.toFixed(1)}%，留意短線軋空波動`
        : '';

    const metricsSummary = `機構評分 ${score} 分、RVOL ${rvolText}、收盤相對 20 日 VWAP ${biasFormatted}、RSI ${rsiText}${mfiSuffix}`;

    let primaryVerb = '區間整理';
    let conclusion = '量價動能均衡，維持區間震盪整理';

    if (score >= 65 && vwapBiasPercent > 2) {
      primaryVerb = '鎖碼推升';
      conclusion = '量價齊揚站穩成本帶上方，機構主導鎖碼推升，短線動能偏多';
    } else if (score >= 60 && vwapBiasPercent <= 2) {
      primaryVerb = '低接吸籌';
      conclusion = '股價位於成本帶附近獲買盤承接，機構低接吸籌跡象明確';
    } else if (score <= 40 && vwapBiasPercent < -2) {
      primaryVerb = '賣壓沉重';
      conclusion = '資金呈淨流出且跌破成本帶，賣壓沉重，短線偏空防禦為宜';
    } else if ((score <= 45 && vwapBiasPercent > 3) || (vwapBiasPercent > 5 && rsi >= 70)) {
      primaryVerb = '高檔調節';
      conclusion = '股價正乖離擴大且動能轉弱，慎防機構高檔調節獲利了結';
    } else if (vwapBiasPercent < -3 && rsi <= 35 && score > 40) {
      primaryVerb = '超跌反彈';
      conclusion = '短線乖離過深且技術指標進入超賣區，具備超跌反彈契機';
    }

    return {
      primaryVerb,
      semanticTag: '機構量價',
      fullVerdictText: `AI 結論：美股微觀量價綜合研判（${metricsSummary}），${conclusion}${squeezeSuffix}。`,
    };
  }

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
