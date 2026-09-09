# 交接記錄手冊 (Handoff Manual) - v8.12.0

## 1. 本次迭代目標
依據使用者指令啟動 **Phase 4**，完成精選技術債之核心風控引擎：
- **技術債 #0025 (P1)**：除權息與黑天鵝多維動態壓力測試矩陣與斷頭逃生模擬器 (Margin Stress Matrix & Black Swan Simulator)。
- 建立台股除權息跳水模型、多維情境壓力測試矩陣、單一/多標的斷頭臨界價格逆推求解器以及逃生救援雙軌計算器。

---

## 2. 產出成果與變更清單
- **PRD 規格書**：[docs/specs/0093-black-swan-margin-stress-matrix-spec.md](../../docs/specs/0093-black-swan-margin-stress-matrix-spec.md)
- **ADR 架構決策**：[docs/adr/0093-black-swan-margin-stress-matrix-and-liquidation-simulator.md](../../docs/adr/0093-black-swan-margin-stress-matrix-and-liquidation-simulator.md)
- **本地票券鏡像**：
  - `01-black-swan-margin-stress-matrix-types-and-engine.md` (`CLOSED`)
  - `02-liquidation-price-and-escape-plan-solvers.md` (`CLOSED`)
- **核心架構與型別定義**：
  - [src/types/marginStress.ts](../../src/types/marginStress.ts)：定義 `StressScenarioConfig`、`StressScenarioResult`、`LiquidationThresholdItem`、`EmergencyEscapePlan`、`MarginStressMatrixResult` 與預設情境清單 `DEFAULT_STRESS_SCENARIOS`。
  - [src/engine/marginStressMatrixEngine.ts](../../src/engine/marginStressMatrixEngine.ts)：純函式實作 `evaluateMarginStressMatrix`、`solveLiquidationThresholds` 與 `calculateEmergencyEscapePlan`。
  - [src/engine/marginStressEngine.ts](../../src/engine/marginStressEngine.ts)：re-export 矩陣模組，完全向後相容。
  - [src/engine/marginStressMatrixEngine.test.ts](../../src/engine/marginStressMatrixEngine.test.ts)：6 個單元測試 100% 通過。
- **技術債狀態更新**：
  - [docs/debts/0025-ex-dividend-and-black-swan-margin-stress-matrix.md](../../docs/debts/0025-ex-dividend-and-black-swan-margin-stress-matrix.md) 標記為 `RESOLVED`。
  - [docs/debts/README.md](../../docs/debts/README.md) 看板同步標註 `已於 v8.12.0 (ADR #0093) 完整解決`。
- **領域模型同步**：
  - [CONTEXT.md](../../CONTEXT.md) 擴充黑天鵝動態壓力測試矩陣與斷頭逃生模擬架構領域標準術語。

---

## 3. 測試與驗收指標
- **單元測試**：全專案 **54 個測試套件、595 個測試 100% 全數通過**。
- **構建檢查**：`tsc && vite build` **0 錯誤**，生產環境打包 Bundle 正常。
- **回歸風險**：0 回歸。既有質押維持率計算、雙重動能輪動、速率限制器等模組運作完全正常。
