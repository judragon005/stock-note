# 規格書 0164：美股已下市標的智慧標記加速、台股集保大戶與月營收全量入庫及戰情室湖倉 API 整合 (Spec 0164)

## Problem Statement

在完成 Spec 0163 的湖倉擴建與歷史斷層回補之後，系統已具備 23.8 萬筆籌碼與 97.3 萬筆日 K 基礎。然而深入運維與前端使用時發現以下關鍵瓶頸：

1. **美股已下市/併購標的 (348 檔) 造成長達 7.5 分鐘的無效等待**：
   - 歷史種子名單（S&P 500 / Russell 1000）包含已在真實市場中被併購或私有化下市的標的（如 ATVI 動視暴雪、ALXN 亞力兄製藥、AJRD、ANSS 等）。
   - Yahoo Finance 對這些代碼回傳 `HTTP 404 (No data found, symbol may be delisted)`。
   - 目前管線每次執行皆會輪詢這 348 檔標的，加上抖動限流，導致美股排程耗時高達 452 秒（7.5 分鐘），白白浪費系統資源與網路請求。
2. **集保千張大戶 (`tw_tdcc_distribution`) 與月營收 (`tw_monthly_revenue`) 湖倉仍為 0 筆**：
   - 雖然資料庫已建妥資料表與索引，但尚未完成首次全量數據入庫，無法在實戰中提供券商法人級的籌碼集中度與營收動能交叉檢驗。
3. **戰情室本地湖倉 HTTP API 尚未開放 TDCC 與月營收查詢**：
   - Vite 中介層 `/api/market/history/:symbol` 目前僅回傳 `candles` 與 `chips`，前端「⚡ 主力戰情室」無法透過單一 API 請求直接取得集保大戶與月營收，限制了前端卡片展現更深度的量化決策。

---

## Solution

建立端到端「美股 Delisted 智慧隔離加速、台股全光譜數據落庫與湖倉 API 整合」解決方案：

1. **美股已下市標的智慧隔離與日更極速加速**：
   - 在 `us-sync-checkpoint-engine.cjs` 與 `sync-us-market.cjs` 中，當 Yahoo 回傳 404 且判定為下市/無數據標的時，自動標記為 `status = 'DELISTED'`。
   - `getPendingUsSymbols` 查詢時自動排除 `DELISTED` 標的，使美股每日排程僅需更新活躍標的（約 1,448 檔），日更時間自 7.5 分鐘驟降至 20 秒內完成。
   - `audit-verifier.cjs` 自動將 `DELISTED` 納入分類統計，計算活躍標的實質涵蓋率（達 99.8%+）。
2. **台股集保千張大戶 (TDCC) 批次入庫管線執行**：
   - 強化 `ingest-tw-tdcc.cjs`，提供全市場上市櫃股票最新集保股權分散表批次拉取與入庫，沉澱千張大戶持股比、400 張大戶持股比與總股東人數至 `tw_tdcc_distribution`。
3. **台股上市櫃月營收成長數據全量入庫管線執行**：
   - 強化 `ingest-tw-monthly-revenue.cjs`，提供全市場上市櫃月營收（含 MoM、YoY、累計 YoY）批次入庫至 `tw_monthly_revenue`。
4. **戰情室湖倉 HTTP API 與前端 Loader 雙向串聯**：
   - 在 `vite-market-middleware.cjs` 擴展 `/api/market/history/:symbol`，連帶查詢並回傳該標的之最近 `tdcc`（集保分佈）與 `revenue`（近 12 個月營收成長）。
   - 前端 `marketCacheLoader.ts` 與 `aiForceDashboardEngine.ts` 擴充資料結構，支援接收並注入全光譜基本面與大戶籌碼。

---

## User Stories

1. **作為系統使用者**，我希望美股日更排程不要在已下市的 348 檔標的上反覆浪費 7 分鐘輪詢，能智慧標記下市並秒級完成活躍標的更新。
2. **作為籌碼分析者**，我希望在查詢台股時能看到集保千張大戶持股比例數據，確認大戶籌碼是持續集中還是分散給散戶。
3. **作為基本面投資人**，我希望資料庫擁有最新月營收與年增率 (YoY)，並能透過本地湖倉高速 API 毫秒級提供查詢。
4. **作為前端開發者**，我希望 `/api/market/history/:symbol` 能一站式提供 K 線、三大法人、集保大戶與月營收，杜絕多次往返請求。

---

## Implementation Decisions

### 1. 美股 Checkpoint 狀態機擴展
- 在 `sync_checkpoints` 中引入狀態 `'DELISTED'`。
- 當抓取錯誤為 `HTTP_404` 或明確標註 `delisted` 時，寫入 `status = 'DELISTED'`, `error_msg = 'HTTP_404_DELISTED'`。
- 待同步清單 `getPendingUsSymbols` 只選取 `status != 'SUCCESS' AND status != 'DELISTED'`，永久跳過無效輪詢。

### 2. TDCC 與月營收非阻塞批次入庫
- 批次以 SQLite Transaction 事務入庫，提供斷點保護與冪等覆蓋 (`INSERT OR REPLACE` / `ON CONFLICT DO UPDATE`)。

### 3. Vite 中介層單一整合端點 (SSOT)
- 端點 `/api/market/history/:symbol` 返回：
  ```json
  {
    "symbol": "2330",
    "candles": [...],
    "chips": [...],
    "tdcc": [...],
    "revenue": [...]
  }
  ```

---

## Acceptance Criteria

- [ ] **AC 1 (美股 Delisted 智慧標記)**：
  - 當遇到 Yahoo 404 下市標的時，Checkpoint 狀態記錄為 `DELISTED`。
  - 待處理隊列排除 `DELISTED` 標的，美股日更跳過無效輪詢，耗時受控。
  - `audit-verifier.cjs` 明確標示下市標的數量與活躍標的涵蓋率。
- [ ] **AC 2 (台股 TDCC 集保大戶入庫)**：
  - `ingest-tw-tdcc.cjs` 執行後，`tw_tdcc_distribution` 表寫入有效股權分散數據。
- [ ] **AC 3 (台股月營收成長數據入庫)**：
  - `ingest-tw-monthly-revenue.cjs` 執行後，`tw_monthly_revenue` 表寫入有效月營收、MoM、YoY。
- [ ] **AC 4 (湖倉 API 擴展與前端載入)**：
  - `/api/market/history/:symbol` 成功回傳包含 `tdcc` 與 `revenue` 的完整資料結構。
  - 單元測試覆蓋率 100%，既有測試與新測試全數綠燈通過。
