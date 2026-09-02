# Issue #2: 美股股息智慧補登帳戶綁定與 Schema 容錯修復

- **狀態**：`READY_FOR_AGENT`
- **標籤**：`bug`, `storage`, `dividends`
- **關聯規格**：`docs/specs/0027-cash-ledger-sorting-dividend-persistence-and-scoped-nav.md` (AC-3)

## 任務描述 (Description)
修復使用者補登美股股息後，重新整理瀏覽器（F5）導致股息記錄完全消失的嚴重問題。強化 `validateTradesSchema` 容錯機制，防止單筆缺失導致整庫交易回退；在智慧補登時自動填入預設帳戶，並於 App 載入時自動執行雙向對齊。

## 驗收標準 (Acceptance Criteria)
1. `validateTradesSchema` 採逐筆容錯，不因單筆瑕疵回傳 `null`。
2. `CorporateActionScannerModal.tsx` 補登建立交易時自動填入合法 `accountId`。
3. `App.tsx` 初始化時執行 `syncTradesWithCashTransactions`，保證股息流水與歷史交易 100% 同步。
4. 單元測試驗證容錯性與股息持久化保留。
