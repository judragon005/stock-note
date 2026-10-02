# 規格說明書：0159-ai-force-lakehouse-pipeline-and-ui-defect-repair-spec

## Problem Statement

當前主力戰情室 (AI Force Dashboard) 在實際使用過程中，面臨嚴重的數據同步斷鏈、假數據污染以及介面功能虛擬化 (Mock UI) 的核心問題：

1. **昨日 16:00 同步後輸入台股（如 2886 兆豐金）仍顯示「日 K 線短缺」**：
   - 每日 16:00 排程腳本 (`sync-tw-market.cjs`) 僅抓取了當日單一收盤日數據 (`tw_market_summary.json`)，未將收盤 K 線與三大法人籌碼持久化寫入本地 SQLite 數據湖倉 (`daily_candles`, `tw_institutional_chips`)。
   - 本地 SQLite 實體資料庫 (`market_history.db`) 內台股日 K 筆數目前為 **0 筆**，且靜態歷史快取 (`tw_market_ohlcv_compact.json`) 停滯於 2026-09-15 且體積高達 17.5 MB，瀏覽器拉取極易逾時。
2. **前後端 API 嚴重脫節，前端未接入本地湖倉中介層**：
   - 後端明明已實作 Vite 原生 Connect API `/api/market/history/:symbol`，且 `marketCacheLoader.ts` 內已封裝 `loadSymbolHistoryFromLakehouse`，但主力戰情室主資料流 [`AiForceDashboardView.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/AiForceDashboardView.tsx) 與 [`historicalOhlcvBackfill.ts`](file:///d:/APP/股票紀錄/src/engine/historicalOhlcvBackfill.ts) 完全未呼叫該 API，依舊強依賴極易失敗的外部 Yahoo Finance 代理。
3. **退避機制 (Fallback) 充滿矛盾的硬編碼假數據污染**：
   - 當台股未能抓到歷史日 K 時，系統退回 `createDefaultAiForceReport`。該函數硬編碼寫死了「開盤 47.97、最高 49.18、最低 47.72、成交量 1,200 張、單數 3,100、資料筆數 30 日」，但蠟燭陣列卻為 `[]`（空陣列）。
   - 這導致頂部面板大言不慚地顯示「資料筆數 30 日」，下方主 K 線圖卻觸發防偽造攔截機制顯示「尚無歷史交易日 K 數列」，造成使用者極大的混淆與信任危機。
4. **介面存在虛假功能按鈕與無響應元件**：
   - 匯出列中的「下載全部圖表 PNG」僅觸發 `showToast('已將全量 SVG 圖表打包快照至下載佇列')`，背後完全沒有任何實體 SVG 抓取、轉換或下載代碼，為純假功能。
   - 主 K 線圖右上角的選項按鈕 (`<MoreVertical />`) 未綁定任何 `onClick` 事件，點擊毫無響應。

---

## Solution

落實「**真數據貫通 (Real Data SSOT) + 本地湖倉秒讀 (Lakehouse-First) + 誠實狀態退避 (Honest Empty State) + 缺陷功能閉環實裝**」：

1. **台股同步寫入 SQLite 閉環 (Lakehouse Ingestion)**：
   - 在每日 16:00 定時排程 [`scripts/market-sync/sync-tw-market.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/sync-tw-market.cjs) 中，正式串接 `saveTwQuotesToSqlite`，將 TWSE/TPEx 收盤日 K 與三大法人買賣超同時持久化至 `.scratch/market-cache/market_history.db`。
   - 擴充 [`scripts/market-sync/backfill-local-csv.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/backfill-local-csv.cjs)，將本機歷史 CSV 中全市場台股過去 120~250 根日 K 線一次性批次灌入 SQLite `daily_candles` 與 `tw_institutional_chips`。
2. **戰情室前端優先直連本地 Vite SQLite API (Lakehouse-First Loading)**：
   - 在 [`historicalOhlcvBackfill.ts`](file:///d:/APP/股票紀錄/src/engine/historicalOhlcvBackfill.ts) 與 [`AiForceDashboardView.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/AiForceDashboardView.tsx) 中建立最高優先級管道：優先向 `/api/market/history/:symbol?limit=250` 請求真實歷史 K 線與籌碼，達到 0 延遲、100% 離線可用。
   - 成功獲取後非同步沉澱至瀏覽器 IndexedDB，徹底擺脫對 17.5 MB 巨大 JSON 與外部 Yahoo Finance 的脆弱依賴。
3. **根除 `createDefaultAiForceReport` 假數據，落實誠實 Empty State**：
   - 全面清理 `createDefaultAiForceReport` 內的寫死量價與固定「30 日」字串。
   - 若查無歷史日 K，`dataPointsCount` 誠實回傳 `0`，量價指標顯示 `-` 或僅呈現即時報價，頂部說明文字標註「無歷史日 K 資料」，與主 K 線圖之 Empty State 完全協同一致。
4. **實裝與修補 UI 缺陷**：
   - **實裝「下載全部圖表 PNG」**：透過遍歷儀表板內所有 SVG 圖表節點，以 Canvas 序列化合成為 ZIP 壓縮包或多圖連續下載，淘汰純 Toast Mock。
   - **修補主 K 線圖右上角按鈕**：綁定週期快速切換選單或指標重設選單，杜絕無效按鈕。

---

## User Stories

