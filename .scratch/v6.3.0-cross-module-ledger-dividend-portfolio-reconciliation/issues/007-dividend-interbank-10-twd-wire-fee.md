# Ticket #007: [P1] 臺股現金股利 10 元跨行匯費內扣與二代健保精確對齊

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
解決台股配息入帳時因非保管行內扣 10 元跨行匯費，導致實收現金與銀行存摺永遠差 10 元的對帳落差。

## 任務清單 (Tasks)
- [x] 在 `src/types/dividend.ts` 與 `ReceivableDividend` 中加入 `estimatedWireFee`（預設 10 元，可於券商/標的設定中豁免）。
- [x] 在 `src/engine/receivableDividendEngine.ts` 中精確扣除：
  $$\text{Net} = \max(0, \text{Gross} - \text{NHI Tax} - \text{Wire Fee})$$
- [x] 撰寫單元測試驗證扣除 10 元匯費後之實收淨額。

## 驗收條件 (Acceptance Criteria)
- [x] 實收現金股息與銀行交割存摺金額 100% 精確對齊至個位數。
