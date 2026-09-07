# 01 — 官方除權息行事曆基準庫與發放日校正 (Official Dividend Calendar & Pay-Date Alignment)

**What to build:**
校正官方除權息常態日曆庫與 `estimatePaymentDate` 推算縫隙中 2890 永豐金之現金股利入帳發放日，確保系統內建之官方公司行動資料庫與官方公告 100% 精準對齊（2026-08-24）。

**Blocked by:** None — can start immediately

**Status:** closed

## 驗收標準 (Acceptance Criteria)
- [x] `estimatePaymentDate('2026-07-23', 'TW')` 回傳正確發放日 `2026-08-24`。
- [x] `OFFICIAL_DIVIDEND_CALENDAR` 中 2890 現金股利說明文字更新為 `(預計 2026-08-24 發放入帳)`。
- [x] `corporateActionScanner.ts` 中 2890 現金股利 `payDate` 更新為 `2026-08-24`。
- [x] 單元測試 `corporateActionScanner.test.ts` 相關發放日斷言同步更新且綠燈通過。
