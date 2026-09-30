# 04 — 前端快取熱載入與 IndexedDB 自動沉澱修復

**What to build:**
確保前端 `MarketSyncStatusBadge` 能在載入新快取時正常展示台股資料日期；並驗證 `syncMarketCacheToIndexedDB` 啟動時順暢將增量日K與技術指標沉澱至本地 IndexedDB 資料庫。

**Blocked by:** 02 — Windows 排程批次檔修復, 03 — 台股快取頂層 date 補齊與空數據防清空守門員

**Status:** ready-for-agent

- [ ] 前端徽章彈窗中台股與美股之「資料日期」均正常顯示實際日期字串。
- [ ] 啟動應用時無寫入異常，最新交易日數據自動沉澱進 IndexedDB。
