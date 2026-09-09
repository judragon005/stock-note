# Issue 02: 美股特殊代碼容錯、符號標準化與備援探測

## 狀態

- 狀態：`CLOSED` (已支援點號/連字號互轉、BRKB 連寫與 .US 清洗備援)
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `us-market`

## 需求說明

1. 在 `src/engine/priceFetcher.ts` 擴充 `getYahooCandidateSymbols(symbol, market)`：
   - 支援美股點號與連字號轉換（如 `BRK.B` $\to$ `BRK-B`）。
   - 支援 5 碼連寫代碼備援（如 `BRKB` 失敗時嘗試 `BRK-B`）。
   - 自動去除 `.US`、`NASDAQ:`、`NYSE:` 等輸入雜訊。
2. 確保在 `backfillSymbolOhlcvAndIndicators` 中能遍歷候選清單直至成功。
