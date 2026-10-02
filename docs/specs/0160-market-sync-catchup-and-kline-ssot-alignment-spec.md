# 規格說明書：0160-market-sync-catchup-and-kline-ssot-alignment-spec

## Problem Statement

當前股票紀錄系統在市場數據同步與圖表呈現上存在兩大核心致命缺陷：

1. **系統離線/未開機導致排程錯過，缺乏開機在線自動追趕回補機制 (Missed Sync & No Catch-up)**：
   - 每日台股盤後（16:00）與美股盤前（08:00）的定時同步仰賴 Windows 工作排程器。
   - 若使用者在排程觸發點電腦處於休眠、關機或離線狀態，Windows 排程器直接錯過且開機後不會自動補跑。
   - 既有同步腳本 (`sync-tw-market.cjs`) 預設僅同步當日單日數據，若中斷數日，中間缺漏的交易日將永久遺失，造成歷史數據庫出現嚴重斷層黑洞。
   - 系統（Vite 開發伺服器與前端 UI）啟動時完全沒有「數據庫健康與陳舊度巡檢 (Startup Staleness Probe)」，使用者開機使用時系統處於陳舊快照狀態卻渾然不知。

2. **湖倉日 K 斷層未刷新，頂部看板與主 K 線圖產生割裂的「拼裝數據」(Kline & Header Out-of-Sync)**：
   - 本機外部歷史 CSV 庫雖已更新至 2026-10-02，但專案內 SQLite 數據湖倉 (`.scratch/market-cache/market_history.db`) 仍停留在 2026-09-15 舊快照。
   - 前端主 K 線圖從湖倉載入資料，導致致茂 (2360) 等台股標的主 K 線圖永遠停在 2026-09-15（最後一根收盤 2,110、成交量 410,783）。
   - 頂部看板透過外部即時報價取得 2026-10-02 最新收盤價（2,190.00），但因為即時報價缺乏完整開高低量，引擎竟私自拿 9/15 的日 K 開高低量（開 2,100、高 2,155、低 2,090、量 410,783）進行填補！
   - 這直接造就了截圖中極其荒謬的畫面：**頂部收盤價是 10/02 的 2,190，但開高低量、成交量與下方主 K 線圖卻全部停留在 9/15！單一真實來源 (SSOT) 徹底破裂。**

---

## Solution

落實「**啟動自適應追趕同步 (Startup Catch-up Engine) + 湖倉即時全量刷新 + 日 K 單一真實來源縫合 (Kline SSOT Alignment)**」：

1. **Vite 中介層啟動巡檢與過期追趕同步 (Startup Catch-up Ingestion)**：
   - 擴充 [`scripts/market-sync/vite-market-middleware.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/vite-market-middleware.cjs)：
     - 在中介層初始化時執行非同步健康檢查，查詢 `daily_candles` 中 TW/US 的 `MAX(date)`。
     - 比對當前市場「已結算基準交易日」（透過 [`marketSettlementEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marketSettlementEngine.ts) 邏輯）。
     - 若偵測到本地資料庫落後（`maxDate < anchorTradingDate`），背景非同步啟動追趕程序：
       - 自動從本機歷史數據庫 (`D:\APP\諮詢\私人\股市\台股加權指數_歷史數據`) 讀取更新數據增量灌入 SQLite，或呼叫官方 API 依序回補缺漏交易日。
     - 提供 `GET /api/market/sync-status` 端點，回傳目前台美股最新資料日期與同步中狀態。
2. **前端在線與頁面甦醒偵測 (Online & Visibility Recheck)**：
   - 在前端根部（或戰情室）掛載 `window.addEventListener('online')` 與 `document.addEventListener('visibilitychange')`。
   - 當使用者喚醒電腦或切回分頁時，自動向 `/api/market/sync-status` 查詢；若發現伺服器已追趕更新，自動觸發戰情室靜默重新載入最新日 K。
