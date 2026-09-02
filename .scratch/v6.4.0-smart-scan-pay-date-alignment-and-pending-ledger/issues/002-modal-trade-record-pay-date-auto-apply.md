# 002 — modal-trade-record-pay-date-auto-apply

**What to build:**
在 `CorporateActionScannerModal` 套用補登時，自動將 `exDate`（除息基準日）與 `payDate`（預估發放日）完整寫入生成的 `TradeRecord`，並在備註清晰標明除息與入帳雙日期。

**Blocked by:** 001-corporate-action-scanner-pay-date-injection

**Status:** ready-for-agent

- [x] `CorporateActionScannerModal.tsx` 在生成補登 `TradeRecord` 物件時，將 `exDate` 設為除息日 (`a.date`)，將 `payDate` 設為 `a.payDate || estimatePaymentDate(a.date, a.market)`
- [x] 補登交易備註 (`note`) 同步包含基準日持有股數、除息日與預估發放日資訊
- [x] 確保手動勾選多筆不同標的時，各筆交易之雙日期精準無漏項
