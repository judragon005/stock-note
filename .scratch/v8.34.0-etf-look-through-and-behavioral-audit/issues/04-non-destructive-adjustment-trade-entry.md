# 04 — 無損審計調整單分錄生成與會計相容機制 (Non-Destructive ADJUSTMENT Trade Entry)

**What to build:**
當對賬發現真實券商股數與系統不符（例如除權息或減資零股誤差）時，系統能一鍵產出不可變的全新交易型別分錄 `type: 'ADJUSTMENT'`。若系統少算 5 股，產生 `shares: +5` 調整分錄；若系統多算，產生 `shares: -5` 調整分錄。核心持倉計算引擎 (`portfolioEngine`) 累計股數時將其納入以平整庫存，但此調整單成本基準計為 0，且不影響歷史不可變買賣分錄，不干擾 XIRR 與過去已實現損益計算。

**Blocked by:** 02 — 逐檔庫存差額比對引擎 (Holding Reconciliation Comparison Engine)

**Status:** ready-for-agent

- [ ] 擴充 `TradeRecord.type` 支援 `'ADJUSTMENT'` 型別契約
- [ ] 實作 `generateAuditAdjustmentTrade(...)` 工廠函數
- [ ] `portfolioEngine` 正確解析 ADJUSTMENT 分錄並更新持倉股數
- [ ] 單元測試驗證 ADJUSTMENT 分錄加入後持倉股數平平整且不污染歷史損益
