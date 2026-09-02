# Ticket #005: [P0] 移除除息日前持股 Fallback 漏洞（嚴格排除除息日後買進者）

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)
- ADR: [docs/adr/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation.md](file:///d:/APP/股票紀錄/docs/adr/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation.md)

## 目標 (Goal)
修復 `receivableDividendEngine.ts` 中當 `sharesHeld <= 0` 誤抓當前庫存 `holding.shares` 的重大漏洞，杜絕除息日後買進者被誤算享有該次股利。

## 任務清單 (Tasks)
- [x] 在 `src/engine/receivableDividendEngine.ts` 中移除 fallback 賦值：
  ```typescript
  // 移除：if (sharesHeld <= 0 && holding.shares > 0) { sharesHeld = holding.shares; }
  ```
- [x] 若除息日前一日持股 $\le 0$，嚴格判定無除息資格，直接 `continue` 跳過該事件。
- [x] 撰寫單元測試 `receivableDividendEngine.test.ts`：
  - 測試案例：在 2026-08-14 買進 2886 兆豐金（除息日為 2026-08-13），驗證應收股利列表長度為 0。

## 驗收條件 (Acceptance Criteria)
- [x] 除息日之後買進的股票，在應收股利與除權息行事曆中絕不誤現。
