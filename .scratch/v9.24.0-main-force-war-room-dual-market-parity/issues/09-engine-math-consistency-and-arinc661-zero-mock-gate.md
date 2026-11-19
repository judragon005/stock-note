# 09 — 引擎算術一致性 (VWAP / RSI / 估值雙分位 / PromptAdapter) 與 ARINC 661 零幻覺載入閘門

**Parent:** #592 (Spec 0239)
**What to build:** 統一核心報表引擎與子引擎之數學口徑並徹底消除所有違反 Zero-Mock 的硬編碼假數值：Card 10 改消費 `effectiveCandles`；統一全引擎 20D VWAP 為 Typical Price 並修正 `vwapCostEngine` `-1%` 負溢位與色帶名稱；修正 RSI 14 日零波動回傳 `50`；升級估值分位計算支援 PE/PB 並存且僅在歷史樣本 $\ge 5$ 且非 ETF 時標定區間；修正 `aiForcePromptAdapter` 20D 切片、量能單位與四週集保變動；實作 ARINC 661 零幻覺載入與待命硬閘門（`isLoading` 骨架、`<5D` 或僅有報價無日 K 嚴格 `isDataPending=true`、全區遮罩與 `WarRoomPromptCard` `currentPrice <= 0` 停損誤報防線）。
**Blocked by:** 02 — 單一權威資產分類器 (resolveAssetClass)、名稱解析參數校正與雙市場結算時區引擎, 08 — 雙市場總經隔離與美股核心評分數學解鎖 (Card 02 / 05 / 09 / 11 / 12 / 14 / 16 / 18)
**Status:** ready-for-agent

- [ ] Card 10 (`bullBearEnergy`) 消費 `effectiveCandles` 與其他卡片時間窗口一致；未結算當日籌碼對 `options.institutionalRecords` 亦正確隔離；已結算縫合檢查 `realtimeQuote.price > 0`。
- [ ] 全引擎（Card 01, 07, 12, 13, 18, PromptAdapter）20D VWAP 口徑統一；`vwapCostEngine` 四帶佔比永不出現負數且總和為 100%；連 14 日平盤 RSI 輸出 `50`（非 `100`）；Card 17 放量長黑不加分。
- [ ] `calculateValuationPercentile` 可同時回傳 `pePercentile` 與 `pbPercentile`；`historySampleSize < 5` 或 ETF 時不強貼 `'合理估值區間'`；Card 21 完整計算並透傳 `forwardPe`、`psRatio`、`netDividendYieldUs` 與 `isLossMaking`。
- [ ] `aiForcePromptAdapter` 的 20D 合計僅加總近 20 日、依明確市場單位換算量能（誤差不再 1000x）、使用真實 4 週集保變動、且不再以台股分數冒充美股 CNN 恐懼貪婪指數。
- [ ] `createDefaultAiForceReport` 與所有子引擎徹底移除假常數（`-64張`, `+1,621張`, `2131`, `06/26~08/31`, `56分`, `19.7%`, `49/57/53/45/62`, `100%完整度`, `0.99/1.015/0.985`）；`effectiveCandles.length < 5` 一律維持 `isDataPending = true`；載入中不閃現「查無真實數據」且 `WarRoomPromptCard` 於 `currentPrice <= 0` 時絕不誤觸發停損警報。
