# 03 — 卡片 3 筆數與金額數學閉環對齊 (Card 3 Mathematical Closure & Section Sync)

**What to build:**
重構 `DividendLogView` 與 `DividendKpiSummary` 的聚合過濾口徑，確保卡片 3（待入帳除息股利）的右上角筆數 Badge 與主金額數字達到 100% 數學一致（`Count > 0` 當且僅當 `Amount > 0`），徹底消除「4 筆待入帳」但金額為「+NT$ 0」之矛盾。同時將下方的「除息待入帳行事曆專區」與卡片 3 口徑完全對齊，同步納入待核實（`DUE_FOR_RECONCILIATION`）款項。

**Blocked by:**
02 — 根除時序黑洞：發放日已過待核對狀態機結轉 (Due-for-Reconciliation State Machine Transition)

**Status:** done

- [x] 於 `src/components/DividendLogView.tsx` 統一 `activeReceivables` 之過濾邏輯：僅納入狀態為 `PENDING_PAYMENT`、`OVERDUE` 或 `DUE_FOR_RECONCILIATION` 且 `estimatedNetDividendInTWD > 0` 之項目。
- [x] 傳入 `DividendKpiSummary` 的 `receivablePendingCount` 與 `totalReceivableTWD` 嚴格來自同一 `activeReceivables` 陣列，達成數學閉環。
- [x] 同步更新下方面板標題與列表過濾條件，確保列表呈現的筆數與卡片 3 完全相同。
- [x] 撰寫單元測試驗證卡片 3 在各種狀態（包含無效/0元記錄）下的渲染健全度，杜絕 Count=4 且 Sum=0 的異常重現。
