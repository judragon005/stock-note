# 01 — 風益比分母最小防守緩衝 (Min Risk Buffer TDD)

**What to build:**
修復 `muscleBookerEngine.ts` 中微小分母引發的虛胖風益比問題（消除剛突破 0.1 元即產生 16R~20R 的虛假幻覺）：
1. 在 `evaluateMuscleBookerAction` 中引入動態最小風險緩衝：
   $$\text{MinRiskBuffer} = \max(\text{CurrentPrice} \times 0.02, (\text{atr?.atr14} \ ?? \ 0) \times 1.0)$$
2. 計算實際風險分母：$\text{EffectiveRisk} = \max(\text{StructuralRisk}, \text{MinRiskBuffer})$，杜絕分母趨近於 0。
3. 撰寫單元測試覆蓋突破 0.05 元、0.1 元極微小價差情境，驗證 R 倍數平穩收斂在真實可信區間 (2.0R~5.0R)。

**Blocked by:** None — can start immediately

**Status:** open

- [x] 在 `evaluateMuscleBookerAction` 擴充支援 `atr` 參數
- [x] 計算 `minRiskBuffer = Math.max(currentPrice * 0.02, (atr?.atr14 ?? 0) * 1.0)`
- [x] 計算 `effectiveRisk = Math.max(currentPrice - stopLoss, minRiskBuffer)`
- [x] 更新 `riskRewardRatioValue = Math.round((reward / effectiveRisk) * 10) / 10`
- [x] 編寫單元測試驗證微小突破時不產生虛胖超大 R 倍數

