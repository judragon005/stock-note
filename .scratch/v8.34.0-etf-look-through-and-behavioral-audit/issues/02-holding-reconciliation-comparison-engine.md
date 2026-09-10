# 02 — 逐檔庫存差額比對引擎 (Holding Reconciliation Comparison Engine)

**What to build:**
系統接收當前計算出的理論持倉 (`HoldingPosition[]`) 與解析後的券商快照 (`BrokerSnapshotItem[]`)，自動以標的代碼進行雙向全量比對。將所有比對結果精確分類為四種對賬狀態：`MATCH` (完全吻合)、`DIFF_SHARES` (股數不符，如系統 1000 股 vs 券商 1005 股，差額 +5)、`MISSING_IN_SYSTEM` (券商有持股但系統完全無記錄) 以及 `ORPHAN_IN_SYSTEM` (系統有持股但券商已無持股)。產出結構化之 `ReconciliationReport`。

**Blocked by:** 01 — 券商快照資料模型與剪貼簿/CSV 文字解析器 (Snapshot Parser & Schema)

**Status:** ready-for-agent

- [ ] 對比演算法支援台股與美股大小寫正規化代碼比對
- [ ] 能精確計算股數差異 `diffShares = actualShares - expectedShares`
- [ ] 輸出完整 `ReconciliationReport`，包含比對總數、吻合數、差異數與逐檔明細
- [ ] 單元測試驗證 4 種比對狀態邊界案例覆蓋率 100%
