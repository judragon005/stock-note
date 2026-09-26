# 05 — Card 14 AI 信心度：4 大指標與綜合信心量化引擎 (TDD)

**What to build:**
建立 `src/engine/aiConfidenceEngine.ts` 與 `src/engine/aiConfidenceEngine.test.ts`：
1. **資料完整度 (`dataCompleteness`)**：
   - 歷史 K 線數列長度：`count >= 120` 且有法人資料 ➔ 100%；`count >= 60` ➔ 85%；`count >= 20` ➔ 70%；`< 20` ➔ 50%。
2. **訊號穩定度 (`signalStability`)**：
   - 依近 10 日振幅平均與均線波動計算：波動失控時由 88 分遞減至 48 分。
3. **模型準確度 (`modelAccuracy`)**：
   - 依據短天期與中天期均線斜率同向性（方向一致性）映射 40% ~ 82%。
4. **策略適用度 (`strategyApplicability`)**：
   - 依流動性充足度與趨勢清晰度映射 45% ~ 82%。
5. **綜合信心度 (`overallConfidence`)**：
   - 4 項指標加權平均取整。
6. 回傳符合 `AiConfidenceData` 契約之物件。

**Blocked by:** None

**Status:** completed

- [x] 歷史資料充分且趨勢清晰時，總體信心度與完整度達到 85% 以上
- [x] 樣本極少或極端震盪時，總體信心度合理降至 50% 左右
- [x] 所有輸出百分比皆在 `[0, 100]` 範圍內
- [x] 單元測試 100% 綠燈
