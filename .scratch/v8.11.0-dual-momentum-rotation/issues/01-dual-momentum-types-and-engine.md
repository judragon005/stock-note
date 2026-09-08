# Issue #0092-01: 雙重動能評分核心演算法與單元測試 (Dual Momentum Engine)

- **標籤**：`ready-for-agent` · `Architecture` · `Quant` · `DualMomentum` · `Strategy`
- **對應規格**：[PRD #0092](../../../docs/specs/0092-dual-momentum-and-relative-strength-rotation-spec.md)
- **優先級**：`P1`

---

## 任務描述
實作純函式雙重動能引擎 `src/engine/dualMomentumEngine.ts`：
1. **型別定義**：在 `src/types/momentum.ts` 定義 `MomentumAssetMetric`、`DualMomentumSignal`、`MomentumUniverseConfig` 等。
2. **12-1M 加權動能計算**：$50\% \times R_{12M} + 30\% \times R_{6M} + 20\% \times R_{3M}$。
3. **相對動能排序**：在指定資產池內排序，標示冠軍資產。
4. **絕對動能避風港閘門**：
   - 冠軍標的 12M 總報酬大於無風險基準時，發出 `HOLD_TOP` 或 `SWITCH_ASSET`。
   - 所有標的低於無風險基準時，觸發 `MOVE_TO_CASH` 與 `safeHavenTriggered = true`。

## 驗收條件 (Acceptance Criteria)
- [ ] 撰寫 `src/engine/dualMomentumEngine.test.ts`，100% 覆蓋加權評分、強弱排序、避風港切換與邊界情況。
