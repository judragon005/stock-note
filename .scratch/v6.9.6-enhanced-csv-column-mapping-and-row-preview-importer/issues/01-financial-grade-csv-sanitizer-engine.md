# 01 — 金融級 CSV 資料清洗與容錯引擎 (csvSanitizer.ts)

**What to build:**
實作純函式資料清洗與容錯引擎 `src/engine/csvSanitizer.ts`：
1. **日期標準化 (`normalizeDateString`)**：
   - 支援民國年（`113/05/20`、`113-05-20`、`1130520` ➔ 自動轉為西元 `2024-05-20`）。
   - 支援美式格式（`MM/DD/YYYY` ➔ `YYYY-MM-DD`）與純數字格式（`YYYYMMDD` ➔ `YYYY-MM-DD`）。
2. **數值與符號清洗 (`sanitizeNumeric`)**：
   - 自動去除貨幣符號 (`$`, `NT$`, `US$`)、千分位逗點 (`,`)、百分比 (`%`)。
   - 支援會計負數括號轉換：`"(1,234.50)"` ➔ `-1234.5`。
3. **交易動作語意推斷 (`inferTradeType`)**：
   - 智慧對齊台美券商術語（`買進`/`現股買`/`BOT` ➔ `BUY`；`賣出`/`現股賣`/`SLD` ➔ `SELL`；`除息`/`股利` ➔ `DIVIDEND`；`除權`/`配股` ➔ `STOCK_DIVIDEND`；`減資` ➔ `CAPITAL_REDUCTION`；`拆股`/`分割` ➔ `STOCK_SPLIT`）。
4. **標的名稱自動補齊 (`resolveSymbolAndName`)**：
   - 若僅有代碼無名稱（或有名稱無代碼），自動調用官方股票字典補全標的名稱與市場。

**Blocked by:** None — can start immediately.

**Status:** completed
**Triage:** `ready-for-agent`

- [x] 在 `src/engine/csvSanitizer.ts` 中實作核心清洗函式
- [x] 在 `src/engine/csvSanitizer.test.ts` 中撰寫 100% 覆蓋率單元測試
