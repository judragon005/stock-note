# 規格文件 0187：歷史回補端到端全生命週期超時、單日看門狗與任務取消重設控制 (Spec 0187)

## 1. 概述與背景 (Context & Problem Statement)

在版本 v8.81.0 (Spec 0168 / Spec 0184) 實裝「台股日期驅動全市場日 K 與籌碼歷史回補」管線後，於 250 天回補的實戰運行中暴露出以下關鍵系統性缺陷：

1. **底層 HTTP 串流靜默掛起 (Silent Socket Hang)**：
   - 目前 `defaultFetchJson` 與 `fetchJson` 採用 Node.js 的 `http.get({ timeout: 20000 })`。
   - 根據 Node.js 原生規範，`req.setTimeout()` 僅能保護到 Socket 連線建立與 Server 回傳第一個 HTTP Header。一旦 Header 抵達（狀態碼 200），若遠端（如 TWSE/TPEx）在傳輸資料封包（`res.on('data')`）過程中遭遇網路斷線或靜默丟包，**連線永遠不會觸發 timeout，Promise 永遠掛死在 pending 狀態**。
   - 導致外層的 `retryFetch` 無法捕獲錯誤進行指數退避重試，整個主迴圈永久凍結在記憶體中。
2. **單日迴圈缺乏看門狗機制 (Lack of Per-Date Watchdog)**：
   - 每日回補包含 4 次連線與 3 次防爬蟲延遲（正常約 12 秒）。在 `for` 迴圈中缺乏針對單一日期處理的整體時間守護。只要單日其中一筆請求卡死，後續所有日期（例如後續 160 天）全部被封鎖，無法推進。
3. **歷史籌碼斷層導致快取未命中 (Historical Chips Deficit)**：
   - 實地檢驗本機 SQLite 資料庫發現，在 `2026-06-10`（第 89 天）之後的歷史日期（`2026-06-09` 之前約 160 天），`daily_candles` 均有 2,296 檔日 K，但 `tw_institutional_chips` 僅有 677 筆（因過去舊版匯入腳本僅收錄部分權值股）。
   - 依據 Spec 0184 的健康快取門檻 `stockCount >= 1800 && chipCount >= 2000`，這導致系統從第 90 天起連續 160 天**完全無法命中快取略過**，每日前進都必須進行 4 次實時網路連線，大幅增加遭遇網路掛起的機率。
4. **缺乏前端任務中止與狀態重設控制 (No Cancellation / Reset API)**：
   - `backfillGlobalStatus.isRunning` 駐留於 Vite 伺服器記憶體中。一旦任務在後端發生內部非同步懸掛，前端介面只能持續呈現「回補中」，使用者無法由 UI 或 API 中斷或重置狀態，必須強制關閉 Vite 進程。

---

## 2. 業務價值與核心原則 (Business Value & Core Principles)

1. **工業級強韌度與無人值守 (Industrial-Grade Resilience & Unattended Execution)**：
   - 回補管線必須保證在任何網路斷線、遠端伺服器掛起或異常封包下，具備「必定超時中斷」與「單日看門狗隔離」能力，絕對不可造成主進程死結。
2. **KISS 原則與極致簡潔 (Keep It Simple, Stupid)**：
   - 不引入外部肥大排程庫（如 Redis/BullMQ），利用 Node.js 22+ 原生 `AbortSignal.timeout` 與 `Promise.race` 手術刀式替換與守護。
3. **可控性與可觀測性 (Controllability & Observability)**：
   - 提供標準的取消與重設 API 端點（`POST /api/market/backfill-cancel` 與 `POST /api/market/backfill-reset`），讓前端排程中心擁有完全控制權。
4. **靈活回補策略 (Flexible Backfill Strategies)**：
   - 支援 `--quotes-only-cache`（行情優先略過）選項；若日 K 已在庫且使用者僅需技術分析時，可秒級略過缺損之籌碼，將耗時由 50 分鐘降至 5 秒。

---

## 3. 系統不變性定理 (System Invariants)

1. **全生命週期超時不變性 (Full Lifecycle Timeout Invariant)**：
   - 任何由 `defaultFetchJson` 發起的網路請求，無論在連線、傳輸 Header 或讀取 Body 階段，均受 `AbortSignal.timeout(20000)` 約束，**單次 HTTP 呼叫在任何情況下最大耗時嚴格 ≤ 20,000ms**，時間到達必定拋出 `TimeoutError`。
