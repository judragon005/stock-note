# Issue 03: TDD 單元測試補強與全量綠燈驗證

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `ci`

## 任務說明
1. 在 `src/engine/priceFetcher.test.ts` 加入測試：
   - 模擬 Yahoo Finance 00636 傳回 `meta: { regularMarketPrice: 27.27, fulldayChange: -0.11, chartPreviousClose: 28.13 }`。
   - 驗證解析結果：`price = 27.27`、`change = -0.11`、`previousClose = 27.38`、`changePercent = -0.402%`。
   - 嚴格斷言：`previousClose` 絕不可為 `28.13`，`change` 絕不可為 `-0.86`。
2. 執行全量 `npx vitest run` 確保 57 個測試套件 100% 通過。
3. 執行 `npm run build` 確保 0 型別錯誤。
