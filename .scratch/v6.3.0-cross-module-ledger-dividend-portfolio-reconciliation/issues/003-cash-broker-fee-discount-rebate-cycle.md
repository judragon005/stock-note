# Ticket #003: [P2] 券商手續費次月退佣與交易當日扣款隔離標記

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
解決券商在 $T+2$ 日扣除全額手續費 (0.1425%)，次月才整筆退還折讓款時，導致交易交割金額與銀行存摺不一致的對帳痛點。

## 任務清單 (Tasks)
- [x] 在 `src/types/stock.ts` 與 `src/engine/cashLedgerEngine.ts` 中：
  - 手續費退佣以專屬科目 `FEE_REBATE` 記錄，並支援關聯月份或備註。
  - 歷史交易記錄維持「成交當下原始扣款」真實性。
- [x] 撰寫測試驗證退佣入帳後現金總資產與各帳戶餘額正確更新。

## 驗收條件 (Acceptance Criteria)
- [x] 退佣入帳不竄改歷史交易成本，現金帳戶真實對齊。使用者可自由選擇手續費當期淨折讓或次月退佣，與各券商存摺 100% 勾稽。
