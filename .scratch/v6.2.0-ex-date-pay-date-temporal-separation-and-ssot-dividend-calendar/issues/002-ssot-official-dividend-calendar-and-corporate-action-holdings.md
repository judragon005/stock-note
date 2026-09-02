# Ticket #002: 官方除息行事曆 SSOT 與除權配股在籍股數回溯計算

## 關聯規格
- PRD: [docs/specs/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar-spec.md](file:///d:/APP/股票紀錄/docs/specs/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar-spec.md)
- ADR: [docs/adr/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar.md](file:///d:/APP/股票紀錄/docs/adr/0050-ex-date-pay-date-temporal-separation-and-ssot-dividend-calendar.md)

## 目標 (Goal)
建立官方除權息行事曆作為單一真實來源 (SSOT)，消除歷史帳本舊紀錄干擾，並以除息日前一日收盤在籍股數（完整計入配股等公司行動）精準計算股息。

## 任務清單 (Tasks)
- [x] 在 `receivableDividendEngine.ts` 與 `corporateActionScanner.ts` 中注入 `OFFICIAL_DIVIDEND_CALENDAR`。
- [x] 確保 2330 台積電、2886 兆豐金、00878、00923、9927 共 5 檔在席持股 100% 呈現。
- [x] 以 `getHoldingsAsOfDate(trades, prevDay, symbol)` 精準回溯除息前一日在籍持股，完整累加除權配股 (`STOCK_DIVIDEND`)、分割與減資。

## 驗收條件 (Acceptance Criteria)
- [x] 5 檔在席持股無漏項呈現，除息在籍股數與金額計算 100% 正確。
