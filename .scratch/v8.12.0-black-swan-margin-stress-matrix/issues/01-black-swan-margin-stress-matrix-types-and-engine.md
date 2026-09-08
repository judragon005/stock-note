# Ticket #1: 多維情境壓力測試矩陣與除權息跳水模型 (Stress Matrix & Ex-Dividend Model)

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `Risk` · `Margin` · `StressTest` · `Engine`
- **關聯 PRD**：[docs/specs/0093-black-swan-margin-stress-matrix-spec.md](../../../docs/specs/0093-black-swan-margin-stress-matrix-spec.md)
- **優先級**：`P1`

---

## 1. 任務目標
實作除權息扣減跳水模型與多維動態情境壓力測試矩陣：
1. 支援除息每股現金股利 $D_{\text{cash}}$ 即時扣減定價。
2. 預設 6 種壓力情境（-5%、-10%、-20%、-30%、純除息、複合黑天鵝）。
3. 計算各情境下維持率、維持率點數變動與雙軌補款需求（償還本金 vs 補存現金擔保品）。

## 2. 驗收標準
- [ ] 定義 `StressScenarioConfig`、`StressScenarioResult`、`MarginStressMatrixResult` 等型別。
- [ ] 實作 `evaluateMarginStressMatrix` 核心運算函式。
- [ ] 撰寫單元測試覆蓋無借款、單一情境、複合情境及除息扣減計算。
