# 04 — 在途時序分組與未來現金流預測 (Timeline Grouping Engine)

**What to build:**
實作在途項目時序分組函式 `groupPendingSettlementsByTimeline(transactions, accounts, todayStr)`：
- 萃取所有狀態為 `PENDING` 或 `settlementDate > today` 之現金流水。
- 依照交割日期與當前日期的差距，自動分組為：
  - `today` (今日交割)
  - `tomorrow` (明日交割)
  - `thisWeek` (本週即將交割，2~7 天內)
  - `future` (未來排程，> 7 天)
  - `overdue` (已逾期待核銷，< 0 天)
- 計算每個時間區段的「預計應收總額」、「預計應付總額」與「預計淨現金流」。

**Blocked by:** 03-trading-buying-power-engine

**Status:** completed

- [x] 實作時序分組純函式，回傳結構化的時序區塊清單。
- [x] 每筆項目包含關聯帳戶名稱、標的代號、金額正負與交割倒數天數。
- [x] 撰寫單元測試覆蓋各種時序區間（今天、明天、跨週末、跨月股息）分組正確性。
