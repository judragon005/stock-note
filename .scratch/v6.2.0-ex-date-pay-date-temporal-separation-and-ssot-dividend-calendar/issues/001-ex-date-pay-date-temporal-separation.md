# Ticket #001: 除息日與發放入帳日時序徹底分離與線性生命週期引擎

## 關聯規格
- PRD: [docs/specs/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar-spec.md](file:///d:/APP/股票紀錄/docs/specs/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar-spec.md)
- ADR: [docs/adr/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar.md](file:///d:/APP/股票紀錄/docs/adr/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar.md)

## 目標 (Goal)
建立嚴密的除息日 ($Ex\text{-}Date$) 與發放日 ($Pay\text{-}Date$) 雙軌生命週期，使除息日專注於假性虧損平滑補償，發放日專注於現金實質入帳。

## 任務清單 (Tasks)
- [x] 在 `receivableDividendEngine.ts` 中落實純線性生命週期：
  - $today < exDate \implies \text{UPCOMING\_EX}$ (📢 即將除息)
  - $exDate \le today < payDate \implies \text{PENDING\_PAYMENT}$ (⚡ 除息待入帳 / 平滑假性虧損)
  - $today \ge payDate \implies \text{SETTLED}$ (✅ 實質落袋)
- [x] 在 `DividendLogView.tsx` 歷史明細表中過濾掉 $payDate > today$ 未到期項目，使其僅存在於頂部行事曆。

## 驗收條件 (Acceptance Criteria)
- [x] 即將除息與待入帳款項狀態切換精準，已發放款項自動轉入歷史已結算明細。
