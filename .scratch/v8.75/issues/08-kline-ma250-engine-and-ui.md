# 08 — 02 主 K 線圖 MA250 (年線) 指標演算法與視覺引線實裝

**What to build:** 在日 K 指標計算中新增 MA250（年線）計算，並於主 K 線圖中實裝年線紫色軌道與頂部圖例，全年度 Darvas 箱體、Volume Profile 與風險蛛網全面切換為 250 日真實收盤基準。

**Blocked by:** 06 — 報表引擎徹底拔除 5 根 Mock 日 K 與硬編碼假數值

**Status:** closed

- [x] 在 `generateAiForceReportFromCandles` 中實作 MA250 滑動平均計算
- [x] 升級 `KLineChartCard.tsx`，加入 MA250 紫色折線軌道與切換按鈕
- [x] 撰寫單元測試驗證 250 根日 K 成功計算非空 MA250 數值
