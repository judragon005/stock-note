# Ticket #009: [P1] 質押借款每月定期實扣利息現金流水自動生成與對帳

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
解決質押借款僅有每日即時「應計利息 (Accrued Interest)」，但券商每月 20 號從銀行扣息時未自動生成現金扣款流水，導致交割戶餘額高於真實銀行的問題。

## 任務清單 (Tasks)
- [x] 在 `src/engine/cashLedgerEngine.ts` 中新增「質押每月利息流水自動產生器」：
  - 根據質押起息日與每月結息日，自動推算每月扣息紀錄（`FINANCING_FEE`）。
- [x] 撰寫測試驗證借款 100 萬（年利率 2.5%）每月自動生成約 2,083 元利息扣款。

## 驗收條件 (Acceptance Criteria)
- [x] 質押利息按月精確扣款，現金帳本與銀行真實存款同步。
