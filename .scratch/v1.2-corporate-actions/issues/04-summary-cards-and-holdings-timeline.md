# 04 — 資產總覽分項加總與持股歷程時間軸展開 (Summary Cards & Holdings Timeline)

**What to build:**
升級 `src/components/SummaryCards.tsx` 與 `src/components/HoldingsTable.tsx`。在資產總覽卡片清晰分項呈現「累計股息」與「累計減資退款」；在持股庫存表中標記「⚡ 公司行動」，分離展示原始買入股數與累計配股，並支援可折疊/展開之「股權異動時間軸 (Timeline)」。

**Blocked by:** 01 — 時序回溯與公司行動會計核心, 02 — 交易動態表單與歷史明細公司行動升級

**Status:** completed

- [x] `SummaryCards.tsx` 分項呈現累計股息與資本返還（累計減資退款）。
- [x] `HoldingsTable.tsx` 股數欄呈現目前持有股數、累計配股與原買入股數。
- [x] `HoldingsTable.tsx` 支援列展開，以時序時間軸呈現個股所有歷史公司行動與交易軌跡。
