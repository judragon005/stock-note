# 0203 Spec: 數據湖倉全量補足、API 金鑰測活代理中繼與 Tiingo 備援整合規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0203
* **標題：** 數據湖倉全量補足、API 金鑰測活代理中繼與 Tiingo 備援整合
* **關聯 Issue：** 待建立（對齊 Issue-First 工作流）
* **規格狀態：** `APPROVED_DRAFT` (待開工規格書)
* **版本：** V1.0
* **建立日期：** 2026-10-22
* **架構定位：** 本地數據湖倉治理、金融 API 網關中繼、高可用備援與測活體驗重構

---

## 2. 需求背景與問題剖析 (Background & Problem Statement)

在專案演進中，經過專家團隊（首席架構師、量化對沖總監、數據 SRE 專家）對 SQLite 數據湖倉（`.scratch/market-cache/market_history.db`）、設定中心與外部數據管線進行三輪穿透研討，確認以下四大核心缺陷：

### 2.1 外部金融 API 測活假死與錯誤吞噬 (Error Swallowing & CORS Blocking)
1. **瀏覽器 CORS 跨來源物理阻斷**：
   - 聯準會 FRED (`api.stlouisfed.org`)、Alpha Vantage、SEC EDGAR 與 Tiingo 的官方伺服器，對前端瀏覽器直連請求回傳 `Access-Control-Allow-Origin: null`。
   - 瀏覽器底層安全機制直接阻斷連線，前端僅能捕獲無 HTTP 狀態碼的 `TypeError: Failed to fetch`。
