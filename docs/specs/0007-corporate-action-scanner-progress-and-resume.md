# 產品需求規格說明書 (PRD): V1.5 智慧掃描公司行動進度可視化、並行頻控與斷點接續架構

- **編號**: 0007
- **對應 Issue**: 待建立
- **狀態**: Draft / Approved
- **日期**: 2026-08-21

---

## 1. Problem Statement (問題陳述)

當使用者匯入大量歷史交易紀錄，或持股組合包含較多標的（例如 10~30 檔以上個股或 ETF）時，現有「智慧掃描公司行動」功能面臨以下嚴重的使用者體驗與技術瓶頸：
1. **進度黑盒子與當機疑慮**：掃描過程中僅顯示全域 Loading 旋轉動畫，無任何進度百分比、已完成檔數或當前正在查詢的個股資訊，使用者無法判斷系統是正在連線比對還是發生當機/卡死。
2. **單線循序查詢效率低**：目前採用單檔股票循序發送多個 API 與代理請求，總掃描時間隨持股數量線性增加（長達 15~40 秒）。
3. **無中斷控制與斷點接續能力**：使用者若中途關閉彈窗或點擊取消，無法保留已查詢完畢的資料，且下次開啟必須全部重新由第 1 檔開始掃描，浪費使用者時間與 API 配額。
4. **缺乏快取機制**：在同一次作業階段 (Session) 內重複開啟彈窗，系統會重複發送相同的網路請求。

---

## 2. Solution (解決方案)

全面重構智慧掃描引擎與彈窗元件，建立**「透明進度可視化 + 受控並發頻控 + 可中止與斷點接續 + Session 級記憶體快取」**架構：

1. **即時動態進度條與個股狀態反饋**：
   - 彈窗頂部提供現代發光進度條，即時展示完成百分比與進度計數（如 `已完成 7 / 15 檔 (47%)`）。
   - 即時狀態列動態顯示當前正在比對的股票名稱與代碼（如 `🔍 正在比對：2330 台積電...`）以及累計發現事件數（如 `已找到 3 筆公司行動`）。
2. **受控並發池與 API 頻率防護 (Rate-Limited Concurrency Pool)**：
   - 將循序查詢升級為 **3 檔並行 (Concurrency = 3)**，並在批次請求間加入輕量微延遲 (100ms jitter)，大幅縮短總掃描時間至數秒內，同時避免觸發 TWSE OpenAPI 與 CORS 代理之 Rate Limit。
   - 深度整合 `AbortController` / `AbortSignal`，當使用者取消或關閉彈窗時立即終止 pending 請求，釋放網路資源。
3. **斷點記錄與接續掃描 (Resume / Retry Mechanism)**：
   - 精確追蹤每檔個股掃描狀態（`DONE`、`PENDING`、`FAILED`）。
   - 掃描中止或部分失敗時，保留已完成比對之事件清單供使用者即時勾選套用，並於頂部提供「接續掃描剩餘 (X 檔)」按鈕，點擊後僅針對未完成個股接續執行。
4. **Session 級個股記憶體快取 (Session In-Memory Cache)**：
   - 已成功比對之個股資料自動寫入 Session 快取；同一次操作期間重新開啟直接秒開並呈現結果。
   - 提供「強制完整重新整理」按鈕以供使用者手動清空快取重新全量比對。

---

## 3. User Stories (使用者故事)

- **US-51 (掃描進度即時可視化)**：作為持有多檔股票的投資人，當我開啟智慧掃描時，我能看到動態進度條與「正在比對：2330 台積電 (3/15)」的即時文字動態，清楚掌握當前進度與剩餘進度。
- **US-52 (並行加速與頻率安全)**：作為使用者，我在掃描多達 20 檔股票時，系統以受控並行方式於 5~10 秒內快速完成比對，且不會發生 API 請求被封鎖或崩潰。
- **US-53 (隨時中止與結果保留)**：作為使用者，當我中途點擊「取消掃描」時，系統立即中止後續請求，並完整保留當前已掃描出來的除權息/減資事件清單，我依然可以勾選並套用這些已取得的資料。
- **US-54 (斷點接續與失敗重試)**：作為使用者，若掃描中途停止或部分個股因網路逾時失敗，介面會清楚提示「已暫停（完成 8/15 檔）」，並顯示「接續掃描剩餘 (7 檔)」按鈕，點擊後直接從未完成的股票繼續掃描。
- **US-55 (Session 短期快取與強制重掃)**：作為使用者，若我剛完成掃描並關閉彈窗，在同一頁面未重新載入前再次打開彈窗時，系統直接從快取載入上次比對結果；若我有疑慮可點擊「重新整理」按鈕進行全量重新掃描。

