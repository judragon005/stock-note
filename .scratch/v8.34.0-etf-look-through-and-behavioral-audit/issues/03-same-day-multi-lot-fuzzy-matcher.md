# 03 — 同日零股分批拆合智能匹配器 (Same-Day Multi-Lot Fuzzy Matcher)

**What to build:**
當使用者匯入券商匯總單（例如當天買進 1000 股），但系統在同一天同一標的已存在多筆零股記錄（例如 200 股 + 300 股 + 500 股）時，增強型去重匹配器能自動計算同日累計股數，識別出 $\sum \text{零股} = \text{整股}$ 之合單關聯。標記為 `SPLIT_LOT_MATCH`，並產出消解候選清單，避免系統將整筆 1000 股誤判為全新交易導致庫存重複虛增。

**Blocked by:** 02 — 逐檔庫存差額比對引擎 (Holding Reconciliation Comparison Engine)

**Status:** ready-for-agent

- [ ] 支援同日同一標的、同市場、同交易類別 (BUY) 的多筆零股加總聚合
- [ ] 判定 $\sum \text{existingShares} === \text{incomingShares}$，準確標記匹配
- [ ] 產出 `MultiLotMatchCandidate[]` 清單，包含關聯之既有歷史流水 id
- [ ] 單元測試驗證 2 筆、3 筆零股拆合匹配與金額邊界比對
