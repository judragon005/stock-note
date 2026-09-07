---
title: "Ticket 01: 核心計算引擎三大規費 0 值防禦與 fallback 修復 (TDD)"
labels: ["completed", "bug"]
---

## 🎯 任務目標
在 `cashLedgerEngine.ts` 的 `calculateLoanSettledSummary` 中修復三大規費判定邏輯，確保 `pledgeRegistryFee: 0` 時不被 `pledgeFee: 53` 污染覆蓋，並撰寫 TDD 單元測試。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. 若 loan 身上明確登錄三大規費，嚴格以各項目明細為單一事實來源 (SSOT)，明確為 0 即為 0。
- [x] 2. 於 `cashLedgerEngine.test.ts` 加入驗證測試並 100% 通過。