---

## 4. Implementation Decisions (實作架構決策)

### 4.1 掃描引擎層架構 (`src/engine/corporateActionScanner.ts`)

1. **擴充 `scanCorporateActions` 參數介面**：
   ```typescript
   export interface ScanProgress {
     current: number;
     total: number;
     currentSymbol?: string;
     currentName?: string;
     foundEventsCount: number;
     status: 'scanning' | 'paused' | 'completed' | 'error';
   }

   export interface ScanCorporateActionsOptions {
     concurrency?: number; // 預設 3
     signal?: AbortSignal;
     onProgress?: (progress: ScanProgress) => void;
     symbolsToScan?: string[]; // 支援指定特定代碼（供接續掃描使用）
     forceRefresh?: boolean; // 是否忽略快取
   }
   ```

2. **Session 級快取模組**：
   - 建立 `CorporateActionSessionCache`，以 `symbol` 為鍵值儲存已拉取的 `RawCorporateEvent[]` 與掃描時間戳記。
   - 提供 `get(symbol)`、`set(symbol, events)`、`clear()` API。

3. **受控並發執行器 (Worker Pool Pattern)**：
   - 透過 Promise Pool 分配任務佇列，每個 Worker 取出下一個待掃描 Symbol，呼叫 `fetcher(symbol, meta.market)`。
   - 每完成一檔個股即觸發 `onProgress` 回呼，通知 UI 更新進度與計數。

### 4.2 彈窗介面層 (`src/components/CorporateActionScannerModal.tsx`)

1. **進度條與狀態徽章 (Progress Bar Component)**：
   - 採用帶有平滑 CSS transition 與柔和漸變發光的進度條 (`background: linear-gradient(90deg, #6366f1, #a855f7)`)。
   - 顯示狀態列：`狀態動態`、`個股進度 (X / Y)`、`百分比 (%)`。
2. **操作控制列 (Control Actions)**：
   - 掃描進行中：顯示 `[中止掃描]` 按鈕。
   - 中止/部分完成：顯示 `[接續掃描剩餘 (X 檔)]` 與 `[強制全量重掃]` 按鈕。
   - 掃描完成：顯示標準 `[重新整理]` 按鈕。

---

## 5. Acceptance Criteria (驗收標準)

1. **AC-1 (進度回饋)**：
   - 掃描啟動後，進度條能從 0% 流暢推進至 100%，並即時顯示當前股票代碼與已完成檔數。
2. **AC-2 (並發與防限流)**：
   - 掃描過程以 3 檔並行執行，測試環境下多檔股票掃描耗時大幅低於純循序執行。
3. **AC-3 (中斷功能)**：
   - 點擊「中止掃描」後，未完成的 fetch 請求被 AbortSignal 中止，UI 立即停止進度推進，且已掃描到的公司行動事件完整呈現在列表中。
4. **AC-4 (斷點接續)**：
   - 在中止狀態下點擊「接續掃描剩餘」，系統僅發送剩餘未完成個股之請求，並將新發現的事件無縫追加至現有清單中。
5. **AC-5 (快取與重整)**：
   - 第二次開啟彈窗時直接命中 Session 快取秒開；點擊「強制重掃」可清除快取並重新發送請求。
6. **AC-6 (單元測試覆蓋)**：
   - `src/engine/corporateActionScanner.test.ts` 新增並行、進度回呼、中止中斷、斷點接續與快取機制之測試，100% 通過。
   - 前端 build 無 TypeScript 或 Lint 錯誤。

---

## 6. Non-Goals / Out of Scope (非本次範疇)

- 本次不改動既有的 12 種特殊公司行動會計算法邏輯。
- 本次不改動後端/外部 API 端點規格，純為前端與用戶端體驗/效能優化。
