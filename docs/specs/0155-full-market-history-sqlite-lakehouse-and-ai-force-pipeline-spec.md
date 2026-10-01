# 規格說明書：0155-full-market-history-sqlite-lakehouse-and-ai-force-pipeline-spec

## Problem Statement

當前主力戰情室 (AI Force Dashboard) 在進行全市場量化掃描與多維度主力診斷時，面臨以下根本性瓶頸：

1. **美股主要市場與台股歷史覆蓋斷鏈**：
   - 系統現有美股盤後快取僅覆蓋 44 檔核心標的 (Tier 1)，其餘數千檔美股（S&P 1500、Russell 1000 成分股及熱門 ETF）完全依賴前端發起 Yahoo Finance 請求。使用者在戰情室切換美股標的時，極易遭遇 HTTP 429 (Too Many Requests) 限流阻斷，導致日 K 線空白、均線失真、主力籌碼分數無法計算。
2. **全市場歷史體積超越瀏覽器記憶體極限**：
   - 台股全市場 (2,400+ 檔) 與美股主要市場 (1,500~2,000 檔) 共約 4,000~4,500 檔標的。若將每檔股票過去 250 天歷史日 K 原始 JSON 全量載入前端，資料量高達 250MB~400MB，會導致瀏覽器 IndexedDB 寫入阻塞或頁籤崩潰 (Out of Memory)。
3. **缺乏官方籌碼深度與機構微觀風控**：
   - 缺乏台灣官方借券賣出 (SBL) 數據，無法精確捕捉外資空頭主力真正的做空動向；缺乏集保股權分散表 (TDCC 千張大戶持股比)，無法透視長線大戶吸籌狀態。
   - 缺乏證券商維度的「處置股票 / 注意股票 / 全額交割」標記，容易誤判流動性枯竭股票為主力吸籌。
4. **缺乏時間換空間的自動化排程與斷點續傳**：
   - 缺乏穩健的背景離線爬蟲與中斷續傳機制，單次網路波動即可導致數小時抓取全部歸零。

---

## Solution

建立一個「**本地輕量 SQLite 數據倉庫 (Local SQLite Lakehouse) + 自動排程同步 (Scheduled Sync) + Vite 原生 API 中介層 + 主力戰情室按需加載 (On-Demand Hydration)**」的端到端資料流水線：

1. **本地 SQLite 數據倉庫 (`market_history.db`)**：
   - 作為全市場歷史數據單一真實來源 (SSOT)，完整儲存全台股 (2,400+ 檔) 與全美股主要市場 (1,500~2,000 檔) 最近 500 個交易日之高低開收量 (OHLCV)、還原收盤價、台股三大法人買賣超、借券賣出餘額、融資券餘額與集保大戶持股比。
2. **「時間換空間」背景排程與自適應限流防禦**：
   - **台股排程 (每日 16:30)**：單次批次整包下載 TWSE/TPEx 官方 `MI_INDEX`、`T86`、`MI_MARGN`、`TWT93U`，秒級全市場入庫。
   - **美股排程 (每日 08:00 台灣時間)**：以優先級隊列 (Tiered Queue) 結合每秒 1 檔自適應限流，於 40~50 分鐘內滾動更新 1,500~2,000 檔美股歷史日 K，具備 `sync_checkpoints` 斷點續傳機制與失敗退避重試。
3. **Vite 原生開發中介層 API (Zero-Port Middleware)**：
   - 在 Vite Dev Server 掛載輕量 Connect Middleware，提供 `/api/market/history/:symbol` 與 `/api/market/symbols`，前端戰情室切換標的時以毫秒級延遲按需拉取，並沉澱至 IndexedDB，零需額外啟動獨立後端服務。
4. **主力戰情室無縫混合定錨與可解釋性 AI (XAI)**：
   - 歷史 250 天日 K 由 SQLite 數倉供應，盤中時段動態由即時報價拼接第 251 根日 K；美股導入量價微觀結構演算法 (VWAP、OBV、MFI) 模擬主力資金流向；戰情室頂部揭露處置股狀態與白話文因果判讀。

---

## User Stories

### 終端投資者視角 (End-User Stories)
1. 作為一名美股波段交易者，我希望在主力戰情室輸入任意 S&P 1500 或熱門 ETF 代碼（如 PLTR、CRWD、SMCI）時，能夠瞬間載入 250 天完整 K 線與主力成本階梯，以便我即使遭遇 Yahoo 429 限流也能不受影響地進行決策。
2. 作為一名台股短線當沖者，我希望在搜尋股票時能夠即時看到該標的是否被列為「處置股票」或「注意股票」，以便我避免買入流動性凍結且無法當沖的標的。
3. 作為一名長線價值投資者，我希望在戰情室能看到週頻率的「集保千張大戶持股比例趨勢」，以便我確認散戶籌碼是否正在往公司派與外資大戶集中。
4. 作為一名初入市場的新手，我希望在查看主力動態時能看到「白話文因果解釋」（例如：外資連賣但主力成本未破），以便我理解量化指標背後的市場意涵。
5. 作為一名經常在無網路環境（如高鐵、飛機）研究股票的使用者，我希望軟體能自動降級為「離線唯讀模式」並流暢載入本地 SQLite 已緩存的歷史數據，以便我隨時進行復盤。
6. 作為一名全市場搜尋者，我希望在輸入代碼或公司簡稱（如「台積」、「NVDA」）時，搜尋框能在 30 毫秒內智慧聯想推薦對應代碼，以便我無需記憶所有冷門股票代碼。

