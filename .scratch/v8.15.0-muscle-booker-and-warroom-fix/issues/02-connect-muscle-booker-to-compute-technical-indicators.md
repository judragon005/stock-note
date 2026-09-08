# Ticket #2: 打通 computeTechnicalIndicators 的肌肉書僮計算鏈

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `Engine` · `MuscleBooker` · `Indicators` · `TDD`
- **關聯 PRD**：[docs/specs/0096-muscle-booker-workspace-and-war-room-styling-fix-spec.md](../../../docs/specs/0096-muscle-booker-workspace-and-war-room-styling-fix-spec.md)
- **優先級**：`P0`

---

## 1. 任務目標
1. 於 `src/engine/technicalIndicatorEngine.ts` 中：
   - 在 `computeTechnicalIndicators` 函式內部整合 `calculateMuscleIndicators(candles)`。
   - 將計算結果中的 `boxStatus`、`isBottomPenetration`、`ma20DeductionSlope`、`isBollingerSqueeze` 注入回傳的 `TechnicalIndicators` 物件中。
2. 補齊對應之單元測試，驗證傳入符合型態之日 K 線時能正確萃取出肌肉書僮膠囊。

## 2. 驗收標準
- [x] 傳入包含三日箱頂突破之 K 線時，`computeTechnicalIndicators` 回傳 `boxStatus === 'BREAKOUT_UP'`。
- [x] `extractHoldingSignals` 可順利輸出「🔥 箱頂突破」膠囊。
- [x] 單元測試通過率 100%。
