# Issue 01: 徹底廢除偽造行情 (generateSyntheticCandles) 與定義未就緒安全降級

## 狀態與分流

- 狀態：`CLOSED` (已徹底移除假 K 線合成，無真實日 K 時安全降級為 AVOID 與 isDataPending)
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `anti-hallucination`

## 任務說明

1. 在 `src/engine/muscleBookerEngine.ts` 中：
   - 移除或棄用 `generateSyntheticCandles`，杜絕任何利用 ASCII Hash 偽造 K 線產生的假突破/假買賣訊號。
   - `scanMuscleBookerItem` 當 `localCandles` 缺損或長度小於 5 根時：
     - 回傳明確的 `isDataPending: true` 屬性。
     - 操盤動作 `actionDecision` 安全降級為 `AVOID`，主理由為「歷史日K數據未就緒，等待回補中」，停損防守價位設為現價。
2. 同步更新 `ScannedStockItem` 型別定義，增加 `isDataPending?: boolean`。
