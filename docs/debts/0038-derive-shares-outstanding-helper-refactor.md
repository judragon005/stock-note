# 技術債 0038: 提取流通股數推導共用輔助函式 (deriveSharesOutstanding)

- **建立日期**: 2026-09-14
- **解決日期**: 2026-09-25 (Spec 0139 / ADR #0139)
- **來源**: Code Review (Spec 0131 / PR #62)
- **狀態**: `RESOLVED` (已於 V8.52.0 完整解決)
- **優先級**: `P3 (Low)`
- **標籤**: `Refactor` · `DRY` · `KeyMetricsEngine` · `Valuation`

---

## 1. 現況與背景 (Context)

在 Spec 0131 (PR #62) 修復自由現金流報酬率 (FCF Yield) 與現金流折現 (DCF) 發行股數寫死 1000 萬股的過程中，於 `src/engine/keyMetricsEngine.ts` 內實現了第一性原理的流通股數推導邏輯：

1. 優先取最新季度資產負債表之資本額：`latest.balanceSheet?.capitalStock / 10`
2. 次級備援取損益表之稅後淨利與 EPS 反推：`latest.income?.netIncome / latest.income.eps`
3. 保底備援取基準值：`1,000,000,000`

目前此段推導代碼在 `calculateFcfYield` 與 `calculateDcfValuation` 兩個估值函式中各自重複實作了一次。

---

## 2. 潛在風險與問題 (Impact)

- **DRY 原則違背**：若未來針對海外股票（美股 ADR、無面額股）或無股本特殊標的調整股數推導邏輯時，容易遺漏其中一個函式，產生計算結果不一致的風險。
- **單元測試分散**：股數推導為純函式邏輯，應有專屬的單元測試縫隙覆蓋各類極端資料組合。

---

## 3. 建議改善方案 (Proposed Solution)

於 `src/engine/keyMetricsEngine.ts` 提取獨立公開純函式：

```typescript
export function deriveSharesOutstanding(
  recordOrRecords?: QuarterlyFinancialRecord | QuarterlyFinancialRecord[],
  overrideShares?: number
): number {
  if (overrideShares && overrideShares > 0) return overrideShares;
  const records = Array.isArray(recordOrRecords) ? recordOrRecords : (recordOrRecords ? [recordOrRecords] : []);
  const latest = records[0] || records[records.length - 1];
  if (!latest) return 1000000000;

  if (latest.balanceSheet?.capitalStock && latest.balanceSheet.capitalStock > 0) {
    return latest.balanceSheet.capitalStock / 10;
  }
  if (latest.income?.netIncome && latest.income.eps && latest.income.eps > 0) {
    return latest.income.netIncome / latest.income.eps;
  }
  return 1000000000;
}
```

並將 `calculateFcfYield` 與 `calculateDcfValuation` 改為直接調用此函式。

---

## 4. 解決與驗收標準 (Resolution Criteria)

- [ ] `keyMetricsEngine.ts` 匯出 `deriveSharesOutstanding` 純函式。
- [ ] `calculateFcfYield` 與 `calculateDcfValuation` 消除重複推導區塊。
- [ ] 既有 923 個單元測試持續 100% 綠燈。
