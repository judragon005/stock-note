# Spec 0184: 台股歷史回補智慧快取略過、指數退避重試、盤中時間守衛與 ETA 預估規格書 (Market Backfill Smart Skip, Retry & ETA Engine)

- **建立日期**: 2026-10-16
- **作者**: Antigravity Core Team
- **關聯技術債**: [Debt 0019](../debts/0019-local-historical-indicators-and-external-backfill-engine.md), [Debt 0043](../debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md)
- **優先級**: `P0 (Urgent & Production Stability)`
- **狀態**: `PROPOSED`

---

## 1. 背景與問題陳述 (Problem Statement & Context)

在使用者啟動 `npm run dev` 並執行台股全市場 250 天歷史回補引擎 (`backfill-full-market-history.cjs` / `backfill-tw-history-web.cjs`) 時，透過即時終端機日誌與第一性原理追蹤，確認系統存在以下 5 大關鍵架構缺陷：

1. **盤中時間誤判為休市日 (Intraday False Holiday Bug)**：
   在上午 10:00 啟動時，程式將「今天 (2026-10-16)」納為第 1 個回補候選日。由於台股官方盤後資料於 15:30 ~ 16:00 始結算產出，盤中查詢 TWSE/TPEx 必然回傳查無資料，程式將其直接判定為 `[休市日] 略過`，造成天數配額浪費且語意嚴重誤導。
2. **缺乏本地資料庫命中跳過機制 (Lack of Smart Cache Skip)**：
   每次回補 250 天，無論本地 SQLite 資料庫是否已完整存有昨日、前日等歷史數據，腳本一律對官方 API 發起 1,000 次 HTTP 請求（250天 × 4支 API）並加上 3 秒防爬蟲冷卻，導致每次執行均耗時長達 45~50 分鐘，違反 KISS 原則與運算經濟性。
3. **回補模組缺乏重試機制致單邊資料撕裂 (No Retry & Partial Ingestion)**：
   日常同步模組 (`sync-tw-market.cjs`) 具備重試機制，但回補腳本 (`backfill-tw-history-web.cjs`) 卻使用裸請求 `defaultFetchJson`。在 2026-08-27 時因櫃買中心發生單次 `HTTP 請求逾時 (20000ms)`，程式直接跳過 TPEx 1430，該次僅解析出 1,365 檔（上市側），卻依然輸出 `✔ 成功`。經 SQLite 唯讀實測，08-27 既有上櫃普通股列因 UPSERT 不刪除而保留（4 碼普通股 1,961 檔、籌碼 2,256 筆），本次未造成既有資料遺失；但若該日原本無資料，即會形成「上市有、上櫃無」的偽成功入庫。
4. **候選日期產生器與休市日曆脫鉤 (Holiday Calendar Disconnect)**：
   `generateTradeDateCandidates` 僅過濾週六與週日，未載入本地法定休市日曆（如國慶連假 10-09、中秋補假 09-28 等），盲目向官方發起無效請求。
5. **缺乏 ETA 預估與 Vite Proxy 報錯紅字干擾 (No ETA & Noise Pollution)**：
   使用者面對 250 天進度條無法得知預計完成時間；同時前端瀏覽器查詢 Yahoo Finance 圖表若偶發連線重置 (`ECONNRESET`)，Vite Proxy 噴出大量紅色 Stack Trace 造成使用者恐慌。

---

## 2. 四方角色深層檢討與對齊規範 (Multi-stakeholder Alignment)

| 維度角色 | 現況檢討與痛點 | 專業對齊標準與規範 |
| :--- | :--- | :--- |
| **交易所 (TWSE / TPEx)** | 系統在盤中（10:00）反覆請求尚未產出的當日日報，並在已知國定假日發起無效請求，增加官方防爬蟲風控風險。 | **防爬蟲與時間禮儀**：盤後日報僅在 15:30 後請求；國定假日依本地日曆預先過濾，絕不高頻濫發無效請求。 |
| **湖倉核心架構 (Lakehouse Core)** | 單次網路逾時即導致「上市有數據、上櫃全空」的單邊撕裂，嚴重破壞歷史日 K 數列的完整性與 SSOT 原則。 | **原子完整性門檻 (Atomic Integrity Gate)**：全市場日 K 必須上市與上櫃雙軌齊全；若單軌失敗必須觸發指數退避重試，重試 3 次皆敗則標記待補，嚴禁偽成功入庫。 |
| **軟體工程原則 (Software Engineering)** | 每次回補 250 天都強制重新下載，無視本機已有資料，耗費 50 分鐘無效 I/O；違反 DRY 與 KISS 原則。 | **快取命中即跳過 (Smart Skip)**：先查本機 SQLite，已在庫之完整交易日 1ms 略過，將日常補漏耗時從 50 分鐘壓縮至 5 秒內。 |
| **終端使用者體驗 (User UX)** | 終端機日誌只顯示百分比，不知道還要等多久；偶發性紅字讓使用者誤以為任務崩潰中斷。 | **透明感知與視覺降噪**：即時輸出精確剩餘時間 (ETA) 與預計完成時刻；外部非關鍵網路斷線安靜降級處理。 |

