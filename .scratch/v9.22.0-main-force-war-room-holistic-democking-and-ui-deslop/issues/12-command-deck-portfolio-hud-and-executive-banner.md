# Issue 12: 頂部一體化戰術指揮艙、個人持倉 HUD 與首屏戰術摘要帶重構

- **層級**: 前端主視圖 / 抬頭顯示器
- **關聯規格**: Spec 0237 Ticket 12 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 於 `src/components/AiForceDashboardView.tsx` 重構頂部指揮艙：整合標的搜尋、常駐快捷膠囊、行情與個人持倉 HUD（均價 vs VWAP 乖離對比、庫存張數）。
2. 將 5 大任務視圖切換器上移為頂部精密分段控制器，消除底部 Sticky 遮擋。
3. 建立首屏主力戰術摘要帶（包含主力作戰光譜、Card 02 因果判讀與 Card 18 點位）。
