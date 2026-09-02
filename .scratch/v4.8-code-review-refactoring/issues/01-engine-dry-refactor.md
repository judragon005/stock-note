# Ticket 01: 引擎層判定去重與帳戶工廠函式 (Engine DRY Refactoring)

## 需求說明
- 抽取 `createEmptyAccountSummary(accountId, accountName, currency)` 工廠函式。
- 抽取 `isPendingOrFutureTransaction(tx, todayStr)` 統一在途判定邏輯。
- 在 `calculateAccountBalances`、`calculateTradingBuyingPower`、`groupPendingSettlementsByTimeline` 全面替換使用。

**Status:** completed

- [x] 實作 `createEmptyAccountSummary` 並消除 14 欄位重複初始化。
- [x] 實作 `isPendingOrFutureTransaction` 並消除三重重複判定。
- [x] 單元測試 100% 綠燈通過。
