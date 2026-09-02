# 任務 01: 歷史交易跨市場帳戶自動校正引擎與流水帳關聯更新

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: Core / Data Migration
- **優先級**: P0 (Phase 1)
- **對應 PRD**: SPEC-0024 (AC-4, AC-5)

## 任務描述
在 `storage.ts` 的 `validateAndMigrateTrades` 與資料讀取管道中，加入市場與帳戶一致性校驗。
當檢查到歷史交易之 `trade.market` 與其 `trade.accountId` 對應券商之 `account.market` 不一致（例如美股標的 SGOV 誤綁定台股券商永豐大戶投）時，自動修正為該市場對應的預設券商帳戶（如 `broker-us-default` 或嘉信理財），並同步更新自動生成之現金流水帳本關聯。

## 驗收標準 (Acceptance Criteria)
- [x] 擴充 `validateAndMigrateTrades(trades, accounts)`，建立 `accountMap` 進行跨市場帳戶匹配檢核。
- [x] 若交易的 `accountId` 所屬市場與 `trade.market` 不符，自動指派該市場之預設帳戶 ID（或該市場首個有效帳戶 ID）。
- [x] 若交易未設定 `accountId`，依照 `trade.market` 自動補齊預設帳戶 ID。
- [x] 自動重新觸發 `syncTradesWithCashTransactions`，使美股交割流水之 `accountId` 與帳戶名稱正確顯示為美股券商。
- [x] 撰寫 `storage.test.ts` 單元測試覆蓋跨市場帳戶校正邏輯，確保 100% 綠燈。
