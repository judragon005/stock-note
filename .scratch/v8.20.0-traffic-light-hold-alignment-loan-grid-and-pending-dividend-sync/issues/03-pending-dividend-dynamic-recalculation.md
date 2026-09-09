# Issue 03: 未到除息日預估股息依最新持股動態重算機制

## 狀態

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`engine`, `bug`, `dividend`, `cash-ledger`

## 需求說明

1. 在 `cashLedgerEngine.ts` 或交易同步流程中，針對 `trade.type === 'DIVIDEND'` 且 `today < (trade.exDate || trade.date)` 之未到期除息紀錄，動態回溯計算除息日前一日截至當前最新買賣交易之在籍持股。
2. 若持股因買賣變更，自動動態更新該筆除息在現金流水帳本中的金額與二代健保補充保費，修正台積電等標的之股息金額錯誤。
3. 若持股在除息日前已被全數賣出清空，流水帳金額自動更新為 0。

## 實作成果

- 已實作 `reconcilePendingDividendTrades` 函式，專注處理 `today < exDate` 之預估除息交易。
- 整合進 `syncTradesWithCashTransactions` 與 `App.tsx` 交易變更生命週期（載入、新增、修改、刪除、公司行動補登）。
- 若尚未除息且持股變動，自動依每股配息與除息前一日最新庫存重算毛額、二代健保補充保費與實收淨額；已除息歷史紀錄嚴格維持歷史事實不變。
- 新增 3 組單元測試 100% 綠燈通過。
