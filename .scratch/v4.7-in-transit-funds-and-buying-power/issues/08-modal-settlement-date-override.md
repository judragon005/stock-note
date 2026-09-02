# 08 — 交易彈窗自訂交割日與狀態覆寫 (Modal Settlement Date Override)

**What to build:**
在新增與編輯現金流水彈窗 (`AddTransactionModal` / `CashLedgerWorkspace`) 中：
- 增加「預計交割日 (Settlement Date)」日期選擇器（預設自動帶入推算交割日）。
- 增加「交割狀態」下拉選單（`⏳ 待交割 (Pending)` / `✅ 已交割 (Settled)`）。
- 支援使用者因應特殊假期、颱風假或銀行延誤手動覆寫交割日與狀態，並正確持久化至資料庫。

**Blocked by:** 06-list-badges-and-filter-toolbar, 07-timeline-drawer-and-toggle

**Status:** completed

- [x] 表單支援使用者自訂「預計交割日」與「交割狀態 (已交割/待交割)」覆寫。
- [x] 在日期或帳戶變更時，依市場規則自動動態推算預設交割日。
- [x] 跨帳戶換匯/調撥模式支援雙邊獨立或連動交割狀態處理。
- [x] 驗證表單提交後正確更新現金流水記錄並連動計算核心。
