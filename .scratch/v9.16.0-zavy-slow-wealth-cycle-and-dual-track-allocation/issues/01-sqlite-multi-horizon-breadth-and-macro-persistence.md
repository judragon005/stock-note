# Ticket 01: SQLite 湖倉叢集索引多週期還原寬度與宏觀持久化修復

**State:** CLOSED  
**Parent:** #472 (Spec 0221)  

## What to build
1. 擴充 `scripts/market-sync/sqlite-db-core.cjs`：
   - 執行冪等 `ALTER TABLE macro_sentiment_daily` 補齊 `treasury_yield_2y`、`fed_funds_rate`、`us_cpi_yoy`、`credit_spread_oas`、`tw_margin_maintenance_ratio`、`ig_spread_oas`、`ccc_spread_oas`、`breakeven_10y`、`initial_claims`。
   - 實作 `getMarketMultiHorizonBreadth` 函式，利用 `PRIMARY KEY (symbol, date)` 叢集索引順序掃描與條件平均，一次計算台美 `20MA / 60MA / 200MA` 還原寬度與台股近 60 日融資去槓桿比率，並提供交易日定錨記憶體快取。
2. 擴充 `scripts/market-sync/ingest-macro-sentiment.cjs`：抓取 FRED 利差、平衡通膨率與初請失業金數據並持久化至 SQLite。
3. 擴充 `scripts/market-sync/vite-market-middleware.cjs`：掛載 `/api/market/macro` 與 `/api/market/breadth` 端點。

## Acceptance criteria
- [x] SQLite `macro_sentiment_daily` 支援新增 9 個欄位且具備動態無損遷移。
- [x] 多週期市場寬度計算耗時 `< 80ms`（快取命中 `< 0.1ms`）。
- [x] 跨資產宏觀指標離線持久化 100% 正常。
