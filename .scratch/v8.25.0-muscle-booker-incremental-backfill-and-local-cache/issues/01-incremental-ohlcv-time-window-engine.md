# Issue 01: 短期增量日 K 區間請求與體積優化引擎 (Incremental OHLCV Engine)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `performance`

## 任務說明

1. 修改 `src/engine/historicalOhlcvBackfill.ts`：
   - 支援增量查詢時間範圍計算：
     - 若本地已存有該標的之日 K：檢查最新日期的時間戳，向後推算（如扣除 7 天緩衝）作為 `period1`，避免抓取整段歷史。
     - 若本地為空：預設以最近 180 天（約 6 個月）作為 `period1`，足以計算 60MA 與 Darvas 箱體，不再使用 `period1=0` 抓全量數十年數據。
   - 保留增量合併 `mergeDailyCandles`，確保新舊數據去重按日排序。
   - 計算肌肉書僮指標並寫入 IndexedDB。
