# 01 — 台股全市場批次獲取與本地 CPU 指標計算引擎 (TW Full Market Batch Engine & Local Indicators)

**What to build:**
建立 Node.js 執行環境下的台股全市場數據獲取核心。利用 TWSE / TPEx 官方日報特性，以單次請求獲取全市場（2,200+ 檔）當日三大法人籌碼 (T86) 與當日收盤行情 (MI_INDEX)。接著在本地記憶體中，結合歷史日 K 資料庫，利用 CPU 增量計算 MA (5/10/20/60)、RSI、MACD 與 Darvas 箱體技術指標，將運算結果持久化儲存於本地快取目錄。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 實作 `scripts/market-sync/market-sync-core.cjs`：提供 Node.js 端共用之日 K 增量合併、MA/RSI/MACD/箱體計算邏輯
- [x] 實作 `scripts/market-sync/sync-tw-market.cjs`：單次請求整包抓取 TWSE 與 TPEx T86 籌碼日報與 MI_INDEX 收盤行情
- [x] 滾動追加今日 K 線並於本機記憶體計算全量技術指標，杜絕個別標的打 API 造成的 429 限流
- [x] 輸出標準化台股快取檔案至 `.scratch/market-cache/tw_market_summary.json` 與 `public/market-cache/`
- [x] 單元測試驗證批次解析器與技術指標數值計算之正確性
