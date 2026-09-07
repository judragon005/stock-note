---
title: "Ticket 03: AllocationChart 權重清單同步納入負債與頂部 LTV 膠囊"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
在 `AllocationChart.tsx` 中傳入借款資料，於權重清單中顯示負債長條項，並在頂部比例 HUD 注入獨立 LTV 槓桿膠囊。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. `AllocationChart` 接收 `loans` 或 `totalDebtTwd` 屬性。
- [x] 2. 切換至「權重清單」視圖時，列出 `🏦 借貸負債` 項目及其佔比與金額。
- [x] 3. 頂部三段式進度條保持純資產（台股/美股/現金）分母計算，不受負債污染。
- [x] 4. 當 `totalDebtTwd > 0` 時，頂部比例 HUD 顯示 `🏦 負債比 LTV: XX.X%`；若為零則隱藏。
