# 02 — 整合未結算時點數據定錨回退與盤中即時報價隔離

**What to build:**
在 AI 主力分析報表生成引擎中整合結算狀態判定。當處於未結算狀態時，自動將 18 項量化卡片運算基準定錨至前一個已收盤交易日，並將盤中即時報價安全隔離為參考屬性，杜絕歷史模型污染。

**Blocked by:**
01 — 實作市場結算狀態判定引擎與擴充資料合約

**Status:**
resolved

- [x] `generateAiForceReportFromCandles` 引入結算狀態檢查
- [x] 若當前處於未結算狀態且傳入之日 K 最新一根為當日，自動回退以前一日收盤 K 線為基準計算量化指標
- [x] 傳入之即時行情封裝至 `marketBar.intradayQuote` 供 UI 參考，不參與歷史指標計算
- [x] 卡片 02 之 `decisionCore` 自動產生 `settlementNotice` 警示文案
- [x] 撰寫分析引擎在未結算狀態下的整合單元測試
