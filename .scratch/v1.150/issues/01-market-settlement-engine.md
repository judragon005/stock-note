# 01 — 實作市場結算狀態判定引擎與擴充資料合約

**What to build:**
建立具備台北時區感知、純函式無副作用的市場結算狀態判定引擎（涵蓋台股 15:00 門檻與美股台灣時間 08:00 門檻），並於領域型別定義中擴充結算狀態、定錨基準日與盤中即時報價欄位。

**Blocked by:**
None — can start immediately

**Status:**
resolved

- [x] 實作純函式 `getMarketSettlementStatus(market, referenceDate)`
- [x] 支援台股 (TW) 平日 15:00 前判定為未結算，15:00 後判定為已結算
- [x] 支援美股 (US) 台北時間 08:00 前判定為未結算，08:00 後判定為已結算
- [x] 週末與假日正確回退至最近之已收盤交易日
- [x] 擴充 `MarketBarData` 與 `DecisionCoreData` 之介面定義
- [x] 單元測試 100% 覆蓋所有時段邊界與時區切換
