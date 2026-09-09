# Issue 01: 重構 parseYahooQuoteResponse 解析邏輯以真實今日價差倒推昨收價

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `quote`

## 任務說明
1. 修改 `src/engine/priceFetcher.ts` 中 `parseYahooQuoteResponse`：
   - 優先提取 `meta.regularMarketChange ?? meta.fulldayChange` 作為今日價差 `change`。
   - 優先提取 `meta.regularMarketChangePercent ?? meta.fulldayChangePercent` 作為今日漲跌幅 `changePercent`。
   - 推導昨日收盤價 `previousClose`：優先取 `meta.regularMarketPreviousClose ?? meta.previousClose`；若無則以 `price - change` 精準倒推。
   - 徹底移除直接以 `meta.chartPreviousClose` 當成昨日收盤價之危險邏輯。
