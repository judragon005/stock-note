# 04 — 現金流時態標籤解耦與各月份長條圖口徑清晰化 (Cashflow Temporal Decoupling & Explicit Labeling)

**Parent:** https://github.com/judragon005/stock-note/issues/539

**What to build:**
在頂部 `DividendCalendarCard.tsx` 中加入清楚的時間維度標籤（`[滾動未來 12 個月: YYYY/MM ~ YYYY/MM]`），明確解耦與下方「2026 各月份分佈長條圖（自然年）」的口徑差異。提供清楚視覺對齊引導，消除使用者對兩處數字總和不一致的認知困惑。

**Blocked by:** 03 — 雙軌應收股利與預約交易聯集中樞整合 (Unified Dividend Receivable Reconciliation Hub)

**Status:** ready-for-agent

- [ ] 在 `DividendCalendarCard.tsx` 標題處展示滾動預估之起迄月份區間標籤
- [ ] 檢視長條圖 Tooltip 與卡片說明文字，確保雙方之口徑（自然年度 vs 滾動 12 個月）界定明確
- [ ] 編寫/更新 `DividendCalendarCard.test.tsx` 驗證時態標籤正確渲染
