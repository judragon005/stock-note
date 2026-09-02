# Ticket #013: [P1] 全組合 XIRR 支援無手動入金之 Mode B（實質歷史交易成本自適應探針）

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)
- ADR: [docs/adr/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation.md](file:///d:/APP/股票紀錄/docs/adr/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation.md)

## 目標 (Goal)
修復在存在自動交易現金流水但「未手動記錄 DEPOSIT」時，全組合 XIRR 因無外部現金流而求解崩潰或回傳 0 的致命問題。

## 任務清單 (Tasks)
- [x] 在 `src/engine/xirrCalculator.ts` 的 `calculatePortfolioXirr` 中新增自適應探針：
  - 統計 `manualDeposits = cashTransactions.filter(t => !t.relatedTradeId && (t.type === 'DEPOSIT' || t.category === 'DEPOSIT'))`。
  - 若 `manualDeposits.length === 0`，自動切換至 Mode B：以 `trades` 中的 BUY / SELL / DIVIDEND 實質金流建立 NPV 方程式。
- [x] 撰寫單元測試 `xirrCalculator.test.ts`：
  - 驗證純記錄股票買賣時，全組合 XIRR 100% 正常收斂並算出年化報酬率。

## 驗收條件 (Acceptance Criteria)
- [x] 無論使用者是否手動記帳入金，全組合 XIRR 均可自適應精確求解。