### 終端投資者視角 (End-User Stories)
1. 作為一名台股投資者，我希望在主力戰情室輸入任意台股代碼（如 2886 兆豐金、2330 台積電）時，系統能瞬間從本機 SQLite 湖倉載入真實歷史日 K 線，以便我能在 0.1 秒內看見完整的均線排列與籌碼分析，不再看到「日 K 線短缺」的報錯。
2. 作為一名重視數據真實性的使用者，我希望當某檔股票真的沒有歷史數據時，頂部面板誠實顯示「資料筆數 0 日」，而不是虛報「30 日」同時下方顯示「無資料」，以便我能對系統的嚴謹度保持信任。
3. 作為一名需要保存研究報告的分析者，我希望點擊「下載全部圖表 PNG」時，瀏覽器能真正下載出圖表圖檔，而不是只彈出一個「已打包」的無效提示。

### 系統架構與維運視角 (System Engineering Stories)
4. 作為一名系統維運者，我希望每日 16:00 的台股定時排程在抓取官方 MI_INDEX 與 T86 後，自動將資料寫入 SQLite 實體庫，以便歷史數列隨著每日收盤自動推進，永不斷鏈。
5. 作為一名架構設計師，我希望前端所有歷史 K 線請求均由 Vite 原生中介層 `/api/market/history/:symbol` 統一承接，以便淘汰體積高達 17.5 MB 的 `tw_market_ohlcv_compact.json`，減輕記憶體與頻寬負擔。

---

## Implementation Decisions

### 1. 本地數據湖倉寫入 (SQLite Persistence)
- 修改 `scripts/market-sync/sync-tw-market.cjs`：
  - 於 `[4/4] 持久化寫入本地快取資料庫...` 區塊，引入 `saveTwQuotesToSqlite`，將 `allQuotes` 事務寫入 `daily_candles`。
  - 將 `allChips` 寫入 `tw_institutional_chips`。
- 修改 `scripts/market-sync/backfill-local-csv.cjs`：
  - 增加 SQLite 寫入管道，將個股歷史 CSV 解析之 `alignedCandles` 批次寫入 `daily_candles`。

### 2. 前端載入優先序 (Hydration Hierarchy)
- 前端日 K 載入統一調整為四層防禦：
  1. **Layer 1 (SQLite Lakehouse)**：優先請求 `/api/market/history/${symbol}?limit=250`。
  2. **Layer 2 (IndexedDB)**：若處於靜態預覽或 API 不可用，讀取本機已沉澱之 IndexedDB。
  3. **Layer 3 (Yahoo Finance)**：針對未收錄於湖倉之極罕見標的，作為兜底線上抓取。
  4. **Layer 4 (Honest Empty State)**：若均無資料，誠實回傳空陣列，由 UI 呈現統一 Empty State，杜絕任何隨機假數據。

### 3. 淘汰寫死假數據 (Sanitizing Fallback Engine)
- 在 `createDefaultAiForceReport` 中：
  - `dataPointsCount` 在無資料時設定為 `0`。
  - `dataRangeText` 設定為 `尚無歷史交易日資料`。
  - `openPrice`, `highPrice`, `lowPrice`, `volumeShares` 在無即時報價時設定為 `0` 或未定義，由 Header 呈現 `-`。

### 4. 實體圖表下載流水線 (Real Chart Batch Exporter)
- 在 `HeaderExportBar.tsx` 與 `exportReportPipeline.ts` 中：
  - 實作 `triggerAllChartsDownload(symbol)`：抓取頁面所有圖表卡片之 `<svg>` 標籤，透過 `XMLSerializer` 與 HTML5 Canvas 轉換為 PNG Blob，並提供實體下載。

---

## Acceptance Criteria

### 場景 1：台股標的 (2886) 透過本地湖倉瞬間載入真實歷史日 K
- **Given** 使用者開啟主力戰情室，且本地 SQLite 資料庫已收錄 2886 兆豐金歷史日 K。
- **When** 使用者在標的輸入框輸入 `2886` 並點擊「分析」。
- **Then**：
  1. 系統透過 `/api/market/history/2886?limit=250` 於 100ms 內取得真實日 K。
  2. 主 K 線圖正常渲染 60 根（或所選週期）蠟燭棒與 MA5/10/20/60 均線，不出現「尚無歷史交易日 K 數列」之提示。
  3. 頂部 MarketBar 之「資料筆數」誠實對齊實際載入筆數（如「60 日」）。

### 場景 2：查無日 K 之標的呈現誠實且協同的 Empty State
- **Given** 使用者輸入一檔資料庫完全無歷史數據的虛擬標的或代碼。
- **When** 系統完成四層探測且無有效日 K。
- **Then**：
  1. 頂部 MarketBar 之「資料筆數」顯示 `0 日`，各項價格指標顯示 `-`。
  2. 頂部狀態說明顯示「尚無歷史交易日資料」。
  3. 主 K 線圖顯示「尚無歷史交易日 K 數列」，全頁面狀態完全協同一致，無任何 47.97、1,200 張等幽靈數據。

### 場景 3：每日盤後 16:00 自動同步寫入 SQLite
- **Given** 執行台股同步腳本 `node scripts/market-sync/sync-tw-market.cjs`。
- **When** 抓取 TWSE/TPEx 當日盤後數據完成。
- **Then**：
  1. 腳本成功將當日全市場股票日 K 寫入 `.scratch/market-cache/market_history.db` 之 `daily_candles`。
  2. 查詢該資料庫之 `daily_candles`，台股標的（如 2886、2330）包含最新交易日記錄。

### 場景 4：「下載全部圖表 PNG」產出實體圖檔
- **Given** 主力戰情室已完成標的渲染並展示 18 張卡片。
- **When** 使用者點擊工具列上的「下載全部圖表 PNG」按鈕。
- **Then**：
  1. 系統抓取戰情室內核心 SVG 圖表。
  2. 觸發實體檔案下載，使用者能成功接收並儲存圖檔，不再僅是虛擬 Toast 提示。
