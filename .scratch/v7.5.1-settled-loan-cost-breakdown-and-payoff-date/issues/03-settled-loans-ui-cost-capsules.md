---
title: "Ticket 03: CashLedgerWorkspace 已結清歷史卡片升級為官方術語成本透視膠囊"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
在 `CashLedgerWorkspace.tsx` 的「📜 歷史借貸與質押已結清紀錄」中，移除「未還本金: NT$ 0」，改為呈現「結清還款日」、「借款天數」、「總借貸支出成本」以及「已付利息、已付設質費、已付撥券費、已付手續費」之官方結構化膠囊。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. 呼叫 `calculateLoanSettledSummary` 取得完整財務拆解數據。
- [x] 2. 顯示結清還款日與歷時天數（如 `結清還款日: 2026-08-28 (歷時 31 天)`）。
- [x] 3. 呈現官方標準名稱之已付利息、設質登記費、集保撥券費與開辦手續費膠囊。
