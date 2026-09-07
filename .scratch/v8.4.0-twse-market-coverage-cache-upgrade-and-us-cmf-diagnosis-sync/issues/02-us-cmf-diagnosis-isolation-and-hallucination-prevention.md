# 任務 02: 美股 CMF 專屬生活化診斷與「三大法人」字眼絕對隔離

- **狀態**: `completed`
- **優先級**: P0
- **完成說明**: getBeginnerDiagnosis 已支援 market 與 cmf 參數，美股標的完全阻斷三大法人字樣並生成大白話生活化說明。
- **目標**:
  1. `smartMoneyEngine.ts` 之 `getBeginnerDiagnosis` 增加 `market?: MarketType` 與 `cmf?: number` 參數。
  2. 美股 (US) 標的絕不輸出「三大法人」、「外資」、「投信」、「自營商」等台股字眼。
  3. 美股依 CMF 指標與漲跌幅生成生活化白話診斷（大機構做多吸籌、逆勢吃貨、趁高倒貨、提款撤退、籌碼平衡中立）。
