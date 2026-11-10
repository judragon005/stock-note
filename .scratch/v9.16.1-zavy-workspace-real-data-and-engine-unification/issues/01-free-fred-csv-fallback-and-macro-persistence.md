# 01 — 免 Key FRED 官方公開 CSV 備援與總經持久化擴充

**Parent:** [#478](https://github.com/judragon005/stock-note/issues/478)

**What to build:**
當使用者未在環境變數或設定中提供 `FRED_API_KEY` 時，系統在同步宏觀數據時能自動透過 FRED 官方免費免 Key 公開 CSV 端點（`https://fred.stlouisfed.org/graph/fredgraph.csv?id={seriesId}`）抓取最新官方真實利率、通膨與信用利差，並完整持久化至本地 SQLite `macro_sentiment_daily`，解決離線或未填 Key 時數據為 `null` 導致前端退回假數據的問題。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `scripts/market-sync/ingest-macro-sentiment.cjs` 實作 `fetchFredCsvObservations(seriesId, fetchJson, timeoutMs)`，支援自 `https://fred.stlouisfed.org/graph/fredgraph.csv?id=...` 解析最新非空浮點數，並對 `CPIAUCSL`、`AMTMNO`、`AMTMTI`、`INDPRO` 支援計算 12 個月 YoY 年增率 (%)
- [ ] 在 `fetchFredSeriesLatest` 中，當 `apiKey` 為空或無效時，自動無縫 Fallback 調用 `fetchFredCsvObservations` 抓取真實數據
- [ ] 在 `sqlite-db-core.cjs` 執行無損冪等 `ALTER TABLE macro_sentiment_daily`，新增 `us_mfg_new_orders_yoy`、`us_mfg_inventories_yoy`、`us_orders_minus_inv_spread`、`us_industrial_prod_yoy` 欄位
- [ ] 擴充 `fetchFullMacroWarRoomPulse` 與 `ingestMacroSentimentToDb`，將免 Key 抓取的真實 10Y/2Y 殖利率、利差、高收益債 OAS (`BAMLH0A0HYM2`)、CCC 利差 (`BAMLH0A3HYC`)、10Y 平衡通膨率 (`T10YIE`) 及美國製造業新訂單/存貨年增率寫入 SQLite
- [ ] 在 `scripts/market-sync/__tests__/sqlite-db-core.test.cjs` 或專屬單元測試中，驗證免 Key CSV 抓取與入庫行為完全正常

