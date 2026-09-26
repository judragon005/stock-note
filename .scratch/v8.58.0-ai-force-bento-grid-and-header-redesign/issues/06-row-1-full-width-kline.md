# 06 — 01 主 K 線獨立滿版一行重構 (Row 1 Full-Width KLine)

**What to build:**
在 `AiForceDashboardView.tsx` 中將 `01 主 K 線圖` 抽離出原本的 5 卡擠壓行，單獨設為第 1 排（100% 滿版寬度）。
賦予主 K 線專業看盤大視野，30D/60D/120D/250D 週期與指標切換空間寬敞從容。

**Blocked by:** 02 — 頂部行情 Bar 雙層分工重構 (Two-Tier Header Layout)

**Status:** completed

- [x] `01 主 K 線圖` 獨佔整個第 1 排（width: 100%）
- [x] 週期切換（30D/60D/120D/250D）與技術指標切換無干擾
- [x] 相關單元測試 `KLineChartCard.test.ts` 100% 綠燈
