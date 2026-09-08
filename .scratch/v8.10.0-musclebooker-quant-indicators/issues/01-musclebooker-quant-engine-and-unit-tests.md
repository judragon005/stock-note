# Issue #0091-01: 肌肉書僮短線波段量化運算核心與單元測試 (MuscleBooker Engine)

- **標籤**：`ready-for-agent` · `Architecture` · `Quant` · `MuscleBooker`
- **對應規格**：[PRD #0091](../../../docs/specs/0091-local-historical-indicators-and-external-backfill-engine-spec.md)
- **優先級**：`P1`

---

## 任務描述
實作純函式量化計算引擎 `src/engine/muscleBookerEngine.ts`，包含：
1. **箱子戰術（Darvas Box Theory）**：連續 3 日不破高確認箱頂，連續 3 日不破低確認箱底，輸出 `BREAKOUT_UP` / `BREAKOUT_DOWN` / `INSIDE_BOX`。
2. **均線扣抵值望遠鏡 (MA Deduction)**：計算 MA5 / MA20 扣抵價格，並依據 $C_t$ 與 $C_{t-N}$ 比較預判未來均線斜率 (`UP` / `FLAT` / `DOWN`)。
3. **「底穿上」假跌破型態偵測 (Bottom Penetration Rebound)**：盤中破線但收盤強勢站回支撐且留下影線之誘空反轉。
4. **布林通道極致壓縮 (Bollinger Squeeze)**：計算帶寬 $\text{BW}$，若帶寬 $\le 8\%$ 標記 `isSqueeze = true`。
5. **ATR 動態移動防守價**：計算 14 日 ATR 與 $\text{TrailingDefensePrice} = \text{近期最高價} - 2.5 \times \text{ATR}_{14}$。
6. **RS 相對強度**：相對於大盤基準之滾動超額報酬率與強弱評級。
7. **投量比計算**：扣除當沖虛胖水分之投信持股比重。

## 驗收條件 (Acceptance Criteria)
- [ ] 撰寫 `src/engine/muscleBookerEngine.test.ts`，所有量化公式測試案例 100% 通過。