### 證券風控與交割視角 (Brokerage & Compliance Stories)
7. 作為一名證券風控管理員，我希望系統能嚴格區分美股 (T+1, USD, 股) 與台股 (T+2, TWD, 張) 的交割結算週期與交易單位，以便杜絕跨市場數據統計時將股數誤算為張數。
8. 作為一名交割清算人員，我希望系統能在除權息與股票分割時，自動以「還原價格 (Adjusted Close)」重算歷史均線與 VWAP，以便避免股價除權息斷崖造成主力成本線崩塌。

### 法人機構交易視角 (Institutional Trader Stories)
9. 作為一名對沖基金操盤手，我希望在分析台股大型權值股時能同時調閱「借券賣出餘額 (SBL)」，以便我辨識外資真正的放空與對沖避險力道，而非僅依賴散戶融券。
10. 作為一名量化分析師，我希望在美股沒有三大法人買賣超的情況下，系統能利用 VWAP 價量結構、OBV 能量潮與 MFI 資金流向指數產出主力籌碼評分，以便維持戰情室六維雷達指標的連續性。
11. 作為一名基金經理人，我希望系統在流動性不足（20 日均成交額過低）的標的上主動降級「流動性健康度」評分並發出警報，以便我避免受到單筆對敲大單的技術突破假象誤導。

### 系統架構與維運視角 (System Engineering Stories)
12. 作為一名軟體工程師，我希望每日美股同步腳本支援「斷點續傳 (Checkpointing)」，以便在遭遇網路斷線或程式重啟時能從最後中斷處繼續執行，而不必從頭爬取 1,500 檔股票。
13. 作為一名本機使用者，我希望 Vite 開發伺服器原生內嵌 SQLite API 中介層，以便我只要執行 `npm run dev` 即可同時啟動前端介面與數據服務，無需手動啟動其他後端行程。
14. 作為一名硬碟空間敏感的使用者，我希望 SQLite 數據庫能自動將歷史資料滾動維護在最新 500 個交易日並定期執行 VACUUM，以便資料庫容量永久維持在 150MB 以內。

---

## Implementation Decisions

### 1. 本地儲存架構與資料庫 Schema
- **數據倉庫實體**：於專案本地儲存 `.scratch/market-cache/market_history.db`（SQLite 3）。
- **主要資料表設計**：
  - `symbols_meta`：
    - `symbol` (TEXT PRIMARY KEY), `name` (TEXT), `market` (TEXT: 'TW' | 'US'), `exchange` (TEXT), `type` (TEXT: 'STOCK' | 'ETF'), `status` (TEXT: 'NORMAL' | 'ATTENTION' | 'DISPOSITION' | 'FULL_CASH'), `updated_at` (INTEGER)。
  - `daily_candles`：
    - `symbol` (TEXT), `date` (TEXT), `open` (REAL), `high` (REAL), `low` (REAL), `close` (REAL), `adj_close` (REAL), `volume` (REAL), `turnover` (REAL), `PRIMARY KEY (symbol, date)`。
  - `tw_institutional_chips`：
    - `symbol` (TEXT), `date` (TEXT), `foreign_buy` (INTEGER), `foreign_sell` (INTEGER), `trust_buy` (INTEGER), `trust_sell` (INTEGER), `dealer_buy` (INTEGER), `dealer_sell` (INTEGER), `margin_balance` (INTEGER), `short_balance` (INTEGER), `sbl_balance` (INTEGER), `day_trade_rate` (REAL), `PRIMARY KEY (symbol, date)`。
  - `tw_tdcc_distribution`：
    - `symbol` (TEXT), `date` (TEXT), `large_shareholder_ratio` (REAL), `retail_shareholder_ratio` (REAL), `PRIMARY KEY (symbol, date)`。
  - `sync_checkpoints`：
    - `market` (TEXT), `symbol` (TEXT), `last_success_date` (TEXT), `last_attempt_at` (INTEGER), `status` (TEXT: 'SUCCESS' | 'FAILED' | 'PENDING'), `error_msg` (TEXT), `PRIMARY KEY (market, symbol)`。

### 2. 資料收集與限流防禦策略 (Ingestion & Rate-Limit Gate)
- **台股排程 (`scripts/market-sync/sync-tw-market-sqlite.cjs`)**：
  - 觸發時機：每日 16:30 (台灣時間)。
  - 官方整包抓取 TWSE/TPEx 收盤行情 (`MI_INDEX`)、三大法人 (`T86`)、融資券 (`MI_MARGN`)、借券賣出 (`TWT93U`)、注意處置公告。
  - 事務批次寫入 SQLite，單次更新耗時 < 15 秒。
