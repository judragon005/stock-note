/**
 * sync-thresholds.cjs
 * 湖倉 7 維欄位健康度與新鮮度門檻單一事實來源 (SSOT)
 * Spec 0240 T01 / Debt 0061 #1
 */

const MARKET_HEALTH_THRESHOLDS = Object.freeze({
  STOCK_COUNT_MIN: 1800,
  CHIPS_COUNT_MIN: 2000,
  FRESHNESS_CHIPS_COUNT_MIN: 1800,
  MARGIN_COUNT_MIN: 1500,
  SBL_COUNT_MIN: 500,
  DAY_TRADE_COUNT_MIN: 500,
  VALUATION_COUNT_MIN: 1500,
  ETF_NAV_COUNT_MIN: 100,
});

const HISTORICAL_MARKET_HEALTH_THRESHOLDS = Object.freeze({
  TWSE_MARGIN_COUNT_MIN: 900, // 歷史補抓日 (< twLatest) 因 TPEx OpenAPI 僅供當日快照，採 TWSE 全量覆蓋底線
  TWSE_VALUATION_COUNT_MIN: 900, // 歷史補抓日 (< twLatest) TWSE BWIBBU_d 全量覆蓋底線
});

const MARKET_SETTLEMENT_CUTOFFS = Object.freeze({
  TW_SETTLE_MINUTES: 15 * 60, // 台股統一結算線：15:00 Asia/Taipei
  TW_PHASE1_PRICE_MINUTES: 14 * 60 + 40, // 台股盤後 Phase 1 價量與 ETF 淨值可寫入門檻：14:40 Asia/Taipei
  TW_PHASE2_FULL_MINUTES: 16 * 60 + 30, // 台股盤後 Phase 2 籌碼／資券／借券完整收斂門檻：16:30 Asia/Taipei
  US_SETTLE_MINUTES: 17 * 60, // 美股統一結算線：17:00 America/New_York (自動夏冬令 DST)
  TDCC_SETTLE_MINUTES: 21 * 60, // 集保週五結算線：21:00 Asia/Taipei
  REVENUE_DEADLINE_DAY: 10,
  REVENUE_DEADLINE_MINUTES: 17 * 60 + 30,
  GAP_CATCHUP_LOOKBACK_DAYS: 30, // Spec 0246 Q1A：近 30 個日曆日缺口自動回溯窗
  MAX_DAILY_RETRIES_PER_LANE: 4, // Spec 0246 Q4A：單軌每日冷卻重試上限
});

module.exports = {
  MARKET_HEALTH_THRESHOLDS,
  HISTORICAL_MARKET_HEALTH_THRESHOLDS,
  MARKET_SETTLEMENT_CUTOFFS,
};
