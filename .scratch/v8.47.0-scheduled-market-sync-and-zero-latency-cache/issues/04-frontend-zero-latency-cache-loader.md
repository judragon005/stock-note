# 04 — 前端零延遲快取載入器與 IndexedDB 同步 (Zero-Latency Cache Loader & IndexedDB Sync)

**What to build:**
落實使用者要求的「只要更新完以後，打開網頁都要能秒讀」。在前端建立 `marketCacheLoader.ts`，當使用者開啟網頁時，第一時間直接以熱加載方式讀取本地快取檔案（`tw_market_summary.json`、`us_market_summary.json`），達成毫秒級瞬間讀取且 0 網路請求；隨後在背景非同步寫入 IndexedDB 做持久化保存。

**Blocked by:** Ticket 01, 02

**Status:** ready-for-agent

- [x] 實作 `src/engine/marketCacheLoader.ts`：支援本地快取熱讀取與水線新鮮度檢查
- [x] 於 `App.tsx` 初始化時執行快取秒讀注入，直接餵給持股、籌碼及指標模組
- [x] 非同步背景沉澱：將快取數據批量寫入 IndexedDB `historicalOhlcv` 與 `technicalIndicators`
- [x] 具備降級容錯保護：若本地快取檔不存在或損毀，無縫降級回既有即時查詢機制
- [x] 單元測試驗證秒讀載入器的載入速度與降級容錯邏輯
