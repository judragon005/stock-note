# 子任務 #01: 量化指標動態診斷引擎與型別 TDD (Diagnosis Engine TDD)

- **所屬迭代**: v5.7.2
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **關聯主票券**: [issue-0043.md](issue-0043.md)
- **目標檔案**:
  - `src/types/stock.ts`
  - `src/engine/quantMetrics.ts`
  - `src/engine/quantMetrics.test.ts`

---

## 🎯 任務目標

1. 在 `src/types/stock.ts` 中定義 `DiagnosisHealthLevel`、`MetricDiagnosis` 與 `QuantDiagnosisMap` 型別。
2. 遵循 TDD 紅綠循環，在 `src/engine/quantMetrics.test.ts` 中撰寫各指標臨界值測試案例。
3. 在 `src/engine/quantMetrics.ts` 中實作 `getQuantMetricDiagnosis(metrics, benchmarkLabel)` 函式，支援 Alpha, Beta, Sharpe, MDD, Volatility 5 大指標的原理、公式、健康度評級、機構語氣診斷與策略建議。

---

## 📋 驗收條件

- [ ] 型別定義完整且無編譯錯誤。
- [ ] 5 大指標的臨界區間（含正值、負值、無基準狀態）皆有對應之評級標籤與診斷。
- [ ] 單元測試 `quantMetrics.test.ts` 100% 綠燈通過。
