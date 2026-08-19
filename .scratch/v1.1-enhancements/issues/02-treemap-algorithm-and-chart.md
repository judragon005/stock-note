# 02 — 原生資產樹狀圖演算法與互動圖表 (Treemap Algorithm & Chart)

**What to build:**
實作 Squarified Treemap 遞迴矩形切割演算法 (`src/utils/treemap.ts`) 與單元測試 (`src/utils/treemap.test.ts`)。打造現代 Glassmorphism 原生 SVG 樹狀圖組件 (`src/components/TreemapChart.tsx`)，支援個股市值佔比（面積）、損益率（色系明暗）、懸浮 Tooltip 卡片，並於 `AllocationChart.tsx` 整合「樹狀圖 / 環形圖 / 長條圖」切換。

**Blocked by:** 01-calculator-and-yoc

**Status:** completed

- [x] 實作純 TypeScript Squarified Treemap 切割演算法，確保座標皆落在邊界內。
- [x] 撰寫 Treemap 演算法之 Vitest 單元測試（包含單持股、多持股、極端權重邊界條件）。
- [x] 實作 `TreemapChart.tsx`，支援自訂色彩映射與互動式 Glassmorphism Tooltip。
- [x] 升級 `AllocationChart.tsx` 提供視圖切換器（樹狀圖 / 環形圖 / 長條圖）。
