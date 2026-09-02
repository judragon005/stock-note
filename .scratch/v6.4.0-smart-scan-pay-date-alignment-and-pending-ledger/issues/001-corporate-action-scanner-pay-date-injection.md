# 001 — corporate-action-scanner-pay-date-injection

**What to build:**
擴充 `ScannedCorporateAction` 與 `RawCorporateEvent` 模型，讓智慧掃描在解析全市場除息事件時自動帶入預估發放日 (`payDate`)，並在單元測試中驗證除息日前一日在庫股數與發放日計算正確。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] `ScannedCorporateAction` 介面擴充 `payDate?: string` 欄位
- [x] `scanCorporateActions` 於生成 `DIVIDEND` 現金股利行動時自動計算並帶入 `payDate`（優先引用官方公告日曆，其次依台股 T+28 / 美股 T+21 推算）
- [x] 驗證除息日前一日在庫股數計算與除權配股時序回溯正確無誤
- [x] 擴充 `src/engine/corporateActionScanner.test.ts` 單元測試覆蓋 `payDate` 生成邏輯
