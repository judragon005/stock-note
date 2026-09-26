# 01 — 卡片 06 累積型 AI 預測路徑圖雙色發散扇形錐與動態 Y 軸價位刻度

**What to build:**  
在 `ForecastConeCard.tsx` 實作 `buildSplitConePaths`，將中央黃色中位數曲線 (`medianPoints`) 以上封閉為「上漲發散扇形面」（填色 `bullConeGrad` 紅橙色漸層 `#ef4444` ➔ `#f97316`，透明度 0.35 ➔ 0.08），中軌以下封閉為「下跌發散扇形面」（填色 `bearConeGrad` 翠綠色漸層 `#10b981` ➔ `#047857`，透明度 0.35 ➔ 0.08），使視覺與圖例（紅色上漲、綠色下跌）完全契合。此外，動態計算價格範圍並於左側渲染 2~3 條 Y 軸價格文字（如 2500, 2000）與微弱水平參考線，底部「主力方向機率：多頭 52%」動態綁定多頭鮮紅色 `#ef4444`。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 在 `ForecastConeCard.tsx` 中實作 `buildSplitConePaths(upperPoints, medianPoints, lowerPoints)` 演算法，產出 `bullAreaPath` 與 `bearAreaPath`。
- [x] 在 SVG Defs 宣告 `#bullConeGrad` (紅橙漸層) 與 `#bearConeGrad` (綠色漸層)，取代原單一藍紫 `#coneGrad`。
- [x] 新增動態 Y 軸價位文字標籤與水平參考線（如 2500, 2000）。
- [x] 底部「主力方向機率」多頭時色彩修正為鮮紅色 `#ef4444`。
- [x] 在 `ForecastConeCard.test.ts` 擴充並通過單元測試，驗證雙色發散路徑、Y 軸價位與色彩主題。

