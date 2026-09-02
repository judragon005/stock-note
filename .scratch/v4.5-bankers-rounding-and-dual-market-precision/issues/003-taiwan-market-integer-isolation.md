# Issue #3: 台股市場集保整數無條件捨去與會計精度嚴格隔離

- **狀態**：`READY_FOR_AGENT`
- **標籤**：`feature`, `taiwan`, `isolation`
- **關聯規格**：`docs/specs/0028-bankers-rounding-and-dual-market-precision-system.md` (AC-3)

## 任務描述 (Description)
確保台股 (TWD) 市場在股息發放、減資退款與帳戶餘額計算上，嚴格遵循台灣集保/券商之整數無條件捨去 (Math.floor) 慣例，絕不與美股小數點演算法混淆。

## 驗收標準 (Acceptance Criteria)
1. `calculateDividendCash` 與 `normalizeCurrencyPrecision` 在 `currency === 'TWD'` 時嚴格執行 `Math.floor` 整數運算。
2. `calculateAccountBalances` 台股帳戶餘額精確維持整數。
3. 單元測試驗證台美市場雙軌隔離，互不干擾。
