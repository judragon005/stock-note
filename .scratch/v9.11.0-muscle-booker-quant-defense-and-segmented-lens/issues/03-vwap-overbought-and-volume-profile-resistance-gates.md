# 03 — 專案既有 VWAP 主力成本線與 Volume Profile 套牢壓無縫串接

**What to build:**
1. 調用現成 `vwapCostEngine.calculateVwapCostStructure`，在突破時檢驗現價與 20 日主力 VWAP 成本線的偏離度。若乖離率 `biasPercent > 10%`，判定為主力高檔出貨/乖離過熱，降級為 `HOLD`（主力成本過熱）。破底翻若收復 VWAP 加分標註。
2. 調用現成 `volumeProfileEngine.calculateVolumeProfile`，檢驗現價上方 5% 內是否存在 POC 大量套牢峰（佔比 > 25%）。若存在沉重套牢反壓，降級風益比並提示套牢壓制。
3. 美股標的串聯 `smartMoneyEngine.computeChaikinMoneyFlow`（CMF 蔡金資金流），若 CMF < -0.15 阻斷突破。

**Blocked by:** 02 — 平滑化 R-Multiple 目標價與雙市場日均成交金額容量門檻

**Status:** ready-for-agent

- [x] `scanMuscleBookerItem` 內複用 `vwapCostEngine` 計算乖離率
- [x] 突破邏輯整合 Volume Profile 上方套牢峰檢驗
- [x] 美股整合 CMF 資金流判定
- [x] 單元測試驗證過熱降級與套牢阻力壓制
