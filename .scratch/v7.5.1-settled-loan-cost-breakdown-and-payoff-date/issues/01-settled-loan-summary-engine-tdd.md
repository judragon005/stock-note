---
title: "Ticket 01: 核心計算引擎 calculateLoanSettledSummary 實作與 TDD 單元測試"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
在 `cashLedgerEngine.ts` 中新增純函數 `calculateLoanSettledSummary`，依據借貸項目與現金帳本精準計算結清還款日、借款天數、已付利息、設質登記費、集保撥券費、開辦手續費與總借貸成本。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. 支援從關聯現金流水帳中精準聚合實際繳納之利息與規費。
- [x] 2. 若現金流水缺漏時，能平滑備援推算利息並讀取借貸設定之三大規費。
- [x] 3. 正確解析結清還款日並計算起訖歷時天數。
- [x] 4. 於 `cashLedgerEngine.test.ts` 新增完整單元測試並 100% 通過。
