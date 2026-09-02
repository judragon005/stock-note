# Ticket #01: 量化指標引擎支援純自身數列計算 TDD (Standalone Quant Metrics Calculation TDD)

- **母票券**: [issue-0042.md](issue-0042.md)
- **版本**: v5.7.1
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/engine/quantMetrics.ts`
  - `src/engine/quantMetrics.test.ts`

---

## 任務描述
擴充 `calculateQuantMetrics` 或新增 `calculateStandaloneQuantMetrics`，使其在無基準數列傳入（或傳入空陣列）時：
1. 依然能計算自身投資組合的年化波動度 (`annualizedVolatility`)、夏普值 (`sharpeRatio`) 與最大回撤 (`portfolioMaxDrawdown`)。
2. 將依賴基準的指標（`alpha`、`beta`、`correlation`、`benchmarkMaxDrawdown`）安全回傳 `null` 或特定標記（如 `NaN` / `0` / 可選欄位），避免拋錯。
3. 撰寫單元測試驗證獨立計算行為。

---

## 驗收條件
- [ ] 當無基準數列傳入時，計算函式安全執行不拋錯。
- [ ] 自身夏普值、波動度、最大回撤精確算出。
- [ ] 單元測試 100% 綠燈覆蓋。
