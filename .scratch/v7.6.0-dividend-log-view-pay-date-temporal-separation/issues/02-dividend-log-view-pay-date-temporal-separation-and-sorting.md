# 02 — 歷史現金股利明細列表依有效入帳日倒序排序 (Dividend Log View Pay-Date Temporal Separation & Sorting)

**What to build:**
重構「歷史現金股利入帳明細」之排序機制，確立以「有效入帳發放日 (`effectivePayDate`)」由新到舊倒序排序為唯一核心主軸，消除以除息基準日排序造成的金流時序錯亂。

**Blocked by:** 01 — 官方除權息行事曆基準庫與發放日校正

**Status:** closed

## 驗收標準 (Acceptance Criteria)
- [x] 計算每筆股利交易之 `effectivePayDate = t.payDate || estimatePaymentDate(t.exDate || t.date, t.market)`。
- [x] 明細列表排序優先依 `effectivePayDate` 降冪倒序排列；若入帳日相同則依除息基準日倒序。
- [x] 即便某筆交易除息日較早，但若其發放日較晚（如 2890 入帳日 8/24 相對 0050 入帳日 8/15），2890 必須正確排在前面。
- [x] 關鍵字搜尋過濾後之資料集依然嚴格依有效入帳日倒序排列。
