# 04 — 美股湖倉雙模態採集管線與 SQLite 斷點續傳 (US Lakehouse Ingestion Dual-Mode Pipeline)

**What to build:**
1. 重構升級 `scripts/market-sync/sync-us-market.cjs`：
   - 支援 `--mode=bootstrap` (首次全量回補模式)：抓取 1,500+ 檔美股最近 250 天歷史日 K（含 `adj_close`）並寫入 `daily_candles`，同時建立 `sync_checkpoints` 基準線。
   - 支援 `--mode=daily` (每日定時增量模式)：每日 08:00 定時排程執行，僅更新最新收盤 K 線並滾動刷新指標。
2. 整合 `scripts/market-sync/us-sync-checkpoint-engine.cjs`：
   - 啟動時調用 `getPendingUsSymbols()`，自動跳過今日已 `SUCCESS` 的標的，實現 100% 斷點續傳。
   - 每次成功抓取立即原子標記狀態，失敗時記錄錯誤訊息至 `sync_checkpoints`。
3. 雙軌持久化：
   - 即時事務批次寫入 SQLite 湖倉 `daily_candles`。
   - 完成 Tier 0/Tier 1 時即刻輸出第一版 `us_market_summary.json`，全量完成後再次原子更新，確保前端極速秒讀。

**Blocked by:** Ticket 02, Ticket 03

**Status:** completed

- [x] 重構 `sync-us-market.cjs` 支援 `--mode=bootstrap` 與 `--mode=daily` 參數切換。
- [x] 串接 `getPendingUsSymbols()` 與 `recordSyncCheckpoint()` 斷點續傳狀態機。
- [x] 整合 `saveUsCandlesToSqlite()` 事務寫入歷史日 K 與還原收盤價。
- [x] 實作 Tier 0/Tier 1 階段性快取刷新與最終全量快取刷新機制。