3. **主 K 線圖與頂部看板單一真實來源防斷層縫合 (Kline SSOT Auto-Stitch)**：
   - 修改 [`aiForceDashboardEngine.ts`](file:///d:/APP/股票紀錄/src/engine/aiForceDashboardEngine.ts) 與 [`AiForceDashboardView.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/AiForceDashboardView.tsx)：
     - **防偽造防拼接校驗**：當即時報價缺乏開高低量時，若日 K 最後一根的日期與即時報價日期不符（相差超過 1 個交易日），**嚴禁拿舊日 K 的開高低量與今日收盤價混雜拼湊**；開高低量應誠實標記為 `undefined`，並提示數據更新中。
     - **日 K 自適應縫合**：當市場已結算且即時報價已取得今日收盤行情（含日期 `2026-10-02`），若湖倉歷史日 K 僅到 `2026-10-01` 或更早，引擎自動將該筆真實收盤數據縫合為最後一根日 K 注入 `klineSystem.candles`，使主 K 線圖與頂部看板日期完全一致。
4. **全市場歷史數據湖倉實體全量回補**：
   - 立即執行 `backfill-local-csv.cjs`，將 2,360 檔台股最新全歷史（含 2026-10-02 最新日 K）完整寫入本地 `.scratch/market-cache/market_history.db`，終結 9/15 舊資料。

---

## User Stories

### 終端投資者視角 (End-User Stories)
1. 作為一名投資者，當我開機打開戰情室看盤時，我希望系統能自動偵測我關機期間錯過的盤後資料，並在背景自動完成同步，無需我手動開啟工作排程器或跑腳本。
2. 作為一名技術分析看盤者，我希望當頂部看板顯示最新交易日為 2026-10-02 時，主 K 線圖的最後一根 K 線也精準落在 2026-10-02，且開高低量與收盤價完全吻合，絕不出現日期分裂或假數據拼裝。
3. 作為一名重視系統透明度的使用者，當本機數據庫正在進行背景追趕補檔時，我希望介面有明確且優雅的狀態提示，讓我知道資料正在同步中，並在同步完成後自動無感刷新。

### 系統架構視角 (System Engineering Stories)
4. 作為一名架構設計師，我希望資料庫的陳舊度檢查是冪等且非同步的，啟動時絕不阻礙 Vite Dev Server 與前端頁面首屏的秒開效能。
5. 作為一名維運工程師，我希望系統具備單一真實來源 (SSOT) 護欄，嚴禁將兩個不同日期的數據（2026-10-02 收盤價 + 2026-09-15 開高低量）混裝在同一張卡片中，徹底落實金融數據嚴謹性。

---

## Acceptance Criteria (驗收條件)

```gherkin
Feature: 市場數據自動追趕更新與日 K 單一真實來源對齊

  Scenario: 1. 系統啟動時自動偵測過期並啟動背景追趕
    Given 本地 SQLite 數據湖倉中 daily_candles 最新台股日期為 "2026-09-15"
    And 當前台北時間為 "2026-10-02 16:30:00" (台股已完成當日結算)
    When Vite 伺服器啟動或呼叫 /api/market/sync-status
    Then 系統應識別台股數據已過期 12 個交易日
    And 系統應於背景自動啟動增量追趕同步任務，不阻塞主伺服器響應
    And 同步完成後 daily_candles 最新日期應推進至 "2026-10-02"

  Scenario: 2. 主力戰情室致茂 (2360) 主 K 線圖日期與頂部看板精準對齊
    Given 致茂 (2360) 在 2026-10-02 之收盤價為 2190，開盤 2145，最高 2225，最低 2135
    When 使用者在主力戰情室查詢 "2360"
    Then 頂部 HeaderMarketBar 之最新交易日應為 "2026-10-02"
    And 今日收盤價應為 2190.00，漲跌應為 +110.00 (+5.29%)
    And 開盤應為 2145.00，最高 2225.00，最低 2135.00
    And 主 K 線圖 (KLineChartCard) 的最後一根 K 線日期應為 "2026-10-02"
    And 主 K 線圖最後一根之收盤價應為 2190，不可停留在 2026-09-15

  Scenario: 3. 杜絕跨日期量價拼裝偽造數據
    Given 某標的之外部即時報價僅有最新收盤價 (日期 2026-10-02) 且缺乏開高低量
    And 本地歷史日 K 最後一根日期為 "2026-09-15"
    When 引擎計算 HeaderMarketBar 數據
    Then 引擎嚴禁將 2026-09-15 之開高低量填入今日 (2026-10-02) 之 openPrice/highPrice/lowPrice
    And 引擎應標記開高低量為 undefined 或提示資料同步中，杜絕假數據拼裝
```

---

## Out of Scope (非本次範疇)
- 重構美股所有歷史數據爬蟲邏輯（維持現有 Yahoo Finance 斷點續傳機制）。
- 重寫繪圖圖表渲染底層 Canvas 核心。
