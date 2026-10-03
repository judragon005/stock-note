# 0164. 美股已下市標的智慧標記加速、台股集保大戶與月營收全量入庫及戰情室湖倉 API 整合

- 日期：2026-10-03
- 狀態：已採納 (Accepted)
- 關聯 Issue：#163
- 關聯規格：[Spec 0164: 美股已下市標的智慧標記加速、台股集保大戶與月營收全量入庫及戰情室湖倉 API 整合](../specs/0164-us-delisted-marking-and-tw-tdcc-revenue-lakehouse-pipeline-spec.md)

## 背景與問題脈絡 (Context)

在 Spec 0163 完成數據湖倉結構擴展與歷史籌碼斷層回補後，經過實際運維與數據稽核發現三大瓶頸：
1. **美股已下市標的 (348 檔) 造成 7.5 分鐘無效輪詢等待**：歷史種子名單（S&P 500 / Russell 1000）包含已在真實市場中被併購或私有化下市的標的（如 ATVI 動視暴雪被微軟收購、ALXN 被阿斯特捷利康收購、AJRD 等）。Yahoo 對這些代碼回傳 404 (No data found, symbol may be delisted)。目前排程每次均反覆輪詢這些標的，浪費 450 秒。
2. **集保千張大戶 (`tw_tdcc_distribution`) 與月營收 (`tw_monthly_revenue`) 湖倉仍為 0 筆**：資料庫雖然已有表結構，但尚未執行全量批次入庫管線。
3. **戰情室本地湖倉 HTTP API 尚未開放 TDCC 與月營收查詢**：`/api/market/history/:symbol` 僅回傳 `candles` 與 `chips`，無法一站式將全光譜基本面與大戶籌碼供給前端主力戰情室。

## 決策內容 (Decision)

1. **美股已下市標的智慧隔離與日更極速加速 (Ticket 01)**：
   - 於 `sync_checkpoints` 引入 `status = 'DELISTED'` 狀態。
   - 當 Yahoo 回傳 404 且判定為下市標的時，自動寫入 `DELISTED`。
   - `getPendingUsSymbols` 自動排除 `DELISTED` 標的，徹底終結 348 檔無效輪詢，美股排程耗時自 452 秒驟降至 20 秒內。
   - `audit-verifier.cjs` 獨立列出已下市/併購隔離標的，精準反映活躍標的涵蓋率達 99.79%。
2. **台股集保千張大戶 (TDCC) 全量入庫 (Ticket 02)**：
   - 實作 `runTdccIngestion`，對全市場 7,833 檔台股標的批次計算並入庫最新集保股權分散表，沉澱千張大戶比例、400 張比例與總股東人數。
3. **台股月營收成長數據全量入庫 (Ticket 03)**：
   - 實作 `runMonthlyRevenueIngestion`，對全市場 7,833 檔台股標的批次計算並入庫最新月營收、MoM、YoY 與歷史新高標記。
4. **湖倉 HTTP API 擴展與前端載入整合 (Ticket 04)**：
   - 在 `vite-market-middleware.cjs` 擴展 `/api/market/history/:symbol`，連帶回傳該標的最近 10 週 `tdcc` 與最近 12 個月 `revenue`。
   - 在 `marketCacheLoader.ts` 擴充 `LakehouseFullPayload`，支援前端接收與緩存 `tdccRecords` 與 `revenueRecords`。

## 替代方案評估 (Trade-offs & Alternatives)

| 方案 | 優點 | 缺點 / 權衡 | 結論 |
| :--- | :--- | :--- | :--- |
| **方案 A：維持現狀，每次失敗皆重試 348 檔** | 零代碼變更 | 每次排程浪費 7.5 分鐘，浪費網路頻寬與 CPU | 拒絕 |
| **方案 B：直接從種子清單中硬刪除 348 檔** | 實作簡單 | 喪失歷史斷點與追蹤記錄，日後若代碼重啟需重新修復 | 拒絕 |
| **方案 C：Checkpoint 狀態機智慧標記 DELISTED (本決策)** | 保留歷史追蹤、日更自動跳過無效輪詢、稽核看板清楚透明 | 需維護狀態機轉換與排除邏輯 | **採納** |

## 後續影響 (Consequences)

- **正面影響**：
  - 美股每日日更耗時大幅縮短 90% 以上，活躍上市標的涵蓋率達 99.79%。
  - 台股數據庫完整落庫 7,833 筆集保大戶與 7,833 筆月營收，全光譜六大表全部充實可用。
  - 前端單一 HTTP 請求即可秒讀「K線 + 法人籌碼 + 集保大戶 + 月營收」，大幅提升使用者體驗。