- **美股排程 (`scripts/market-sync/sync-us-market-sqlite.cjs`)**：
  - 觸發時機：每日 08:00 (台灣時間)。
  - 標的池：S&P 1500 + NASDAQ 100 + 主要熱門 ETF，共約 1,800 檔。
  - 優先級隊列：使用者目前持股與自選名單 (Tier 1) 優先秒級更新；其餘標的 (Tier 2) 以 800ms ~ 1200ms 間隔滾動排程，單 IP 遭遇 429 時啟動指數退避 (Exponential Backoff)。
  - 斷點續傳：跳過今日已標記 `SUCCESS` 之標的，僅針對中斷或失敗標的重試。
- **容量滾動收縮**：
  - 寫入時自動清除超過 500 交易日前之舊記錄，每月執行 `PRAGMA incremental_vacuum(1000)`。

### 3. Vite 原生中介層 API 協議 (Connect Middleware)
- 在 `vite.config.ts` 的 `plugins` 中掛載 SQLite Middleware：
  - `GET /api/market/quote/:symbol?market=TW|US`：回傳最新收盤價、漲跌、交易狀態（注意/處置）。
  - `GET /api/market/history/:symbol?market=TW|US&limit=250`：回傳指定標的最近 250 天標準日 K 與籌碼數列。
  - `GET /api/market/symbols?q=...`：提供即時智慧聯想與模糊搜尋清單（支援代碼與中文名稱）。
- 脫機或打包備援：當未處於 Vite 開發環境時，前端自動 Fallback 至瀏覽器 IndexedDB 與既有 `tw_market_summary.json` / `tw_market_ohlcv_compact.json`。

### 4. 主力戰情室引擎消費整合
- **數據載入管線 (`marketCacheLoader.ts`)**：
  - 優先查詢本地 `/api/market/history/:symbol`；若成功取得 250 天歷史數據，即刻非同步緩存至 IndexedDB。
- **盤中與盤後雙軌拼接**：
  - 盤後 (16:30 後台股 / 08:00 後美股)：直接以 SQLite 歷史日 K 進行指標計算，`isSettled: true`。
  - 盤中 (交易時段)：以歷史 250 根日 K 為基準，取即時報價拼接第 251 根動態日 K，`isSettled: false`。
- **美股主力量化替代演算法**：
  - 在缺乏三大法人買賣超情況下，由 `volumeProfileEngine.ts` 與 `multiDimensionRadarEngine.ts` 計算成交量微觀結構，以 VWAP 偏離度、OBV 動能與 MFI 流向指數映射為法人評分。

---

## Testing Decisions

### 1. 測試原則與接縫 (Testing Seams)
- **單一最高測試接縫**：只針對公開的 API 介面 (`/api/market/*`) 與資料載入器 (`loadSymbolHistoryWithFallback`) 進行行為驅動測試，不耦合內部 SQLite SQL 拼接細節。
- **邊界防禦與異常注入**：
  - 模擬 Yahoo 429 限流時的自適應退避與斷點續傳狀態恢復。
  - 模擬除權息股票分割時，日 K 均線無跳空斷層。
  - 模擬離線狀態下，前端自適應降級至 IndexedDB 本地快取。

### 2. 測試套件規劃
- `sqliteDataLake.test.ts`：驗證資料庫建立、CRUD、500 日滾動修剪與 VACUUM 機制。
- `scheduledSyncResilience.test.ts`：驗證 Checkpoint 斷點續傳、錯誤記錄與增量跳過邏輯。
- `viteMarketApiMiddleware.test.ts`：驗證 API 路由解析、250 日日 K 格式轉換與模糊搜尋回應。
- `aiForceDashboardEngine.integration.test.ts`：驗證全市場標的在戰情室載入時，9 大核心卡片數據完整渲染。

---

## Out of Scope

1. **即時 Tick-by-Tick 逐筆撮合與 L2 五檔買賣單永久保存**（僅限當日即時監控，不納入 SQLite 歷史長存）。
2. **非主要美股市場標的**（如 OTC Pink Sheets 粉紅單、微型仙股 Penny Stocks、槓桿權證等）。
3. **券商自動下單或委託回報整合**（本系統定位為輔助量化戰情室，不涉及下單交易通道）。

---

## Further Notes

- **相容性保證**：本架構完全向下相容既有 `tw_market_summary.json` 與 `IndexedDB` 機制。若在純靜態環境（如 GitHub Pages 預覽）運行，系統自動降級為靜態快取模式，不產生任何中斷錯誤。
- **法規與合規遵循**：TWSE、TPEx 與 TDCC 之資料採集嚴格遵守政府資訊開放 (Open Data) 規範；美股採集嚴格遵守單 IP 節流防禦，杜絕濫用風險。
