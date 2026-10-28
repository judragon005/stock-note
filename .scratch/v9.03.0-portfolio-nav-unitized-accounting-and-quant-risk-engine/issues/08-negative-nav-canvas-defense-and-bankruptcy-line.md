# 08 — SVG 畫布穿倉負淨值防禦與破產警示紅線

**What to build:**
解決極端信用交易（融資斷頭、槓桿借貸）情境下總資產變為負數時 SVG 畫布崩潰的問題。移除 Y 軸刻度計算中硬編碼的 `Math.max(0, ...)`，允許 Y 軸最小值為負數，正確投影負淨值坐標；並在 Y = 0 水平基準線繪製顯眼的紅色虛線破產警示線，確保極端黑天鵝事件下前端圖表永不破裂崩潰。

**Blocked by:** Ticket 07

**Status:** ready-for-agent

- [ ] 檢視並移除 `PortfolioGrowthChart.tsx` 及其 SVG 投影計算中所有不當的 `Math.max(0, minVal)` 硬性截斷
- [ ] 支援當 `minVal < 0` 時，自動調整 Y 軸刻度範圍 `[minVal, maxVal]`，包含適當 buffer
- [ ] 當序列包含負數時，在 Y 座標對應 0 元 / 0% 的位置繪製 `<line>` 破產警示紅虛線，並附帶標籤 `0 (破產線)`
- [ ] 撰寫測試驗證當出現負淨值數列時，SVG 坐標點無 NaN 或坐標翻轉錯誤
