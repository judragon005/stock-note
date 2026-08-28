# 任務票券 #01: 零負債槓桿歸零 0.00x 計算引擎修復與 TDD 單元測試

- **父層主票券**: [issue-0046.md](issue-0046.md)
- **狀態**: `OPEN`
- **分流標籤**: `ready-for-agent`
- **目標檔案**:
  - `src/engine/riskExposureEngine.ts`
  - `src/engine/riskExposureEngine.test.ts`

---

## 🎯 任務目標
1. 在 `calculatePortfolioExposure` 中，當無任何借款負債時 (`totalDebtTWD <= 0`)，淨槓桿率與總槓桿率一律評定為 `0.00`。
2. 保持風險等級判定為 `CONSERVATIVE` (穩健無槓桿)。
3. 更新單元測試 `riskExposureEngine.test.ts`，驗證無負債且現金充裕、無負債但現金為負（未補錄入金）等情境下，槓桿率均為 `0.00x`。
