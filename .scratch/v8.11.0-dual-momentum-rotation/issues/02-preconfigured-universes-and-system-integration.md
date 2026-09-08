# Issue #0092-02: 預設資產池模板與系統整合驗收 (Universes & Integration)

- **標籤**：`ready-for-agent` · `Integration` · `Universe` · `Verification`
- **對應規格**：[PRD #0092](../../../docs/specs/0092-dual-momentum-and-relative-strength-rotation-spec.md)
- **優先級**：`P1`

---

## 任務描述
1. 內建三大經典資產池配置：全球宏觀全天候池 (Global Macro)、台股核心輪動池 (Taiwan Core)、美股科技板塊池 (US Tech)。
2. 提供輔助函式 `evaluateUniverseDualMomentum`，自動整合本地 `historicalOhlcv` / `historicalPrices` 走勢數據進行批量評估。
3. 執行全量 `npm test` 與 `npm run build`，確保零回歸。

## 驗收條件 (Acceptance Criteria)
- [ ] 預設資產池測試通過。
- [ ] 全專案單元測試 100% 通過，TypeScript 0 錯誤。
