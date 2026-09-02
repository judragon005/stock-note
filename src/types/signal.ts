/**
 * 股票持股技術訊號、指標與操作建議之型別定義
 */

export type SignalCategory = 'MA_LEVEL' | 'MOMENTUM' | 'VOLUME' | 'PRICE_EXTREME' | 'CHIPS';

export type SignalTone = 'BULLISH' | 'BEARISH' | 'WARNING' | 'NEUTRAL';

export interface HoldingSignal {
  id: string;                      // 唯一識別碼，例如 'MA_BELOW_5', 'KD_K_SURGE_9'
  label: string;                   // 顯示標籤文字，例如 '5日線之下', '9日K大幅拉升'
  category: SignalCategory;        // 訊號類別
  tone: SignalTone;                // 視覺語意調性 (BULLISH 翡翠綠, BEARISH 亮紅, WARNING 琥珀黃, NEUTRAL 沉穩藍紫)
  weight: number;                  // 專家系統加權分數 (+3 ~ -3)
  description?: string;            // 詳細說明 (Tooltip 呈現)
  metricsValue?: number | string;  // 具體數值 (如 MA5: 38.5, K: 85.2)
}

export interface DailyCandle {
  date: string;                    // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  currentPrice: number;
  ma5?: number;
  ma20?: number;
  ma60?: number;
  ma120?: number;
  ma240?: number;
  k9?: number;
  d9?: number;
  prevK9?: number;
  prevD9?: number;
  dif12_26?: number;
  macd9?: number;
  macdHist?: number;
  prevMacdHist?: number;
  yesterdayVolume?: number;
  avgVolume5?: number;
  avgVolume20?: number;
  weekLow5?: number;
  weekHigh5?: number;
  monthLow20?: number;
  monthHigh20?: number;
  bias20?: number;                 // 月線乖離率 %
  bias60?: number;                 // 季線乖離率 %
}

export type ActionSentiment =
  | 'STRONG_BUY'
  | 'ACCUMULATE'
  | 'HOLD'
  | 'TRIM'
  | 'STOP_LOSS_EXIT'
  | 'WAIT_AND_SEE';

export interface HoldingActionDirective {
  headline: string;                // 四字定調，例如 '【強勢續抱】'、'【逢高減碼】'
  sentiment: ActionSentiment;      // 操作情緒傾向
  score: number;                   // 綜合量化得分
  advice: string;                  // 紀律性具體操作指南 (1~2 句話)
  signals: HoldingSignal[];        // 觸發的訊號清單
  updatedAt: number;               // 評定時間戳記
}
