# 05 — 復用 omniIndicatorEngine 之 MACD 0 軸多頭主控閘門 (MACD 0-Axis Gating TDD)

**What to build:**
補齊肌肉書僮核心指標 MACD 0 軸主控環境，杜絕空頭反彈誤判為起漲：
1. 引用專案內現有之 `src/engine/omniIndicatorEngine.ts` 或 `technicalIndicatorEngine.ts` 的 `calculateMACD(closes)`。
2. 在 `evaluateMuscleBookerAction` 中加入 MACD 0 軸檢驗：
   - 多頭主控架構定義：`macd.dif12_26 >= 0 || macd.macdHist >= 0`。
   - 若 DIF < 0 且柱狀體為負（空頭主控弱勢區），禁止發布 `BUY` 訊號，標記為 `AVOID: ⛔ 嚴禁碰觸 (MACD 0 軸以下空方控盤)`。
3. 撰寫單元測試覆蓋多頭主控放行與空方控盤攔截。

**Blocked by:** Ticket 04

**Status:** open

- [x] 引用並在 `muscleBookerEngine.ts` 整合 `calculateMACD`
- [x] 在動作矩陣中增設 MACD 0 軸多頭主控檢驗條件
- [x] 輸出直觀的動能原因說明字串
- [x] 編寫單元測試驗證空方控盤標的被成功排除於買進清單外

