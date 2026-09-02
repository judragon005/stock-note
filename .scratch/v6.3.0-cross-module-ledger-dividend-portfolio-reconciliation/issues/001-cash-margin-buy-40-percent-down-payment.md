# Ticket #001: [P0] 融資買進 (MARGIN_BUY) 40% 自備款精確扣款與 60% 負債連動

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)
- ADR: [docs/adr/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation.md](file:///d:/APP/股票紀錄/docs/adr/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation.md)

## 目標 (Goal)
解決融資買進時系統誤扣 100% 總價款的重大缺陷。臺股融資買進時，投資人僅需支付 40% 自備款與手續費，其餘 60% 由券商融資借貸。

## 任務清單 (Tasks)
- [x] 在 `src/types/stock.ts` 中確保 `TradeType` 支援 `MARGIN_BUY`（或交易記錄帶有 `isMargin: true` / `marginRate: 0.4`）。
- [x] 在 `src/engine/cashLedgerEngine.ts` 的 `syncTradesWithCashTransactions` 中：
  - 針對融資買進，現金扣款金額計算為：$-(\text{shares} \times \text{price} \times 0.4 + \text{fee})$。
  - 流水備註標記：`[融資買進: 自備款 40% 自扣，融資 60% 券商借款]`。
- [x] 撰寫單元測試 `cashLedgerEngine.test.ts`：
  - 驗證買進 100 萬元融資股票，現金僅扣 400,000 + 手續費。

## 驗收條件 (Acceptance Criteria)
- [x] 融資買進時，交割戶可用現金不再被扣除 100% 總交割款，精確扣除 40% 自備款。
