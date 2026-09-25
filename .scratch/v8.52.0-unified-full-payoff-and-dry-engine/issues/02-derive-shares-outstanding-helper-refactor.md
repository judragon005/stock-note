# 子任務 02: 提取流通股數推導共用純函式 deriveSharesOutstanding (Debt #0038)

- **狀態**：`CLOSED` (已完成)
- **所屬 Epic**：[Ticket #0139](0139.md)
- **關聯技術債**：[Debt #0038](../../../docs/debts/0038-derive-shares-outstanding-helper-refactor.md)

## 任務細項
1. 於 `src/engine/keyMetricsEngine.ts` 導出 `deriveSharesOutstanding(recordOrRecords?, overrideShares?)`。
2. 於 `src/engine/keyMetricsEngine.test.ts` 新增專屬單元測試，驗證手動覆寫、資本額推導、淨利/EPS 反推與保底 10 億股。
3. 重構 `calculateFcfYield` 與 `calculateDcfValuation`，改為直接調用 `deriveSharesOutstanding`。
4. 重構 `src/components/analysis/AnalysisMetricView.tsx` 內零星的流通股數推導。
5. 確保估值模型測試 100% 綠燈。