2. **單日迴圈有界不變性 (Bounded Date Loop Invariant)**：
   - 單一交易日之資料擷取、重試與入庫（`fetchAndIngestTwDailyData`），無論發生何種網路延遲，均受外層看門狗約束，**單日耗時嚴格 ≤ 45,000ms**。超時自動記入 `failedDates` 並流暢前進至下一日，保證排程絕不死鎖。
3. **任務狀態可重設不變性 (Task Resettable Invariant)**：
   - 調用取消/重設端點後，`backfillGlobalStatus.isRunning` 必須在 100ms 內安全轉為 `false`，中止關聯的非同步排程，並允許使用者立即發起新任務。

---

## 4. 詳細技術規格 (Technical Specifications)

### 模組 1：`defaultFetchJson` 升級為原生 `fetch` 與 `AbortSignal.timeout`
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs` 與 `scripts/market-sync/sync-tw-market.cjs`
- **重構規格**：
  - 捨棄舊有 `http.get` / `https.get` 容易導致串流掛起之實作。
  - 統一採用 Node.js 18+ 原生 `fetch`：
    ```javascript
    async function defaultFetchJson(url, options = {}) {
      const timeoutMs = options.timeoutMs || 20000;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          ...options.headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        throw new Error(`HTTP 重定向 (${response.status}) 至: ${response.headers.get('location')}`);
      }
      if (!response.ok) {
        throw new Error(`HTTP 異常狀態碼: ${response.status}`);
      }

      const text = await response.text();
      if (!text || !text.trim()) {
        return {};
      }
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new Error(`JSON 解析失敗 (${response.status}): ${err.message}`);
      }
    }
    ```

### 模組 2：單日執行看門狗 (Per-Date Watchdog Circuit Breaker)
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs`
- **規格**：
  - 在 `runTwDateDrivenBackfill` 的主迴圈中，以 `withTimeout` 包裹 `fetchAndIngestTwDailyData`，單日上限 45 秒：
    ```javascript
    const DATE_TIMEOUT_MS = 45000;
    const res = await Promise.race([
      fetchAndIngestTwDailyData(dateStr, { ... }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`單日處理逾時超過 ${DATE_TIMEOUT_MS}ms`)), DATE_TIMEOUT_MS)
      ),
    ]);
    ```
  - 當捕獲逾時錯誤時，終端機輸出 `⚠️ 逾時: 單日處理超時 (已推入補漏清單並跳過)`，寫入 `failedDates`，不中斷主迴圈，安全前進到 `i + 1`。

### 模組 3：中介層取消與重設端點 (Cancel & Reset Endpoints)
- **檔案**：`scripts/market-sync/backfill-full-market-history.cjs` 與 `scripts/market-sync/vite-market-middleware.cjs`
- **規格**：
  - `backfill-full-market-history.cjs` 新增 `cancelBackfillTask()` 與 `resetBackfillGlobalStatus()`：
    - 維護當前運行任務之 `activeAbortController = new AbortController()`。
    - 提供 `cancelBackfillTask()` 觸發 `abort()`，並將 `backfillGlobalStatus.isRunning` 設為 `false`，記錄 `error = '任務已被使用者手動取消'`。
  - `vite-market-middleware.cjs` 註冊端點：
    - `POST /api/market/backfill-cancel`：觸發取消當前背景任務。
    - `POST /api/market/backfill-reset`：強制釋放鎖定狀態（重置 `isRunning = false`）。

### 模組 4：前端排程中心 (MarketScheduleHubSection) 狀態防卡死與取消按鈕
- **檔案**：`src/components/MarketScheduleHubSection.tsx`
- **規格**：
  - 當 `backfillStatus?.isRunning === true` 時，若 `updatedAt` 超過 60 秒未更新，介面呈現「⚠️ 回補進度可能遲滯」提示。
  - 在回補控制面板提供「強制停止 / 重置」按鈕，呼叫 `POST /api/market/backfill-cancel`，使使用者無需開啟終端機即可完全自主排除異常。

---

## 5. 驗證標準與測試案例 (Verification & Test Cases)

1. **單元測試 (`backfillFullMarketHistory.test.ts`)**：
   - 驗證 `defaultFetchJson` 在逾時情況下正確拋出 Timeout 錯誤。
   - 驗證單日逾時看門狗被觸發時，程序不崩潰並將日期記錄進 `failedDates`。
   - 驗證呼叫 `POST /api/market/backfill-cancel` 能立即使 `backfillStatus.isRunning` 轉為 `false`。
2. **端到端整合驗證**：
   - 啟動回補任務，透過取消端點進行即時中斷，驗證記憶體鎖定被正確釋放且能重新發起任務。
   - 驗證在 `2026-06-09` 能夠正確進行全生命週期逾時防護或順利擷取入庫。
