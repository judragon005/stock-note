# ADR 0203: 數據湖倉全量補足、API 金鑰測活代理中繼與 Tiingo 備援架構 (Lakehouse Bootstrap, API Probe Proxy & Tiingo Backup)

## 狀態 (Status)
**已接受 (Accepted)** - 關聯 Issue #329 (對應 Spec 0203)

## 上下文與問題陳述 (Context & Problem Statement)
專案在本地數據湖倉、API 金鑰管理與資料抓取管線長期運作中，面臨以下架構與可靠性瓶頸：
1. **金融 API 測活假死與瀏覽器 CORS 阻斷**：
   - 聯準會 FRED、SEC EDGAR、Tiingo 等官方伺服器不支援前端跨來源請求 (`CORS: null`)，導致前端僅能捕獲無狀態碼之 `TypeError: Failed to fetch`。
   - 探針將所有例外粗暴判為 `INVALID`，吞噬真實錯誤原因。
   - FMP 測活用付費端點造成有效免費 Key 被誤判；FinMind 格式錯誤 400 未被攔截反誤判為健康。
2. **數據湖倉多張表偏枯與 Zero-Mock 違反**：
   - `etf_daily_nav` 由於解析巢狀 `{ a1: [{ msgArray }] }` 欄位顛倒，造成全市場 ETF 淨值永久 0 筆。
   - `tw_insider_pledge_records` 殘留寫死 5 檔股票之 Mock 資料，未介接官方開放資料全市場 2,400+ 檔真實董監設質。
   - 標的字典 `symbols_meta` 缺乏證交所官方產業分類代碼。
3. **儲存架構分裂 (Storage Partitioning)**：
   - 財務三表（損益、資產負債、現金流）過去僅存在於瀏覽器前端 IndexedDB，SQLite 湖倉完全無三表資料，導致無法進行離線與批次財務掃描，且外部 API 面臨頻率限制。
4. **美股單一數據源脆弱性**：
   - 美股日 K 完全依賴 Yahoo Finance，遭遇 HTTP 429 限流時缺乏正規備援來源。

## 架構決策 (Decision Drivers & Architecture)
1. **極簡第一性原理之本地測活中繼代理 (KISS Proxy)**：
   - 充分重用專案既有的 Vite Connect 中介層，新增 `POST /api/market/probe-key` 端點。
   - 在本機 Node.js 執行階段代發探針請求，附加看門狗超時與合規 `User-Agent`，完美穿透第三方真實 HTTP 狀態碼與錯誤訊息，消滅瀏覽器 CORS 物理阻斷。
2. **Zero-Mock 原則與官方一手資料注水**：
   - 徹底剷除 `bootstrap-lakehouse-full.cjs` 中的寫死 5 檔董監質押假資料。
   - 介接證交所 OpenAPI `t187ap11_L` 批次注水全市場董監設質月報；修復 `all_etf.txt` 巢狀解析，正確入庫全市場 ETF 淨值與折溢價。
   - 字典表無損遷移擴充 `symbols_meta.industry TEXT`，介接 `t187ap03_L` 自動填入官方產業分類。
3. **標準化 16 核心財務三表湖倉與 Lakehouse-First 雙軌自癒**：
   - 初始化 `financial_statements_quarterly` 湖倉表與 `(symbol, year, quarter)` 複合主鍵，收斂為 16 核心財務科目。
   - 中介層提供 `GET /api/market/financials/:symbol` 與 `POST /api/market/financials` 批次寫入端點。
   - 重構台股與美股財報管線：優先毫秒級讀取本地湖倉（秒開），未命中時自外部 API 抓取並自動非同步回填 SQLite，具備離線可用性與防止重送。
4. **Tiingo 行情接入與 Yahoo 429 降級備援守衛**：
   - 擴充 `ProviderType = 'tiingo'`、金鑰池管理與專屬 EOD 測活探針。
   - 實作 Tiingo 歷史日 K 精準映射（含除息現金與拆股因子）。在美股同步中建立 429 降級守衛，自動無縫切換至 Tiingo 抓取，保護公網 IP。
5. **歷史冷啟動與日常增量調度閉環**：
   - 台股 250 天歷史回補排程一次性注水價量、三大法人 T86、融資融券與 BWIBBU 估值日報。
   - 配置 `npm run backfill:full` 與 `npm run sync:incremental`，實現「一次全量注水、日常 5 秒極速補漏」。

## 後果與影響 (Consequences)
- **正面影響 (Positive)**：
  - 金鑰測活綠燈率與真實錯誤反饋達到 100%，消除瀏覽器 CORS 困擾。
  - 徹底剷除任何假資料，ETF 淨值、董監設質與產業類別全量真實入庫。
  - 財報查詢達成毫秒級秒開，消除第三方 API 頻率限制與重複請求。
  - 美股具備雙軌容錯備援，公網 IP 不再因高頻請求遭遇封鎖。
- **負面影響 (Negative)**：
  - 首次全量回補 250 天歷史數據需消耗較長時間（可透過斷點續傳分段完成）。
