# 技術債 0043: 台股上櫃股票與櫃買債券 ETF 代碼清洗標準化、盤後日 K 入庫物件修復與交易所元數據校準

- **建立日期**: 2026-10-03
- **結案日期**: 2026-10-05 (Spec 0168 / Ticket 03)
- **來源**: /grill-with-docs 深度調研 (日 K 完整度與終端機執行異常診斷)
- **狀態**: `RESOLVED`
- **優先級**: `P1 (High)`
- **標籤**: `DataIntegrity` · `Lakehouse` · `DailyCandles` · `Normalization` · `TPEx`
- **解決方案**:
  - 建立 `scripts/market-sync/normalize-otc-symbols.cjs` 實裝冪等代碼標準化遷移腳本，將 `00411AO`、`3293O` 等櫃買標的遷移歸正為標準代碼。
  - 在 `src/engine/marketCacheLoader.ts` 與 `vite-market-middleware.cjs` 實裝 `getOtcAliasCandidates` 雙向別名回退探測，確保前端與後端湖倉查詢 100% 命中歷史日 K。

---

## 1. 現況與背景 (Context)

經深度調研全市場 SQLite 數據湖倉 (`daily_candles`) 與歷史/盤後同步管線，發現所有台股上櫃股票（如鈊象 3293、環球晶 6488、元太 8069）以及櫃買中心掛牌之債券 ETF（如元大美債20年 00679B、國泰20年美債 00687B、元大投資級公司債 00720B、群益ESG投等債20+ 00937B 等）在以標準代碼查詢日 K 時皆回傳 **0 筆**，且日常盤後自動同步時日 K 寫入數持續為 0 檔。

深入剖析底層資料庫與資料流後，確認由以下三層相互疊加的致命架構裂痕所導致：

### (1) 歷史回補層：本機 CSV 檔名「代碼帶 O 尾綴」未做標準化清洗
- 本機既有歷史數據庫（`D:\APP\諮詢\私人\股市\台股加權指數_歷史數據\上市櫃股票與債券_歷史數據\全市場股票與債券歷史數據庫`）為區分上市與上櫃，其櫃買標的檔名均帶有代表 OTC 的尾綴 `O`（例如 `3293O_鈊象_全歷史數據.csv`、`6488O_環球晶_全歷史數據.csv`、`00679BO_元大美債20年_全歷史數據.csv`）。
- `scripts/market-sync/backfill-local-csv.cjs:271` 解析代碼時使用 `filename.split('_')[0]`，未過濾尾綴 `O`，直接將非標準代碼（如 `3293O`、`6488O`、`00679BO`）寫入 `daily_candles`。
- 前端戰情室、指標引擎與 `symbols_meta` 均使用標準 4~6 碼（如 `3293`、`00679B`），透過標準代碼查詢湖倉時完全命中不到，造成「無歷史日 K」的假象。

### (2) 日常盤後同步層：日 K 行情物件漏賦 `symbol` 鍵致入庫 100% 被過濾
- 在 `scripts/market-sync/sync-tw-market.cjs` 與 `market-sync-core.cjs` 中，`parseTwseDailyQuotesBulk` 與 `parseTpexDailyQuotesBulk` 產生的物件僅包含 `{ date, open, high, low, close, volume }`，未在物件內部設置 `symbol` 屬性。
- 入庫函式 `saveTwQuotesToSqlite`（位於 `ingest-tw-quotes.cjs`）讀取 `Object.values(allQuotes)` 並執行防禦性驗證 `if (!item || !item.symbol || ...) continue;`。
- 由於 `item.symbol` 為 `undefined`，導致每日同步時 **100% 的日 K 數據直接被過濾跳過**，每次執行皆回傳 `已寫入 0 檔台股日 K 收盤行情 (daily_candles)`，歷史日 K 斷層完全無法透過日常盤後更新自癒。

### (3) 元數據交易所硬編碼偏差 (`symbols_meta`)
- `symbols_meta` 中全市場 7,833 檔台股的 `exchange` 欄位一律預設為 `TWSE`，包括上櫃股票與櫃買債券 ETF，未能正確反映 `TPEx` 歸屬，影響後續交易所分流採集與標記精確度。

---

## 2. 改善方案 (Proposed Solution)

### A. 歷史回補檔名代碼正規化 (Normalization)
在 `scripts/market-sync/backfill-local-csv.cjs` 中新增代碼清洗防呆：
- 若代碼結尾為 `O` 且長度大於 4（例如 `3293O` -> `3293`，`00679BO` -> `00679B`），自動去除尾隨的 `O` 並將交易所識別為 `TPEx`。
- 撰寫一鍵資料庫代碼遷移腳本，將 `daily_candles` 中既有帶 `O` 的歷史資料（如 `UPDATE daily_candles SET symbol = substr(symbol, 1, length(symbol)-1) WHERE symbol LIKE '%O'`）安全遷移歸併至正規代碼。

### B. 盤後同步日 K 物件結構修復
在 `scripts/market-sync/market-sync-core.cjs` 的 `parseTwseDailyQuotesBulk` 與 `parseTpexDailyQuotesBulk` 中：
- 在生成的行情物件中補齊 `symbol` 欄位（例如 `result[symbol] = { symbol, date: dateStr, ... }`）。
- 同步在 `ingest-tw-quotes.cjs` 中加入防呆：若 `item.symbol` 缺漏，則自動自外層 Key 補回。

### C. 標的註冊表交易所校正 (`symbols_meta`)
- 透過 TPEx / TWSE 官方標的名冊比對，將櫃買中心掛牌之上櫃股票與櫃買債券 ETF 的 `exchange` 正式更新為 `TPEx`。

---

## 3. 預計觸發時機

於下次台股日 K 湖倉維護或數據管線重大修復專題（如台股日 K 完整度治理專案）中優先實施。
