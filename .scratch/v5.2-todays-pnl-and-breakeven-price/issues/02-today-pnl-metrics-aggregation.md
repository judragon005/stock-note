# Ticket 02: 盤中當日損益指標彙總與型別擴充 (Today's PnL Metrics Aggregation)

## 需求說明
- 擴充 `src/types/stock.ts`：
  - `HoldingPosition` 新增 `todaysPnL?: number`、`todaysPnLPercent?: number`、`todaysChange?: number`、`breakevenPrice?: number`。
  - `MarketSummarySlice` 新增 `todayPnL?: number`、`todayPnLPercent?: number`。
- 修改 `src/engine/calculator.ts` 之 `calculateHoldingsAndSummary`：
  - 支援傳入 `quotes` 或透過 `currentPrices` 與 `previousClose` 逐檔計算每檔在倉股票之今日每股漲跌額、今日漲跌幅與今日損益金額 (`todaysPnL = shares * (currentPrice - previousClose)`)。
  - 呼叫 `calculateBreakevenPrice` 注入每檔持股之保本單價。
  - 彙整台股市場、美股市場與全市場總體（跨幣別即時匯率折算）之當日損益總額與當日整體波動百分比。
- 撰寫與更新 `src/engine/calculator.test.ts` 單元測試，確保今日損益彙總邏輯 100% 正確。

**Status:** done

- [x] 擴充 `stock.ts` 型別定義。
- [x] 於 `calculateHoldingsAndSummary` 實作當日損益聚合與保本價注入。
- [x] 補齊單元測試。
