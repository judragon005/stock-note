# 02 — 淘汰 2,100 元假 K 棒與無日 K 科技感 Empty State 視圖 (K-Line Chart SSOT & Graceful Empty State)

**What to build:**
徹底移除 `KLineChartCard.tsx` 中硬編碼之 `basePrice = 2100` 生成 30 根 K 棒的偽造邏輯。當 `candles` 為空或不足時，K 線圖不再繪製打架的 2,100 元蠟燭與 138 元支撐線，而是直接渲染具備科技感與毛玻璃質感的「📊 尚無歷史交易日 K 數列·數據回補中」Empty State 面板。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] `normalizeAndSortCandles` 移除 `basePrice = 2100` 假數列生成，空數列時回傳空陣列 `[]`。
- [x] `KLineChartCard.tsx` 在 `displayCandles.length === 0` 時，渲染優雅 Empty State 卡片，停止繪製異常 Y 軸與打架的支撐線。
- [x] `KLineChartCard.test.ts` 驗證空陣列時不再產生 2100 元蠟燭與破圖。
- [x] 單元測試 100% 通過。

