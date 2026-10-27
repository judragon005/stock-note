# Ticket 02: defaultFetchJson 雙重信號複合支援與超時防護加固

* **關聯技術債：** [0052](../../docs/debts/0052-default-fetch-json-compound-abort-signal.md)
* **目標檔案：**
  - `scripts/market-sync/backfill-tw-history-web.cjs`
  - `scripts/market-sync/sync-tw-market.cjs`
  - `src/engine/backfillFullMarketHistory.test.ts`
* **狀態：** `DONE`

## 工作項目
1. 升級 `defaultFetchJson` 與 `fetchJson`，使用 `AbortSignal.any` 複合使用者 `options.signal` 與連線超時 `timeoutSignal`。
2. 加入特性檢測相容性防護（若環境不支援 `AbortSignal.any` 則優雅回退）。
3. 撰寫單元測試覆蓋複合信號取消與超時熔斷場景。
