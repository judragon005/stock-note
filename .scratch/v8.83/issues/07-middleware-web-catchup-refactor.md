# Ticket 07: Vite 中介層背景聯網自動追趕重構 (Spec 0170)

## 1. 任務核心 (Core Objective)
重構 `scripts/market-sync/vite-market-middleware.cjs` 的 `triggerCatchupTask`，以 `trading-calendar-engine.cjs` 比對最後交易日，過期時在背景自動連網調度 `sync-tw-market.cjs` 抓取最新官方數據，徹底廢止本機硬碟 CSV 調用。

## 2. 目標檔案 (Target Files)
- `scripts/market-sync/vite-market-middleware.cjs`
- `scripts/market-sync/vite-market-middleware.test.cjs`

## 3. 具體重構內容 (Refactoring Details)
1. 移除 `const { runFullMarketHistoryBackfill } = require('./backfill-local-csv.cjs')`。
2. 替換為 `const { runTwMarketSync } = require('./sync-tw-market.cjs')`：
   - 透過 `trading-calendar-engine.cjs` 判斷上一個法定交易日。
   - 若資料庫最新日期落後於法定定錨日，啟動非同步任務調用 `runTwMarketSync()`。
3. 加固別名查詢：
   - 在 GET `/api/market/history/:symbol` 端點中，確保正規代碼與別名查詢均能 100% 命中最新 250 天日 K。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 模擬請求 `/api/market/sync-status?catchup=true` 時，中介層觸發聯網同步，不調用任何本機 CSV 函式。
- [ ] 中介層測試 `vite-market-middleware.test.cjs` 100% 通過。
