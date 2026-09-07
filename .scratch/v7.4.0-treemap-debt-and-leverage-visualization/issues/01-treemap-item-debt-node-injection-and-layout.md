---
title: "Ticket 01: 樹狀圖資料結構支援借款節點注入與幾何佈局計算"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
擴充 `TreemapItem` 定義與資料管線，支援注入借款節點（`market: 'DEBT'` / `id: 'DEBT_TWD'`），並驗證 Squarified Treemap 面積計算正確。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. `TreemapItem` 的 `market` 欄位型別擴充支援 `'DEBT'`。
- [x] 2. 當傳入借款資料且總負債額 $> 0$ 時，`TreemapChart` / `computeTreemapLayout` 能夠注入借款節點並正確計算正面積與權重。
- [x] 3. 若借款總額 $\le 0$，確保不產生任何借款節點（零借款穩健防禦）。
- [x] 4. 新增對應單元測試於 `src/utils/treemap.test.ts`。
