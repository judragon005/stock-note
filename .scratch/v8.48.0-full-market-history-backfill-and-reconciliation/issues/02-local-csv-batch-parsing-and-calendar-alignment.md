# 02 — 本機歷史 CSV 批次剖析與大盤日曆對齊引擎 (Local CSV Batch Parsing & Calendar Alignment)

**What to build:**
實作全市場歷史資料導入的核心解析引擎：
1. 讀取加權指數與 0050 基準歷史日曆，建立標準交易日序列（Trading Calendar SSOT）。
2. 高性能串流剖析本機既有歷史資料庫（`全市場股票與債券歷史數據庫` 與 `全歷史籌碼與融資融券數據庫`）。
3. 實作「第二層容錯機制」：若為個股減資或暫停交易停牌（Trading Halt），開高低收沿用前一交易日收盤價，成交量與三大法人買賣超填補為 0，標註 `isHalted: true`，確保數列計算不產生 NaN。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

- [x] 實作 `scripts/market-sync/backfill-local-csv.cjs` 核心檔案
- [x] 讀取 TAIEX 基準歷史日曆建立有效交易日清單
- [x] 批次串流剖析 2,200+ 檔個股日 K 與籌碼 CSV
- [x] 實作停牌與無量之前值填補與標記邏輯
