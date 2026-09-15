# 02 — 美股分級優先隊列與自適應限流引擎 (US Tiered Priority Queue & Adaptive Rate Limiter)

**What to build:**
建立 Node.js 執行環境下的美股全市場排程獲取引擎。由於美股 API 無法單次整包下載全量市場，設計「雙層優先級隊列 (Tiered Priority Queue)」：Tier 1（使用者持股、自選觀察名單、S&P 500、NASDAQ 100 成份股）優先以受控併發（Concurrency = 3，間隔 150ms）極速完成日 K 與指標補齊；Tier 2（全市場其餘標的）使用區塊批次搭配帶抖動的指數退避（Exponential Backoff with Jitter），徹底防禦 429 封鎖。

**Blocked by:** Ticket 01 (共用 `market-sync-core.cjs`)

**Status:** ready-for-agent

- [x] 實作 `scripts/market-sync/sync-us-market.cjs` 美股同步腳本
- [x] 實作雙層隊列調度器：優先完成 Tier 1 核心標的集合，確保使用者高頻標的 100% 優先就緒
- [x] 實作批次抓取 Yahoo Finance 日 K 線並滾動增量計算指標
- [x] 輸出標準化美股快取檔案至 `.scratch/market-cache/us_market_summary.json` 與 `public/market-cache/`
- [x] 測試驗證遭遇 429 警示時之自適應冷卻與退避重試能力
