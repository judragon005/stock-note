# 04 — 多券商帳戶全鏈路嚴密隔離與調整單綁定 (Multi-Account Scope Isolation)

**What to build:**
切換券商帳戶時，XIRR、現金餘額、融資負債、交易時間軸與資產配置全景 100% 同步隔離。修復台股市場視圖下混入美金折算現金的錯誤。`ReconciliationModal` 盤點調整單自動鎖定當前所選帳戶。

**Blocked by:** 03 — 除息生命週期修復與在籍股利保護

**Status:** DONE

- [x] 切換至券商 A，不顯示券商 B 的現金、融資負債、批次明細與 XIRR
- [x] 台股市場模式下，現金指標僅顯示台幣餘額，不混入美元折合
- [x] 於券商 A 執行盤點對帳產生的調整單，`accountId` 嚴格記錄為券商 A