---

## 3. 架構不變性原則 (Architectural Invariants)

1. **Intraday Market Settlement Invariant (盤中時間定錨不變性)**：
   - 本地時間若在當日 15:30 前啟動回補，歷史候選交易日的第 1 天一律自動定錨為前一已結算交易日 (T-1)。
   - 嚴禁在 15:30 前對當日盤後端點發起全量請求並標註為休市日。
2. **Smart Cache Hit Invariant (快取命中秒級跳過不變性)**：
   - 每一候選日在連網前，必須先以 SQL 檢查該日「4 碼普通股筆數」與「籌碼筆數」。兩者皆達門檻（普通股 ≥ 1,800、籌碼 ≥ 2,000）才跳過網路請求，並在日誌明確標記 `⚡ 快取命中已入庫 (略過)`。
   - 嚴禁以 `daily_candles` 當日總筆數作為門檻：該表同日混存美股代碼，且 TPEx 1430 含每日 4,000~5,600 檔權證，總數每日浮動 6,300~8,500，不具判別力。
3. **Network Retry & Anti-Split Invariant (指數退避重試與防單邊撕裂不變性)**：
   - 官方請求統一封裝具備指數退避的 `retryFetch`（重試 3 次，基底間隔 2,000ms）。
   - 若遇到平日交易日「上市成功、上櫃為 0」之單邊遺失狀況，強制視為失敗並觸發重試，嚴禁寫入半殘數據。
4. **ETA & Observability Invariant (時間可觀測性不變性)**：
   - 後端全域狀態 `backfillGlobalStatus` 必須暴露 `estimatedRemainingMs` 與 `etaFormatted`。
   - 終端機與前端 UI 必須同步顯示「剩餘約 X 分鐘 (預計 HH:mm 完成)」。

---

## 4. 詳細功能與技術規格 (Technical Specifications)

### 模組 1：候選日期生成器時間門檻與休市日曆載入
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs`
- **邏輯實現**（重用既有 `trading-calendar-engine.cjs`，不新寫日曆邏輯）：
  1. 重構 `generateTradeDateCandidates(daysCount, endDateStr)`：
     * 起始日：若今日 `isTwTradingDay(today)` 且本地時間 ≥ 15:30，起始日為今日；否則為 `getPreviousTradingDay(today)`。
     * 迴圈僅收錄 `isTwTradingDay()` 為真之日期，直到湊滿 `daysCount` 個實質交易日。
     * 不重用 `market-freshness-service.cjs` 的 `getMarketAnchorDate`：其截止時間為 15:00，且週一規則未考慮連假，與本需求不符。
  2. 語意修正：日曆為「休市」唯一權威。日曆判定為交易日但官方回傳空資料者，標記為 `官方無資料（異常）` 並列入 `failedDates`，不再印出 `[休市日]`（颱風停市屬此類，可接受）。

### 模組 2：SQLite 本地既有資料智慧略過 (Smart Cache Skip)
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs`
- **函數**：`fetchAndIngestTwDailyData(dateStr, options)`
- **邏輯實現**：
  1. 在發起任何網路請求前，先透過 SQLite Lakehouse 執行：
     ```sql
     SELECT COUNT(*) AS stockCount FROM daily_candles
      WHERE date = ? AND symbol GLOB '[1-9][0-9][0-9][0-9]';
     SELECT COUNT(*) AS chipCount FROM tw_institutional_chips WHERE date = ?;
     ```
  2. 若 `stockCount >= 1800 && chipCount >= 2000` 且未指定 `force: true`：
     * 直接回傳：
       ```javascript
       return {
         date: dateStr,
         isTradingDay: true,
         quotesCount: quoteCount,
         chipsCount: chipCount,
         cached: true,
       };
       ```
     * 終端機輸出：`✔ 快取命中已在庫 (行情: ${quoteCount} 檔, 籌碼: ${chipCount} 檔) ⚡ 略過`，不觸發 3,000ms 冷卻延遲，瞬間進行下一日。

