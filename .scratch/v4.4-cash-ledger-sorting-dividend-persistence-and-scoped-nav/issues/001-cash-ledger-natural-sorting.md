# Issue #1: 現金流水帳本 YYYY-MM-DD 自然日期與同日優先級穩健排序

- **狀態**：`READY_FOR_AGENT`
- **標籤**：`bug`, `cash-ledger`, `sorting`
- **關聯規格**：`docs/specs/0027-cash-ledger-sorting-dividend-persistence-and-scoped-nav.md` (AC-1, AC-2)

## 任務描述 (Description)
修復現金流水帳本在「舊 ➔ 新 (ASC)」與「新 ➔ 舊 (DESC)」模式下的日期排序錯亂問題。避免因時間戳轉換產生 `NaN` 導致股息等項目置頂，並確保同日發生之金流嚴格依照「先流入 ➔ 後稅費 ➔ 後流出」之合理邏輯呈現。

## 驗收標準 (Acceptance Criteria)
1. 在 `src/engine/cashLedgerEngine.ts` 實作標準 `sortCashTransactions` 函式。
2. 統一提取 `(a.tradeDate || a.date)` 進行 `localeCompare` 字串比較。
3. 同日權重嚴格支援 ASC 與 DESC 雙向自然排序。
4. 單元測試覆蓋跨年、跨月與同日多筆不同金流類別之排序行為。
