# Issue 01: 台股上櫃 (.TWO) 與上市 (.TW) 雙軌探測回補引擎實作

## 狀態

- 狀態：`CLOSED` (已實作雙軌探測並通過單元測試驗證)
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `tpex`, `backfill`

## 需求說明

1. 在 `src/engine/historicalOhlcvBackfill.ts` 中升級 Yahoo Finance 查詢代碼解析邏輯：
   - 支援生成台股候選代碼清單 `['.TW', '.TWO']`（TPEx 優先 `.TWO`）。
   - 當首選請求遭遇 404 或日 K 數列為空時，自動備援請求下一個候選代碼。
2. 在 `src/engine/priceFetcher.ts` 中的 `fetchQuote` 同步確保對偶後綴備援。
