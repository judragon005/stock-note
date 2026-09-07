# 03 — 入帳日期欄位主次並列展示 UI 系統 (Dividend Table Primary-Secondary Dual Display UI)

**What to build:**
於明細表格第一欄「入帳日期」實作「主次並列展示（Primary-Secondary Dual Display）」設計。主視覺醒目呈現實際到帳日期與預約標籤，副視覺標註除息基準日，讓投資人核對銀行交割存摺與追蹤除息週期一目了然。

**Blocked by:** 02 — 歷史現金股利明細列表依有效入帳日倒序排序

**Status:** closed

## 驗收標準 (Acceptance Criteria)
- [x] 表格第一欄單元格主字體醒目顯示 `effectivePayDate`（色票 `#34d399`，`fontSize: 0.85rem`、`fontWeight: 700`）。
- [x] 當 `effectivePayDate > todayStr` 時，主日期右側呈現醒目琥珀色「預約待入」標籤。
- [x] 主日期下方以微縮灰階字體顯示「`📅 除息: YYYY-MM-DD`」（色票 `#94a3b8`，`fontSize: 0.7rem`），兩者垂直間距 2px。
- [x] 2886 兆豐金顯示主視覺 `2026-09-04`，副視覺 `除息: 2026-08-13`。
- [x] 2890 永豐金顯示主視覺 `2026-08-24`，副視覺 `除息: 2026-07-23`。
