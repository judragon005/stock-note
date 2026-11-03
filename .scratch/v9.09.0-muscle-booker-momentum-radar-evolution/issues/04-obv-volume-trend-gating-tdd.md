# 04 — 復用 omniIndicatorEngine 之 OBV 能量潮資金流閘門 (OBV Gating TDD)

**What to build:**
補齊肌肉書僮核心指標 OBV，杜絕放量假突破：
1. 引用專案內現有之 `src/engine/omniIndicatorEngine.ts` 的 `calculateOBV(closes, volumes)`。
2. 在 `evaluateMuscleBookerAction` 中加入 OBV 趨勢過濾硬門檻：
   - 當 `obv.trend === 'FALLING'`（能量潮背離流出）時，禁止發布 `BUY` 訊號，強制降級為 `HOLD: 🟡 觀望 (OBV 資金背離流出)`。
   - 僅在 `obv.trend === 'RISING' || obv.trend === 'FLAT'` 時，才允許買點確立。
3. 撰寫單元測試驗證放量突破但 OBV 背離時被成功攔截。

**Blocked by:** Ticket 03

**Status:** open

- [x] 在 `muscleBookerEngine.ts` 引入 `calculateOBV`
- [x] 在單股指標掃描中計算 OBV 時序與趨勢
- [x] 在 `evaluateMuscleBookerAction` 中納入 `obvTrend` 審查閘門
- [x] 編寫單元測試驗證 OBV 下降趨勢時買進訊號被降級

