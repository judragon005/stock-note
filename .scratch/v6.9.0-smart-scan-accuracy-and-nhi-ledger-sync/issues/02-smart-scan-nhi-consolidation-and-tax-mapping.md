# 02 — 智慧補登二代健保補充保費合併扣繳試算與交易欄位映射 (Smart Scan NHI Consolidation & Tax Mapping)

**What to build:** 
智慧掃描在掃描台股現金股利時，自動連動同日之除權配股事件執行 `calculateConsolidatedTwNhiTax` 二代健保補充保費試算；純現金股利達 20,000 元門檻時亦自動試算 2.11% 補充保費。在 `ScannedCorporateAction` 擴充 `taxDeduction`，並於 `CorporateActionScannerModal` 套用補登時，將健保費精確寫入 `TradeRecord.tax`，實收金額寫入 `TradeRecord.cashAmount`。

**Blocked by:** Ticket 01 (需先獲取完整除權配股事件)

**Status:** RESOLVED

- [x] `ScannedCorporateAction` 介面擴充 `taxDeduction?: number` 欄位。
- [x] 智慧掃描在台股除息時，合併同日股票股利面額進行二代健保計算，得出 `taxDeduction` 與實收淨額 `estimatedCashAmount`。
- [x] `CorporateActionScannerModal.handleApply` 將 `taxDeduction` 寫入 `TradeRecord.tax`。
- [x] 永豐金持有 31,000 股情境：現金 34,100 + 配股 620 股面額 6,200 = 40,300，二代健保 850 元，實收 33,250 元，欄位映射 100% 正確。
- [x] 單元測試覆蓋並綠燈通過。
