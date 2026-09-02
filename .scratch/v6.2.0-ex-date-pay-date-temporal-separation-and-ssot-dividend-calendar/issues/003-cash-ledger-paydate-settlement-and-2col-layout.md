# Ticket #003: 現金帳發放日交割結算與每行固定 2 欄大器排版

## 關聯規格
- PRD: [docs/specs/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar-spec.md](file:///d:/APP/股票紀錄/docs/specs/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar-spec.md)
- ADR: [docs/adr/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar.md](file:///d:/APP/股票紀錄/docs/adr/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar.md)

## 目標 (Goal)
將現金帳流水交割日與發放日 (`payDate`) 嚴密綁定，並將除權息行事曆升級為每行固定 2 欄、內部 2x2 舒展排版。

## 任務清單 (Tasks)
- [x] 在 `cashLedgerEngine.ts` 中，`DIVIDEND_PAYOUT` 交割日嚴格設為 `payDate`，發放日前標記為 `PENDING` 在途款，不計入可用現金。
- [x] 在 `DividendLogView.tsx` 中，將外層網格設為每行固定 2 欄（`minmax(460px, 1fr)`），內部參數設為 2 列 2 欄網格。

## 驗收條件 (Acceptance Criteria)
- [x] 現金帳可用現金不被在途股息虛增。
- [x] 卡片對稱整齊，文字 0 折行切碎，數值清晰大方。
