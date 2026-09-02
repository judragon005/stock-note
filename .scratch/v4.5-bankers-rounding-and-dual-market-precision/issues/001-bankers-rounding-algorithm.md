# Issue #1: 銀行家捨入法 (Banker's Rounding / 奇進偶捨) 核心模組實作與單元測試

- **狀態**：`READY_FOR_AGENT`
- **標籤**：`feature`, `math`, `precision`
- **關聯規格**：`docs/specs/0028-bankers-rounding-and-dual-market-precision-system.md` (AC-1)

## 任務描述 (Description)
在 `src/utils/formatters.ts` 實作符合 IEEE 754 與美國證券會計 (US GAAP / Charles Schwab) 標準的 `bankersRound(num, decimalPlaces)` 函式。當小數處於中間點 `.5` 時，向最接近的偶數捨入，消除累積正向統計偏差。

## 驗收標準 (Acceptance Criteria)
1. `bankersRound(3.345, 2)` 回傳 `3.34`，`bankersRound(3.335, 2)` 回傳 `3.34`。
2. `bankersRound(0.045, 2)` 回傳 `0.04`，`bankersRound(0.035, 2)` 回傳 `0.04`。
3. 單元測試完整覆蓋奇數進位、偶數捨去與一般四捨五入邊界。
