# 0168. 台美雙軌零 CSV 歷史回補、真實成交筆數入庫與統一金融金鑰控制中心架構決策

- **狀態 (Status)**: 已採納 (Accepted)
- **日期 (Date)**: 2026-10-07
- **決策者 (Deciders)**: 專案架構團隊
- **關聯規格 (Spec)**: [0168-zero-csv-dual-market-backfill-and-unified-api-key-console-spec.md](../specs/0168-zero-csv-dual-market-backfill-and-unified-api-key-console-spec.md)
- **關聯技術債 (Debts)**: [0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md](../debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md) (RESOLVED)

---

## 1. 背景與脈絡 (Context & Problem Statement)

在專案演進至 v8.80 後，系統面臨以下四大結構性問題：
1. **代碼誤判與照片一缺陷**：主動式台股基金與債券 ETF（如 `00411A` 統一前沿科技、`00679B` 元大美債20年）因代碼結尾帶英文字母，在 `inferMarketType` 中被誤判為美股 `US`，導致主力戰情室計價幣別誤為 USD、成交量單位誤為股數，且長天期均線（MA60/MA250）在短天期新標的下呈現空白或崩潰。
2. **櫃買 O 代碼分裂與技術債 0043**：歷史資料庫中存在大量櫃買中心 `O` 尾綴標的（如 `3293O`、`00411AO`），造成同一標的日 K 資料被撕裂為兩組，且日 K 資料庫缺少真實官方成交筆數（`transactions`）。
3. **金鑰管理介面重複與白底違和 (照片二缺陷)**：設定工作區中舊版「外部金融資料 API 金鑰管理」（原生 white inputs）與「多金鑰池智慧輪替管理面板」上下重複，破壞全站暗黑毛玻璃金融設計語言。
4. **外部歷史資料依賴與無痛回補**：舊版歷史回補強烈依賴本地外接 D 槽 CSV 歷史資料，一般使用者缺乏完整檔案即無法初始化全市場湖倉。

---

## 2. 決策內容 (Decision Drivers & Strategy)

### 2.1 台股代碼推斷正則強化與市場路由 (`inferMarketType`)
- 強化正則運算式，明確支援以字母結尾之台股代碼：`/^[0-9]{4,6}[A-Z]?$/`。
- `00411A`、`00679B` 等主動式或債券 ETF 將 100% 精準識別為台股 `TW`，幣別強制繫結為 `TWD`，量能單位為 `張`。

### 2.2 SQLite Lakehouse Schema 擴充與代碼無損標準化 (技術債 0043 結案)
- `daily_candles` 動態擴充 `transactions INTEGER`（官方真實成交筆數，無資料時為 NULL，嚴禁捏造）。
- 實作無損遷移邏輯，自動將庫內帶 `O` 尾綴之櫃買標的合併歸併至標準乾淨代碼（`INSERT OR REPLACE ... SELECT substr(symbol, 1, length(symbol) - 1)`）。
- 在 Vite 中介層查詢歷史日 K 時，若查無標準代碼且符合台股特徵，主動執行別名回退探測（`symbol` / `symbol + 'O'`），確保雙向相容。

### 2.3 主力戰情室短天期智慧自適應降級 (Smart Adaptive Depth)
- 遵循 Zero Mock 原則，絕不虛構不存在之 MA60/MA250。
- 對於掛牌未滿 250 天之新上市櫃標的（如 `00411A` 目前 37 筆日 K），足夠天數之短中期指標正常輸出；長天期指標呈現 Honest Empty State，標註「新上市數據累積中 (37/60D)」。

### 2.4 依供應商統一卡片式金鑰管理中心 (`UnifiedApiKeyManager`)
- 徹底廢除舊版原生白底 input 與舊版金鑰池獨立面板，以單一強大的暗黑毛玻璃卡片取代。
- 支援供應商分流（FinMind, Finnhub, FMP, FRED, CoinGecko, SEC EDGAR 等）。
- 整合 Web Crypto 256-bit 本地隔離保護、全域 Proxy 配置、單鍵測活與 30 秒冷卻防連點。

### 2.5 官方日期驅動歷史全回補管線 (Zero-CSV Backfill)
- 捨棄個股驅動與本地 CSV 依賴，直接以「日期驅動 (Date-Driven)」連線 TWSE/TPEx 官方 4 大每日全市場日報端點（`MI_INDEX`, `T86`, `1430`, `3itrade_hedge`）。
- 250 個交易日只需 1,000 次官方請求即可補全全市場 2,361+ 檔股票一年歷史，每請求間隔 3,000ms 遵守防爬蟲禮儀。
- 支援 `sync_checkpoints` 斷點續傳，中斷可隨時重啟接關。

### 2.6 後端中介層與前端排程控制台
- Vite 中介層註冊 `POST /api/market/backfill-all` 與 `GET /api/market/backfill-status`。
- 在「設定 ➔ 排程中心」新增「台美雙軌零 CSV 背景全歷史回補」控制面板，支援一鍵背景啟動、自適應進度條與電腦不關機持續執行。

---

## 3. 狀態與影響 (Consequences & Status)

### 正向影響 (Positive)
- ✅ `00411A`、`00679B` 完全解決誤判，戰情室 18 張卡片全面即時連動本地資料庫。
- ✅ 技術債 0043 正式結案，櫃買代碼全數標準化。
- ✅ 徹底消除照片二中重複的 API 金鑰介面，全站視覺達到一致的暗黑毛玻璃金融專業品質。
- ✅ 一般使用者不需任何外部 CSV，在網頁介面點擊按鈕即可於背景自動補齊過去一年台美雙軌全市場日 K 與法人籌碼。

### 負向影響與權衡 (Trade-offs)
- 台股官方日報回補因防爬蟲間隔（3,000ms / 請求），回補 250 交易日需約 50 分鐘，需提醒使用者保持電腦開機並依賴 SQLite 斷點續傳。
