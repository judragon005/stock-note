# 06 — 台美核心主流 ETF 權重種子庫與型別模型 (ETF Holdings Seed Registry & Schema)

**What to build:**
建立台股與美股最核心主流 ETF（台股：0050, 006208, 0056, 00878, 00919, 00923, 00713；美股：SPY, QQQ, VT, VTI）之前十大與關鍵成分股常數種子字典 (`src/data/etfHoldingsData.ts`)。每檔成分股包含 `(symbol, name, weightPercent, sector, country)`。同時定義嚴謹型別契約 `ETFConstituent`、`ETFProfile` 與 `LookThroughExposure`。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 完整收錄台美 11 檔主流 ETF 之前十大權重資料，權重總和與單項權重驗證合理
- [ ] 標的代碼與中文名稱規範化對齊 `stockDictionary.ts`
- [ ] 涵蓋標準產業類別 (資訊科技, 金融保險, 半導體, 通訊服務, 消費品, 原物料, 醫療保健等)
- [ ] 單元測試驗證所有收錄 ETF 權重數據格式合法且各項權重均大於 0