### 模組 3：網路請求指數退避重試與完整性門檻
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs`
- **邏輯實現**：
  1. 引入/實作 `retryFetch(url, options, retries = 3, delayMs = 2000)`：
     * 遇到 `ECONNRESET`、`ETIMEDOUT` 或 `HTTP 請求逾時` 時，等待 `delayMs * (重試次數)` 後重試，最多重試 3 次。
  2. 完整性門檻校驗：
     * 若 `twseQuotesCount > 0 && tpexQuotesCount === 0`（或反之），判定為單邊缺失，不視為成功交易日，該日列入 `failedDates`，回補結束時彙整列出。
     * 僅對暫態錯誤（逾時、`ECONNRESET`、HTTP 5xx）重試；HTTP 4xx 與官方「查無資料」不重試。
     * 重試函數由 `sync-tw-market.cjs` 既有之 `retryFetch` 移至 `market-sync-core.cjs` 共用，不另寫新版。

### 模組 4：預計結束時間 (ETA) 引擎與終端機/UI 同步
- **檔案**：
  - `scripts/market-sync/backfill-full-market-history.cjs`
  - `scripts/market-sync/backfill-tw-history-web.cjs`
  - `src/components/MarketScheduleHubSection.tsx`
- **計算邏輯**：
  * 已耗時：$\Delta T = \text{Date.now()} - \text{startedAt}$
  * 平均天耗時：$T_{\text{avg}} = \frac{\Delta T}{\text{completedDays}}$
  * 預計剩餘時間：$\text{remainingMs} = (\text{totalDays} - \text{completedDays}) \times T_{\text{avg}}$
  * 預計結束時間：$\text{etaTime} = \text{new Date}(\text{Date.now()} + \text{remainingMs})$
  * 格式化為字串：如 `剩餘約 12 分鐘 (預計 10:45 完成)`。
- **終端機輸出**：
  * `[進度 20.0% | 50/250 | 剩餘約 8 分鐘 (預計 10:42 完成)] 處理日期: 2026-08-15 ...`
- **前端 UI**：
  * 在進度條右側同步渲染 ETA 標籤。

### 模組 5：櫃買中心 (TPEx) 權證排除與兩市標準對齊
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs`、`scripts/market-sync/market-sync-core.cjs`
- **邏輯實現**：
  * 在解析 TPEx 1430 上櫃收盤行情總表時，過濾排除 6 碼數字且 7 開頭之認購/認售權證標的（如 `/^7[0-9]{5}$/`）。
  * 使櫃買端與證交所端（`ALLBUT0999`）過濾標準完全對齊，單日入庫檔數由 ~8,000 檔精簡收斂至 ~2,400 檔核心標的（股票、ETF、可轉債），大幅削減 70% 無效磁碟 I/O 與資料庫膨脹。

### 模組 6：修復 2026-08-27 櫃買缺失與 Vite Proxy 報錯降噪
- **檔案**：`vite.config.ts`
- **修改點**：
  * 在 proxy 的 `configure` 加入 `proxy.on('error', (err, req, res) => ...)`，攔截 `ECONNRESET`，避免拋出大串紅色 Error Trace。
  * 藉由模組 2 與模組 3，針對 2026-08-27 自動重新補齊 TPEx 上櫃行情。

---

## 5. 測試策略 (Test Seams & Verification)

- **Unit Test (Seam 1)**：
  - `src/engine/backfillTwHistoryWeb.test.ts`：
    - 驗證 `generateTradeDateCandidates` 在上午 10:00 執行時，第 1 個候選日不包含今天，且正確排除法定休市日。
    - 驗證 `fetchAndIngestTwDailyData` 在 DB 既有 4 碼普通股 >= 1800 且籌碼 >= 2000 時，回傳 `cached: true` 且不發起外部 HTTP 請求；任一不足時必須連網。
    - 驗證日曆判定為交易日但官方回傳空資料時，該日列入 `failedDates` 而非標記休市。
    - 驗證 `fetcher` 拋出逾時錯誤時，`retryFetch` 能正確進行 3 次重試。
    - 驗證 TPEx 1430 解析時正確排除 6 碼 7 開頭之權證標的。
- **Integration Test (Seam 2)**：
  - `src/engine/backfillFullMarketHistory.test.ts`：
    - 驗證 `backfillGlobalStatus` 包含 `estimatedRemainingMs` 與 `etaFormatted` 欄位。
    - 驗證啟動回補後，已在庫日期能於 100ms 內極速完成跳過。
- **Build & Lint (Seam 3)**：
  - 確保 `npm test` 100% 通過，`npm run build` TypeScript 0 錯誤。

---

## 6. 已確認架構決策 (Confirmed Architecture Decisions)

1. **排除櫃買中心 (TPEx) 權證**：確認排除 6 碼 7 開頭之櫃買權證，兩市場全量對齊「不收權證」之原則，保持湖倉純淨。
2. **不新增中途停止按鈕**：依 KISS 原則拒絕過度工程化，回補任務具備極速秒跳特性，無中斷防禦之複雜狀態維護負擔。

