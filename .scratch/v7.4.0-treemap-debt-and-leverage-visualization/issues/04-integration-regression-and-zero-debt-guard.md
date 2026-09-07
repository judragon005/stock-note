---
title: "Ticket 04: 端到端整合驗證、純現貨零借款回歸測試與構建"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
完成 `src/App.tsx` 整合傳參，執行全專案單元測試與 TypeScript 編譯，確保零負債與多負債場景均無回歸破壞。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. `App.tsx` 正確將 `loans` / `exposureMetrics` 串接至 `AllocationChart`。
- [x] 2. `npm test` 100% 通過（45 個測試檔案、483 個測試案例全數通過）。
- [x] 3. `npm run build` 0 TypeScript 錯誤，完成生產版本打包。
