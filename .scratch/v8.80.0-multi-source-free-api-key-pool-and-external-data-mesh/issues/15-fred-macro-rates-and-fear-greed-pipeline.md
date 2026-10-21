# 15-fred-macro-rates-and-fear-greed-pipeline

## Description
在本地 Lakehouse 建立宏觀指標與市場情緒日序表 `macro_sentiment_daily`，撰寫 `ingest-macro-sentiment.cjs` 腳本，透過 FRED API（串接 SmartKeyRotator）同步美國 3 個月與 10 年美債殖利率，並拉取 CNN Fear & Greed 指數與期交所 Put/Call Ratio，提供量化引擎動態無風險利率與宏觀溫度計。

## Target Files
- `scripts/market-sync/sqlite-db-core.cjs`
- `scripts/market-sync/ingest-macro-sentiment.cjs`
- `src/engine/quantMetrics.ts`

## Acceptance Criteria
- [x] 於 `sqlite-db-core.cjs` 建立 `macro_sentiment_daily`：
  - 欄位：`date` (主鍵), `risk_free_rate_3m`, `treasury_yield_10y`, `yield_spread_10y_2y`, `cnn_fear_greed_score`, `vix_close`, `tw_put_call_ratio`。
- [x] 實作 FRED API 串接：拉取 `DGS3MO` 與 `DGS10`，計算 `yield_spread_10y_2y = DGS10 - DGS2`。
- [x] 實作 CNN Fear & Greed 公開 JSON 拉取並解析當日分數（0~100）。
- [x] 更新 `quantMetrics.ts`：夏普值與 CAPM 的無風險利率由靜態寫死改為讀取當前最新的 3M 美債殖利率（若無數據則兜底安全常數）。
- [x] 撰寫單元測試驗證總經資料儲存與無風險利率動態注入計算。

## Status
- [x] done
