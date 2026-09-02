import {
  HoldingActionDirective,
  HoldingSignal,
  TechnicalIndicators,
  ActionSentiment,
} from '../types/signal';
import { HoldingPosition } from '../types/stock';

/**
 * 依據訊號加權計分與特定形態，評定確定性專家操作建議 (Action Directive)
 */
export function evaluateHoldingActionDirective(
  signals: HoldingSignal[],
  _indicators?: TechnicalIndicators
): HoldingActionDirective {
  const now = Date.now();

  if (!signals || signals.length === 0) {
    return {
      headline: '【盤整觀望】',
      sentiment: 'WAIT_AND_SEE',
      score: 0,
      advice: '多空訊號尚不明顯或處於區間震盪，建議維持紀律配置，靜待明確方向表態。',
      signals: [],
      updatedAt: now,
    };
  }

  // 1. 計算總得分
  const totalScore = signals.reduce((acc, sig) => acc + (sig.weight || 0), 0);

  // 2. 檢測特殊形態 (超賣反彈 / 量縮窒息 / 高檔背離 / 爆量)
  const isOversold = signals.some((s) => s.id === 'KD_OVERSOLD');
  const isDryUp = signals.some((s) => s.id === 'VOL_DRY_UP');
  const isWeekLow = signals.some((s) => s.id === 'PRICE_WEEK_LOW');
  const isOverbought = signals.some((s) => s.id === 'KD_OVERBOUGHT');

  let headline = '【盤整觀望】';
  let sentiment: ActionSentiment = 'WAIT_AND_SEE';
  let advice = '多空訊號相互抵銷，建議維持既有配置與停損防線，暫不躁進。';

  // 3. 專家系統決策分支
  if (totalScore >= 5) {
    headline = '【強勢續抱】';
    sentiment = 'STRONG_BUY';
    advice = '各期均線多頭排列且動能強勁，建議沿 5 日線向上移動停利，持股續抱享受波段利潤。';
  } else if (totalScore >= 2) {
    headline = '【多頭格局】';
    sentiment = 'ACCUMULATE';
    advice = '股價穩守於月季線關鍵支撐之上，短線趨勢偏多，拉回均線有撐時可視為分批加碼點。';
  } else if (totalScore <= -2 && (isOversold || isDryUp)) {
    headline = '【超跌留意】';
    sentiment = 'ACCUMULATE';
    advice = '短期價格偏弱破位，但指標已落入深度超賣區並出現量縮止跌跡象，切勿盲目追殺，可留意低階反彈契機。';
  } else if (totalScore <= -5 || (totalScore <= -3 && isWeekLow)) {
    headline = '【嚴設停損】';
    sentiment = 'STOP_LOSS_EXIT';
    advice = '均線呈現空頭排列且跌破近期新低，空方賣壓沈重，強烈建議嚴守停損點或逢反彈降低風險暴露。';
  } else if (totalScore <= -2) {
    headline = '【弱勢防守】';
    sentiment = 'TRIM';
    advice = '股價跌破短中期關鍵均線，反彈動能疲弱，建議適度減碼持股或提高現金防禦水位。';
  } else if (isOverbought) {
    headline = '【高檔留意】';
    sentiment = 'HOLD';
    advice = '短線指標過熱進入高檔軋空區，持股可續抱但嚴禁追高，隨時準備分批獲利了結。';
  }

  return {
    headline,
    sentiment,
    score: totalScore,
    advice,
    signals,
    updatedAt: now,
  };
}

/**
 * 建構傳遞給外部 LLM 進行深度診斷的 Prompt Payload
 */
export function buildAiAdvisorPromptPayload(
  holding: HoldingPosition,
  signals: HoldingSignal[],
  indicators: TechnicalIndicators,
  directive?: HoldingActionDirective
) {
  return {
    symbol: holding.symbol,
    name: holding.name,
    market: holding.market,
    shares: holding.shares,
    avgCost: holding.avgCost,
    currentPrice: holding.currentPrice,
    unrealizedPnL: holding.unrealizedPnL,
    unrealizedPnLPercent: holding.unrealizedPnLPercent,
    technicalIndicators: indicators,
    signals: signals.map((s) => ({
      id: s.id,
      label: s.label,
      tone: s.tone,
      description: s.description,
    })),
    expertDirective: directive || evaluateHoldingActionDirective(signals, indicators),
  };
}
