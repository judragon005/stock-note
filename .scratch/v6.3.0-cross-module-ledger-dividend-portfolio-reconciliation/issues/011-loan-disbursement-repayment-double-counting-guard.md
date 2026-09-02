# Ticket #011: [P2] 質押撥款/還款與手動出入金隔離與防重複入帳

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
防止質押撥款 (`LOAN_DISBURSEMENT`) 與手動「入金」同時登記導致可用現金重複翻倍。

## 任務清單 (Tasks)
- [x] 在 `src/engine/cashLedgerEngine.ts` 中支援 `LOAN_DISBURSEMENT` 與 `LOAN_REPAYMENT` 專屬科目。
- [x] 撰寫測試驗證質押撥款入帳現金帳本且清楚標註關聯質押合約。

## 驗收條件 (Acceptance Criteria)
- [x] 借貸撥款與還本在現金帳本中獨立歸類，不與銀行手動入金混淆。