2. **錯誤訊息被程式碼吞噬 (Error Swallowing)**：
   - [`src/engine/apiKeyHealthProbe.ts#L162-L172`](file:///d:/APP/股票紀錄/src/engine/apiKeyHealthProbe.ts#L162-L172) 遇到例外時直接標記 `status: 'INVALID'`，輸出「連線失敗: Failed to fetch」，完全不告訴使用者官方真正的報錯原因。
3. **FMP 免費方案測試端點錯位**：
   - [`src/engine/apiKeyHealthProbe.ts#L90`](file:///d:/APP/股票紀錄/src/engine/apiKeyHealthProbe.ts#L90) 寫死為 `/stable/quote?symbol=AAPL`（專屬付費端點）。使用者申請之正確免費 Key 會被回傳 `403 Forbidden`，造成有效金鑰被無辜判定為無效。
4. **狀態判斷邏輯反向漏洞**：
   - 若伺服器回傳 `400 Bad Request`（如 FinMind Token 格式錯誤），探針未攔截，反而一路掉到預設回傳 `status: 'HEALTHY'`。

### 2.2 湖倉 11 張表嚴重偏枯與 Zero-Mock 違反 (Empty Lakehouse & Mock Residue)
1. **`etf_daily_nav` (ETF 折溢價與官方淨值) 永久 0 筆**：
   - [`scripts/market-sync/ingest-macro-sentiment.cjs#L137-L149`](file:///d:/APP/股票紀錄/scripts/market-sync/ingest-macro-sentiment.cjs#L137-L149) 存在嚴重程式碼缺陷：
     - 未解包官方格式的 `{ a1: [{ msgArray: [...] }] }`。
     - 欄位英文字母寫反（官方為 `e = 市價, f = 淨值, g = 折溢價率 %`，代碼誤植為 `c = 市價, d = 淨值, e = 折溢價`）。
     - 導致自始至終無法入庫任何一筆 ETF 官方淨值，散戶追價無法獲得溢價警示。
2. **`tw_insider_pledge_records` (董監質押與申報轉讓) 殘留 5 筆假資料**：
   - [`scripts/market-sync/bootstrap-lakehouse-full.cjs#L129-L135`](file:///d:/APP/股票紀錄/scripts/market-sync/bootstrap-lakehouse-full.cjs#L129-L135) 寫死 5 檔股票（2330, 1217 等）的假資料，違反專案 Zero Mock 核心原則；全市場 2,400+ 檔真實董監設質完全未入庫。
3. **`corporate_action_calendar` 僅 26 筆**：
   - 缺少全市場歷史除權息基準日庫，缺少融券最後強制回補日 (`mandatory_buyback_date`)，法人無法預先識別除權息軋空動能。
4. **`macro_sentiment_daily` 僅 2 筆**：
   - 僅收錄 2 天，且日更腳本帶有寫死常數（美債殖利率寫死 4.12、外資台指期寫死 -28450），缺乏歷史時序連續性。

### 2.3 儲存架構分裂 (Storage Partitioning & Split Brain)
* 損益表、資產負債表與現金流量表（三表財報）目前**全數隔離於瀏覽器前端 IndexedDB**，由使用者在 UI 點選單檔個股時才臨時發送網路請求抓取。
* 本機 SQLite 數據湖倉無任何財務三表紀錄，導致本機無法執行全市場批次基本面篩選、Piotroski F-Score 掃描或自由現金流 (FCF) 覆蓋率評估；且瀏覽器清除快取後資料即歸零。

### 2.4 美股單一數據源脆弱性與還原價差偏誤 (Single Source Risk)
* 美股全市場日 K 與還原價（`daily_candles`）目前完全依賴 Yahoo Finance Chart API。
* Yahoo Finance 為未公開之第三方端點，連續請求極易遭遇 HTTP 429 或公網 IP 臨時封鎖；且 Yahoo 還原價偶有微幅漂移。
* 缺乏一個**免信用卡、高精度拆股除息因子、結構化清晰**的正規備援來源（Tiingo API）。

---

## 3. 核心設計原則 (Guiding Principles)

1. **極簡第一性原理 (KISS Principle)**：
   - 拒絕引入龐大第三方代理伺服器。直接重用專案既有的 Vite 原生 Connect 中介層（[`scripts/market-sync/vite-market-middleware.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/vite-market-middleware.cjs)），在 Node.js 執行階段代發測活請求，以 40 行代碼徹底終結 CORS 困境。
2. **零造假原則 (Zero-Mock Protocol)**：
   - 全面拔除 `bootstrap-lakehouse-full.cjs` 中的寫死 5 檔董監質押資料與寫死宏觀常數。對接台灣證交所官方開放資料端點，無數據時誠實填入 `NULL`。
3. **官方一手優先 (Official First-Party Priority)**：
   - 台股優先採用 TWSE / TPEx / TAIFEX 官方開放資料（免費、免 Key、法規保障）；美股財報優先採用 SEC EDGAR 官方免費開放端點；外部商業 API（FinMind, Tiingo, FMP）作為補充與特定備援。
4. **雙軌自適應補缺 (Smart Bootstrap & Cadence Sync)**：
   - 區分「一次性 250 天歷史冷啟動」與「盤後 5 秒智慧補缺」。日常啟動時自動比對湖倉水位線，僅抓取缺失的 1~2 天，避免無謂重複輪詢。
5. **穿透透明反饋 (Transparent User Feedback)**：
   - API 測活失敗時，100% 讀取並轉發官方回傳之真實 JSON 錯誤文字（如「次數超限」、「端點受限」），嚴禁粗暴判定為無效或吞噬錯誤。

---

## 4. 詳細功能與技術規格 (Engineering Specifications)

### 4.1 本地測活代理中繼路由與探針重構 (API Key Health Probe & Relay)
1. **中介層端點實作**：
   - 於 [`scripts/market-sync/vite-market-middleware.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/vite-market-middleware.cjs) 新增 `POST /api/market/probe-key` 端點。
   - 接受 JSON Payload：`{ provider: ProviderType, key: string, proxyUrl?: string }`。
   - 由 Node.js 使用原生 `fetch` 發起請求，具備 10 秒看門狗逾時與自訂 `User-Agent: StockTracker/1.0 (local-probe)`。
   - 讀取伺服器真實回應狀態碼與 Body 文本（`res.text()`），解析出第三方錯誤訊息。
   - 回傳格式：
     ```json
     {
       "provider": "fred",
       "status": "HEALTHY" | "INVALID" | "QUOTA_EXHAUSTED" | "COOLING_DOWN",
       "httpStatus": 200,
       "message": "連線成功，金鑰健康正常",
       "details": null,
       "latencyMs": 142
     }
     ```
2. **前端探針路由重構**：
   - 於 [`src/engine/apiKeyHealthProbe.ts`](file:///d:/APP/股票紀錄/src/engine/apiKeyHealthProbe.ts) 重構 `probeApiKey`：
     - **優先路由**：透過本機 `/api/market/probe-key` 代測，消滅瀏覽器 CORS 阻斷。
     - **環境降級容錯**：若本地中介層未啟動（如靜態展示環境），自動回退至前端直連；若直連遭遇 `Failed to fetch` 且 `httpStatus === 0`，精確標註為 `status: 'COOLING_DOWN'` 並給出「瀏覽器 CORS 限制，後端排程可正常調用」之友善說明，**嚴禁標記為 `INVALID`**。
3. **測試端點校正**：
   - FMP 測試端點修正為免費相容端點：`https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=${key}`。
   - FinMind 測試端點增加對 400 錯誤之專用解析：若回傳 `token is invalid` 標記為 `INVALID`。

### 4.2 Tiingo API 供應商型別定義與美股備援鏈路 (Tiingo Integration)
1. **型別與金鑰池配置**：
   - 於 [`src/engine/apiKeyPoolTypes.ts`](file:///d:/APP/股票紀錄/src/engine/apiKeyPoolTypes.ts) 之 `ProviderType` 擴充 `'tiingo'`：
     ```typescript
     export type ProviderType = 'finmind' | 'finnhub' | 'fred' | 'polygon' | 'coingecko' | 'sec' | 'fmp' | 'alphavantage' | 'tiingo';
     ```
   - 預設配額：`dailyQuotaLimit: 500`, `rateLimitPerMin: 10`。
2. **設定頁面卡片渲染**：
   - 於 [`src/components/UnifiedApiKeyManager.tsx`](file:///d:/APP/股票紀錄/src/components/UnifiedApiKeyManager.tsx) 之 `PROVIDER_CONFIGS` 與 `DISPLAYED_PROVIDERS` 加入 Tiingo：
     - `label: 'Tiingo'`
     - `tag: '🇺🇸 美股高精度還原日 K / IEX 報價備援'`
     - `desc: '全市場美股券商級還原日 K、除息現金 (divCash) 與拆股因子 (splitFactor)，免費版每日 500 次。'`
     - `docUrl: 'https://www.tiingo.com/'`
3. **美股採集排程降級鏈路**：
   - 於 [`scripts/market-sync/ingest-us-quotes.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/ingest-us-quotes.cjs) 建立 `fetchTiingoHistoricalQuotes(symbol, apiKey, days)`：
     - 端點：`https://api.tiingo.com/tiingo/daily/${symbol}/prices?startDate=${startDate}&token=${apiKey}`
     - 映射欄位：`date`, `open`, `high`, `low`, `close`, `adjClose`, `adjVolume`, `divCash`, `splitFactor`。
   - 於 [`scripts/market-sync/sync-us-market.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/sync-us-market.cjs)：
     - 當 Yahoo Finance 遭遇 `429_RATE_LIMITED` 或連續逾時時，自動檢查金鑰池是否有可用之 Tiingo Key。
     - 若有，無縫降級切換至 Tiingo 抓取在倉持股（Tier 0），確保持股數據 100% 不中斷。

### 4.3 數據湖倉致命盲區修復與全量注水 (Lakehouse Remediation)
1. **ETF 官方收盤淨值與折溢價 (`etf_daily_nav`)**：
   - 修正端點：`https://mis.twse.com.tw/stock/data/all_etf.txt`。
   - 重構 [`scripts/market-sync/ingest-macro-sentiment.cjs#parseTwseEtfNavResponse`](file:///d:/APP/股票紀錄/scripts/market-sync/ingest-macro-sentiment.cjs)：
     - 正確解包 `rawData.a1` 陣列中的 `msgArray`。
     - 正確對齊欄位：`a = 代碼, e = 市價, f = 官方淨值 (NAV), g = 折溢價率 (%)`。
     - 批次寫入 `etf_daily_nav (symbol, date, close_price, nav, premium_discount_ratio, updated_at)`。
2. **全市場真實董監持股設質 (`tw_insider_pledge_records`)**：
   - 重構 [`scripts/market-sync/ingest-tw-pledge.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/ingest-tw-pledge.cjs)：
     - 對接台灣證交所官方開放資料端點：`https://openapi.twse.com.tw/v1/opendata/t187ap11_L`。
     - 自動解析全體上市公司最新月份董監事設質股數、持有股數與質押比例。
     - 徹底剷除 `bootstrap-lakehouse-full.cjs` 中寫死的 5 檔 Mock 數據，全量入庫 2,400+ 檔真實設質月報。
3. **細分產業族群分類代碼 (`symbols_meta.industry`)**：
   - 於 [`scripts/market-sync/sqlite-db-core.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/sqlite-db-core.cjs) 擴充 `symbols_meta` 欄位：`industry TEXT`（冪等遷移）。
   - 對接證交所開放資料 `https://openapi.twse.com.tw/v1/opendata/t187ap03_L`，提取官方產業別代碼（如 `01` 水泥、`24` 半導體、`25` 電腦週邊、`32` 綠能環保），建立全市場類股輪動動能底座。

### 4.4 財務三表核心科目下沉 SQLite 湖倉 (Lakehouse Financial Statements)
1. **SQLite 表結構擴充**：
   - 於 `sqlite-db-core.cjs` 建立輕量表 `financial_statements_quarterly`：
     ```sql
     CREATE TABLE IF NOT EXISTS financial_statements_quarterly (
       symbol TEXT NOT NULL,
       market TEXT NOT NULL,              -- 'TW' | 'US'
       year INTEGER NOT NULL,
       quarter INTEGER NOT NULL,          -- 1 | 2 | 3 | 4
       revenue REAL,                      -- 營業收入
       gross_profit REAL,                 -- 營業毛利
       operating_income REAL,             -- 營業利益
       net_income REAL,                   -- 母公司業主淨利 (最高優先級)
       eps REAL,                          -- 每股盈餘
       total_assets REAL,                 -- 資產總額
       total_liabilities REAL,            -- 負債總額
       total_equity REAL,                 -- 權益總額
       current_assets REAL,               -- 流動資產
       current_liabilities REAL,          -- 流動負債
       accounts_receivable REAL,          -- 應收帳款與票據
       inventory REAL,                    -- 存貨
       operating_cash_flow REAL,          -- 營業活動現金流 (CFO)
       capital_expenditure REAL,          -- 資本支出 (CapEx)
       free_cash_flow REAL,               -- 自由現金流 (FCF)
       cash_dividends_paid REAL,          -- 現金股利發放
       updated_at INTEGER NOT NULL,
       PRIMARY KEY (symbol, year, quarter)
     );
     CREATE INDEX IF NOT EXISTS idx_fsq_symbol ON financial_statements_quarterly(symbol, year DESC, quarter DESC);
     ```
2. **三表數據流轉與 API 支援**：
   - 於 `vite-market-middleware.cjs` 增加 `GET /api/market/financials/:symbol`，優先自 SQLite 湖倉高速返回 8 季數據。
   - 個股深度財報頁面（[`src/engine/taiwanFinancialPipeline.ts`](file:///d:/APP/股票紀錄/src/engine/taiwanFinancialPipeline.ts) 與 [`src/engine/usFinancialPipeline.ts`](file:///d:/APP/股票紀錄/src/engine/usFinancialPipeline.ts)）改為 Lakehouse-First 模式：先讀取本機 SQLite，無數據才發送外部 API，並將外部 API 回傳數據自動回填入本機 SQLite。

### 4.5 全量補足與增量自動化管線 (Unified Backfill Pipeline)
1. **冷啟動一鍵全量回補指令**：
   - 於 `package.json` 配置 `npm run backfill:full`，執行：
     1. 台股 250 交易日官方日報回補（收盤價量、成交筆數、三大法人 T86、資券、BWIBBU PE/PB）。
     2. 美股 1,500 檔 250 天歷史日 K 回補（Yahoo Chart 首選，Tiingo 備援）。
     3. 證交所全市場 ETF 淨值折溢價、全市場董監設質月報全量注水。
2. **日常增量 5 秒補漏**：
   - 整合 `detectTwDateGaps`，每次開機只抓缺失的 1~2 天，達成「一次全量補足，日後少量填補」之目標。

---

## 5. 測試縫隙與驗收標準 (Test Seams & Verification Criteria)

嚴格遵守公開介面測試原則，杜絕私有細節脆性測試：

| 測試縫隙 (Test Seam) | 測試檔案 | 驗證標準與斷言目標 |
| :--- | :--- | :--- |
| **Seam 1: 中介層測活路由** | `scripts/market-sync/vite-market-middleware.test.cjs` | 測試 `POST /api/market/probe-key` 能正確代測 FRED、FMP 與 Tiingo，當 API 回傳 401/403/429 時能正確解析出第三方 JSON 報錯訊息，HTTP 狀態碼如實反饋。 |
| **Seam 2: 探針容錯與 CORS 降級** | `src/engine/apiKeyHealthProbe.test.ts` | 測試在離線或中介層未就緒時，遇到 `Failed to fetch` 能優雅給出 CORS 限制提示，嚴禁判定為 `INVALID`；FMP 測試 URL 正確指向 `/api/v3/profile/AAPL`。 |
| **Seam 3: Tiingo 數據映射** | `scripts/market-sync/ingest-us-quotes.test.cjs` | 測試 Tiingo 回傳之 JSON 能精準提取 `adjClose`、`divCash`、`splitFactor` 並事務寫入 `daily_candles`。 |
| **Seam 4: ETF 淨值解析修正** | `scripts/market-sync/ingest-macro-sentiment.test.cjs` | 傳入官方 `all_etf.txt` 模擬結構，驗證 `parseTwseEtfNavResponse` 能精準提取 `e (市價)`, `f (淨值)`, `g (折溢價率)` 並入庫 `etf_daily_nav`。 |
| **Seam 5: 董監設質開放資料** | `scripts/market-sync/ingest-tw-pledge.test.cjs` | 傳入證交所 `t187ap11_L` 陣列，驗證能正確計算 `設質比例` 並寫入 `tw_insider_pledge_records`，不殘留 Mock 假資料。 |
| **Seam 6: 湖倉財報表增刪改查** | `scripts/market-sync/sqlite-lakehouse-financials.test.cjs` | 驗證 `financial_statements_quarterly` 支援 16 核心科目寫入、衝突更新 (UPSERT) 與多季時序查詢。 |

---

## 6. 非功能性需求與邊界防護 (Non-Functional Requirements)

1. **零過度工程化 (No Heavy Dependencies)**：
   - 100% 使用 Node.js 22 原生 `node:sqlite` 與原生 `fetch`，不引入 Express、Axios 或 Docker。
2. **本地數據主權與資安防護 (Data Sovereignty)**：
   - 所有 API Key 僅儲存於本地 IndexedDB / LocalStorage（經 Web Crypto 256-bit 加密保護），嚴禁將金鑰傳輸至任何第三方雲端或推送至 Git。
3. **資料庫鎖定超時保護 (Database Concurrency Resilience)**：
   - 全局鎖定 `PRAGMA busy_timeout = 15000` 與 `PRAGMA journal_mode = WAL`，批次寫入一律採用事務批次提交，杜絕 Windows `database is locked` 錯誤。

---

## 7. 驗收核對清單 (Acceptance Checklist)

- [ ] 設定頁面中，FRED、Alpha Vantage、SEC、FMP、FinMind 測活全部能正常反饋，金鑰填對即顯示綠燈，填錯即顯示官方具體報錯文字（如「次數超限」、「金鑰無效」）。
- [ ] 設定頁面成功新增 Tiingo 卡片，支援金鑰登記、測活與輪替池管理。
- [ ] `etf_daily_nav` 資料表成功收錄真實收盤淨值與折溢價率，不再為 0 筆。
- [ ] `tw_insider_pledge_records` 全量入庫證交所開放資料，徹底清除 5 檔寫死 Mock 假資料。
- [ ] `symbols_meta` 具備官方產業分類代碼。
- [ ] SQLite 成功建立 `financial_statements_quarterly` 表並支援 Lakehouse-First 查詢。
- [ ] 執行全量 `npm test` 保持 100% 綠燈，`npm run build` 0 型別錯誤。
- [ ] 執行 `/handoff` 閉環操作（主幹合併、本地分支清理、文檔與 ADR 同步）。
