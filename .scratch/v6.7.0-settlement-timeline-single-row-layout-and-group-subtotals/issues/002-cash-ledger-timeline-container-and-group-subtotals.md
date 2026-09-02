# 002 — cash-ledger-timeline-container-and-group-subtotals

**What to build:**
更新 `src/components/CashLedgerWorkspace.tsx` 中的「在途資金交割時序排程 (Settlement Timeline)」看板容器：
1. 將內部項目容器由多欄自適應 CSS Grid（`repeat(auto-fit, minmax(280px, 1fr))`）調整為垂直單行條列容器（`display: flex; flex-direction: column; gap: 6px;`）。
2. 在五大時序分組（🔴 已逾期 / ⚡ 今日 / 📅 明日 / 🗓️ 本週 / 🔮 未來）標題右側動態計算並呈現「分組淨現金流小計」（`小計: +NT$ ...` 或 `小計: -NT$ ...`）。
3. 確保組內嚴格遵循交割日由近至遠升冪排序。

**Blocked by:** 001 — pending-settlement-card-single-row-component-refactoring

**Status:** closed

- [x] 調整時序看板分組項目容器為單行垂直條列佈局
- [x] 在分組標題右側計算並渲染多幣別折算之分組淨現金流小計
- [x] 驗證組內依交割日期由近至遠升冪排序
