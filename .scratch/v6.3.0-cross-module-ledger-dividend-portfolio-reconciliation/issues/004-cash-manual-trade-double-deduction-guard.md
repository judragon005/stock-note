# Ticket #004: [P2] 手動出入金與自動交割流水防重疊警示與多帳戶健全化

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
防止使用者買股票後又手動登記「出金」導致交割戶雙重扣款變負數，並消除無 accountId 之 Fallback 帳戶孤島。

## 任務清單 (Tasks)
- [x] 在現金帳本中為手動建立的 `DEPOSIT` / `WITHDRAWAL` 與自動交割流水建立清晰隔離標籤。
- [x] 在 `src/engine/cashLedgerEngine.ts` 中支援多帳戶結算與摩擦成本分析。
- [x] 撰寫測試驗證手動流水與股票自動流水獨立計算。

## 驗收條件 (Acceptance Criteria)
- [x] 現金帳本清楚區分「銀行實體出入金」與「股票買賣交割款」，杜絕重複記帳。手動扣款，無 accountId 交易可順暢歸入真實券商帳戶。
