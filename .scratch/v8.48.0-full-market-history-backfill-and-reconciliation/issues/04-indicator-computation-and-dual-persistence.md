# 04 — 全量技術指標計算與雙目的地沉澱管線 (Indicator Computation & Dual Persistence)

**What to build:**
實作資料計算與持久化管線：
1. 結合補齊後的完整日 K 與法人籌碼，在本地端 CPU 高速運算 MA (5/10/20/60)、RSI (14)、MACD 與 Darvas 箱體數列。
2. 目的地 1 輸出：產出 `public/market-cache/tw_market_summary.json`（最新秒讀快取總表）與 `tw_historical_ohlcv_compact.json`（供前端 IndexedDB 批量非同步沉澱）。
3. 目的地 2 輸出：提供同步回寫機制，將增量或補齊資料更新回本機磁碟歷史數據庫 (`D:\APP\諮詢\私人\股市\台股加權指數_歷史數據\上市櫃股票與債券_歷史數據\`)。

**Blocked by:** Ticket 03

**Status:** ready-for-agent

- [x] 本地 CPU 批次計算技術指標與籌碼動能指標
- [x] 輸出 `public/market-cache/tw_market_summary.json` 供前端 0 延遲瞬間秒讀
- [x] 輸出 IndexedDB 緊湊歷史結構包
- [x] 實作本地磁碟歷史 CSV 數據庫回寫同步機制
