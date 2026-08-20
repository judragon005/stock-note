# 02 — 交易動態表單與歷史明細公司行動升級 (Trade Modal Dynamic Forms & Trade History Table)

**What to build:**
升級 `src/components/TradeModal.tsx` 與 `src/components/TradeHistoryTable.tsx`。在手動錄入與編輯交易時，依據所選公司行動類別動態切換表單欄位（如配股率、分割比、減資退款、認購價），並自動依選擇之基準日調用 `getHoldingsAsOfDate` 帶出持股進行即時試算；升級交易歷史表格支援專屬色彩徽章與公司行動明細呈現。

**Blocked by:** 01 — 時序回溯與公司行動會計核心

**Status:** completed

- [x] `TradeModal.tsx` 支援 7 種交易/公司行動模式動態表單切換。
- [x] 自動依交易日期調用 `getHoldingsAsOfDate` 呈現「基準日當時持股」與「變動後預估股數/金額」即時試算。
- [x] `TradeHistoryTable.tsx` 擴充呈現公司行動專屬徽章、比例、退款與除權息基準日資訊。
