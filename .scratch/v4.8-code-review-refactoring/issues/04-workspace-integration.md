# Ticket 04: CashLedgerWorkspace 與彈窗整合 (Workspace Integration)

## 需求說明
- 在 `CashLedgerWorkspace.tsx` 引入 `PendingSettlementCard`，精簡內嵌 JSX。
- 驗證彈窗中切換「跨帳戶換匯」或「質押借款」時自動預設在途交割日。
- 驗證一鍵核銷狀態即時連動。

**Status:** completed

- [x] `CashLedgerWorkspace.tsx` 整合 `PendingSettlementCard`。
- [x] 驗證時序面板與流水清單連動正確。
- [x] 執行全量測試 100% 綠燈。
