# 06 — 雙軌回補 UI 進度分離與看門狗尾盤自動補漏 (Backfill Resilience & UX)

**What to build:**
1. 升級 `scripts/market-sync/backfill-full-market-history.cjs`：全域回補狀態明確提供獨立的 `tw.progressPct`、`us.progressPct` 與 `globalProgressPct`。
2. 升級 `src/components/MarketScheduleHubSection.tsx`：重構進度卡片排版，清楚標註階段進度（例如：`總進度: 13% ｜ 台股階段: 25.2% (63/250天)`），徹底消除 UI 視覺算術誤會。
3. 升級 `scripts/market-sync/backfill-tw-history-web.cjs`：在 250 天主循環結束時，若 `failedDates.length > 0` 且 `failedDates.length <= 5`，在延遲 5 秒防爬蟲冷卻後，自動對熔斷失敗之日期發起一次單輪重試，成功者自失敗名單剔除並寫入資料庫，達成 100% 自動收斂閉環。

**Blocked by:** 01 — 湖倉索引補強與入庫深度解耦 (Storage Depth & Indexing)

**Status:** closed

- [x] 全域回補狀態包含分軌與全域 progressPct 欄位
- [x] 前端 UI 清楚分列全域進度與台股單軌天數
- [x] 回補主循環具備尾盤冷卻重試與自動補漏閉環
- [x] 撰寫單元測試覆蓋進度分軌與尾盤重試
