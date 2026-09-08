# 交接記錄手冊 (Handoff Manual) - v8.11.0

## 1. 本次迭代目標
依據使用者指令啟動 **Phase 3**，完成精選技術債之趨勢輪動核心：
- **技術債 #0027 (P2)**：雙重動能與跨資產趨勢輪動評分引擎 (Dual Momentum & Relative Strength Rotation Engine)。
- 建立 Gary Antonacci 雙重動能量化模型，包含 12-1M 長短加權綜合評分、跨資產相對動能排行榜與絕對動能現金避風港狀態機，為下一階段 **#0025 (黑天鵝動態壓力測試矩陣)** 與 **#0020 (宏觀戰情室)** 提供強大的趨勢跟隨與輪動決策引擎。

---

## 2. 產出成果與變更清單
- **PRD 規格書**：[docs/specs/0092-dual-momentum-and-relative-strength-rotation-spec.md](../../docs/specs/0092-dual-momentum-and-relative-strength-rotation-spec.md)
- **ADR 架構決策**：[docs/adr/0092-dual-momentum-and-relative-strength-rotation.md](../../docs/adr/0092-dual-momentum-and-relative-strength-rotation.md)
- **本地票券鏡像**：
  - `01-dual-momentum-scoring-engine-and-unit-tests.md` (CLOSED)
  - `02-dual-momentum-safe-haven-and-predefined-universes.md` (CLOSED)
- **核心架構與型別定義**：
  - [src/types/momentum.ts](../../src/types/momentum.ts)：定義 `MomentumAsset`、`DualMomentumSignal`、`DualMomentumUniverse`、`DualMomentumConfig` 與預設資產池常量 `DEFAULT_MOMENTUM_UNIVERSES`。
  - [src/engine/dualMomentumEngine.ts](../../src/engine/dualMomentumEngine.ts)：純函式實作 12-1M 加權動能計分、跨標的相對強弱排序、絕對動能檢驗與現金避風港狀態機。
  - [src/engine/dualMomentumEngine.test.ts](../../src/engine/dualMomentumEngine.test.ts)：5 個雙重動能核心單元測試 100% 通過。
- **技術債狀態更新**：
  - [docs/debts/0027-dual-momentum-and-relative-strength-rotation.md](../../docs/debts/0027-dual-momentum-and-relative-strength-rotation.md) 標記為 `RESOLVED`。
  - [docs/debts/README.md](../../docs/debts/README.md) 看板同步標註 `已於 v8.11.0 (ADR #0092) 完整解決`。
- **領域模型同步**：
  - [CONTEXT.md](../../CONTEXT.md) 擴充雙重動能與跨資產趨勢輪動架構領域標準術語。

---

## 3. 測試與驗收指標
- **單元測試**：全專案 **53 個測試套件、589 個測試 100% 全數通過**（新增 5 個雙重動能評分與輪動測試）。
- **構建檢查**：`tsc && vite build` **0 錯誤**，產出生產環境打包 bundle。
- **回歸風險**：0 回歸。既有交易簿、資產配置再平衡、速率限制器、肌肉書僮量化引擎完全相容且正常運行。
