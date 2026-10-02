# Ticket 04: 重構 aiForceDashboardEngine 消除跨日期開高低量拼裝，實裝已結算即時日 K 防斷層自適應縫合

## 目標
1. 在 `aiForceDashboardEngine.ts`：當即時報價缺乏開高低量時，若日 K 日期落後超過 1 個交易日，嚴禁將舊日 K 的開高低量拼裝進今日，應設為 `undefined`。
2. 當今日已結算且外部即時報價已取得今日收盤價，若日 K 數列最後一根仍停在前一日或更早，引擎自動將該收盤行情作為最新一根日 K 縫合至 `klineSystem.candles`，確保主 K 線圖最後一根精準對齊頂部看板日期。
