# 02 — 目標價結構化天花板壓制 (Structural Target Price Cap TDD)

**What to build:**
修復 `muscleBookerEngine.ts` 中目標價純幾何測幅或硬性 8% 兜底脫離真實歷史阻力結構的問題：
1. 檢驗標的近 60 日歷史最高價：`const lookback60High = Math.max(...candles.slice(-60).map(c => c.high))`。
2. 若現價尚未越過 60 日高點，且 60 日高點低於純測幅目標，則以 60 日高點作為第一道保守反壓目標價：
   $$\text{TargetPrice} = \min(\text{Lookback60High}, \text{MeasuredMoveTarget})$$
3. 若現價已創近 60 日新高，則維持測幅目標價。
4. 撰寫單元測試覆蓋「區間內破底翻受制於歷史高點」與「創 60 日新高繼續測幅」情境。

**Blocked by:** Ticket 01

**Status:** open

- [x] 在 `evaluateMuscleBookerAction` 中傳入 `lookback60High` 結構參數
- [x] 計算測幅目標價與近 60 日高點天花板之最小值壓制
- [x] 確保破底翻時向上獲利空間受制於前波真實套牢量峰高點
- [x] 編寫單元測試驗證目標價壓制後的風益比動態重新評估

