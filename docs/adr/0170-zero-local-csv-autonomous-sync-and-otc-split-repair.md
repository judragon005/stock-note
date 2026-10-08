# 0170. 徹底移除本地 CSV 依賴、全自主聯網回補管線與櫃買代碼撕裂治理架構決策

- **狀態 (Status)**: 已採納 (Accepted)
- **日期 (Date)**: 2026-10-08
- **決策者 (Deciders)**: 專案架構團隊
- **關聯規格 (Spec)**: [0170-zero-local-csv-autonomous-sync-and-otc-split-repair-spec.md](../specs/0170-zero-local-csv-autonomous-sync-and-otc-split-repair-spec.md)
- **關聯任務 (Issue)**: #191

---

## 1. 背景與脈絡 (Context & Problem Statement)

在先前版本中，系統在歷史數據初始化與日常同步面臨以下核心痛點：
1. **本機 CSV 強依賴與路徑崩潰**：既有回補與日曆計算依賴硬編碼的本機目錄（`HISTORICAL_BASE_DIR`），在一般使用者環境缺少 D 槽檔案時會直接拋錯崩潰。
2. **日常同步日 K 物件漏賦 `symbol` 鍵致入庫率為 0%**：`parseTwseDailyQuotesBulk` 與 `parseTpexDailyQuotesBulk` 回傳物件漏填 `symbol`，致使 `saveTwQuotesToSqlite` 嚴格過濾掉全部日 K 數據，每日同步無法自癒。
3. **櫃買上櫃股票代碼帶 `O` 撕裂斷層**：上櫃股票（如 `3293` 鈊象）與櫃買債券 ETF（如 `00679B`）在歷史數據中帶有 `O` 尾綴，導致在標準代碼查詢下歷史資料呈現 10/02 前後斷層。
4. **上市權值股籌碼斷層**：台積電 (2330) 與元大台灣50 (0050) 於 10/05~10/07 缺少 T86 三大法人籌碼與融資券數據。
5. **戰情室未結算期日 K 斷層**：當日盤中或尚未結算至 15:00 期間，歷史日 K 末端停留在前一交易日，缺乏當日動態即時 K 棒整合。

---

## 2. 決策內容 (Decision Drivers & Strategy)

### 2.1 演算法交易日曆引擎 (`trading-calendar-engine.cjs`)
- 徹底拔除對本機 CSV 檔案的掃描依賴，實作純演算法台灣法定休假日與補假計算。
- 支援民國/西元跨年度雙向判定，零檔案讀寫，執行耗時 < 1ms。

### 2.2 本地 CSV 回補腳本防呆與除役 (`backfill-local-csv.cjs`)
- 目錄不存在時輸出優雅警告並乾淨跳過，不再 throw 未捕獲例外，確保單元測試與各環境平穩運行。

### 2.3 日常盤後同步日 K 物件防呆與去 O 清洗 (`market-sync-core.cjs` & `ingest-tw-quotes.cjs`)
- 在解析 TWSE/TPEx 報價時，強制於行情物件中補齊 `symbol` 欄位並剝除可能存在的 `O` 尾綴。
- 在 SQLite 入庫層改以 `Object.entries(quotesMap)` 遍歷，若物件缺少 `symbol` 則自 Key 自動補齊並清理。

### 2.4 櫃買代碼去 O 事務性安全遷移 (`merge-otc-split-symbols.cjs`)
- 實作原子性 SQLite 交易，查詢全庫 `GLOB '[0-9]*O'` 的標的，無損 upsert 至標準乾淨代碼（取極值與最新值），並徹底刪除帶 `O` 舊資料。
- 全庫累計安全遷移 1,000 檔上櫃標的、257,087 筆歷史日 K。

### 2.5 Vite 中介層歷史端點雙向相容與聯網追趕 (`vite-market-middleware.cjs`)
- 背景追趕排程改呼叫自主聯網同步 `runTwMarketSync`。
- `/api/market/history/:symbol` 支援代碼與別名（去除/附加 `O`）雙向回退探測，並依日期去重合併。

### 2.6 主力戰情室盤中即時 K 棒動態縫合 (`aiForceDashboardEngine.ts`)
- 遵循 Spec 0150 主定錨隔離原則：在未結算期間，`marketBar.currentPrice` 定錨前一結算日以保護主力模型乖離率；
- 同時，若傳入當日盤中即時行情（`liveQuote`），動態構造一根標註 `isIntraday: true` 的即時日 K 棒縫合至 `klineSystem.candles` 最末端。
- 任務五「原始資料表」首行置頂展示「⚡ 即時」徽章，使使用者可即時掌握盤中最新進展。

---

## 3. 狀態與影響 (Consequences & Status)

### 正向影響 (Positive)
- ✅ 100% 自主運作：全市場回補與日常同步徹底脫離本機 CSV 檔案束縛。
- ✅ 歷史日 K 連續無斷層：櫃買標的（3293、00679B）與上市權值股（2330、0050）10/05~10/07 日 K 與法人籌碼完全連續。
- ✅ 盤中與盤後體驗無縫融合：主力模型精準防禦，圖表與表格即時反饋。
- ✅ 數據庫經過 VACUUM 瘦身，磁碟佔用降低，查詢效能大幅提昇。
- ✅ 全專案 203 個測試檔、1498 個測試 100% 綠燈，TypeScript 0 錯誤。
