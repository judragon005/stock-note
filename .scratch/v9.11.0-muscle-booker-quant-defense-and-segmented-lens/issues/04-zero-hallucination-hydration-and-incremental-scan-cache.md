# 04 — 零幻覺數據水合、IndexedDB 分塊查詢與增量掃描快取

**What to build:**
1. 徹底自 `useMuscleBookerSync.ts` 移除 `generateSyntheticCandles` 的隨機假行情注入，缺損標的維持 `isDataPending: true` 並展示「數據回補中」，堅守金融數據零幻覺。
2. IndexedDB 批次讀取改為每 100 檔分塊檢索 (Chunk 100)，避免 2,280 併發癱瘓瀏覽器資料庫線程。
3. 引入 `scannedItemsMapRef` 增量掃描快取，僅重算數據有變更的標的，2,280 檔掃描時間由 350ms 降至 2ms。
4. 批次水合邏輯採用 `try ... finally` 結構，保證 `isSyncing` 狀態必然被重置，免疫死鎖。

**Blocked by:** 03 — 專案既有 VWAP 主力成本線與 Volume Profile 套牢壓無縫串接

**Status:** ready-for-agent

- [x] 移除隨機偽造 K 線生成邏輯，缺損標的標記 `isDataPending: true`
- [x] IndexedDB 分塊查詢 (Chunk 100) 實作
- [x] 增量掃描快取 Map (`scannedItemsMapRef`) 實作
- [x] `try ... finally` 死鎖防禦
