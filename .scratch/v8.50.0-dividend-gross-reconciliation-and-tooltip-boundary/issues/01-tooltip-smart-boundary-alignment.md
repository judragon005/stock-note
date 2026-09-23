# 01 — 月度現金流長條圖 Tooltip 智慧邊界避讓演算法

**What to build:**
當使用者在「股利收益日誌與現金流全景」檢視中滑鼠懸浮於月度現金流長條圖時，系統依據月份欄位動態指派 Tooltip 之對齊方向（1~2 月靠左、3~9 月居中、10~12 月靠右對齊向左展開），箭頭精準指向柱體中心，徹底解決 12 月 Tooltip 向右溢出並覆蓋右側「股息貢獻排行 (Top)」卡片的問題（修復照片 1 UI Bug）。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `DividendLogView.tsx` 中實作 Tooltip 智慧對齊計算：`idx < 2 ? 'left' : idx >= 9 ? 'right' : 'center'`
- [ ] 驗證 12 月長條圖懸浮時，浮窗向左展開且右緣與柱體齊平，完全不遮擋相鄰卡片
- [ ] 驗證 1 月長條圖懸浮時，浮窗向右展開且左緣與柱體齊平，不被左邊界裁切
