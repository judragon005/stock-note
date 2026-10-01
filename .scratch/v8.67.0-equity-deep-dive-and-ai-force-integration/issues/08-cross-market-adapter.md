# 08 — 台美雙市場動態適配器與美股替代籌碼分析

**What to build:** 
在 `src/engine/equityDeepDiveAssembler.ts` 實作跨市場動態適配函式 `adaptMarketDeepDiveData(market, rawData)`。當標的為美股 (`US`) 時：
1. 三大法人欄位自動切換為量能分佈 (Volume Profile)、VWAP 成本階梯偏離度與動能代理說明。
2. 處置警示自動切換為高波動率/Beta 警示與空頭壓力分析。
3. 幣別自動由 TWD/張 切換為 USD/股。
杜絕空值造成的顯示破圖或 NaN 錯誤。

**Blocked by:** 06 — 本地湖倉數據裝配器：行情價量、本益比與殖利率, 07 — 本地湖倉數據裝配器：三大法人籌碼與箱體防線

**Status:** ready-for-agent

- [ ] 美股標的自動降級並注入價量替代特徵
- [ ] 台股標的維持三大法人與信用交易精確數據
- [ ] 統一輸出格式相容的裝配資料結構
- [ ] 單元測試 100% 覆蓋台美股雙分支
