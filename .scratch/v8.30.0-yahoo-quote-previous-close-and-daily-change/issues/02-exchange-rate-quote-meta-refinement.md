# Issue 02: 匯率解析器 parseYahooExchangeRateResponse 語意與欄位優化

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `fx`

## 任務說明
1. 檢視並優化 `src/engine/priceFetcher.ts` 中 `parseYahooExchangeRateResponse`：
   - 確保匯率在計算當日漲跌時，優先採用 `regularMarketChange` / `fulldayChange`，或僅在區間為極短線且無其他欄位時防禦性 fallback。
