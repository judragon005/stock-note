# 04 — 籌碼均量比例尺計算與「待同步」語義誠實化

**What to build:**
在提示詞特徵轉接層計算外資、投信三大法人買賣超張數佔 20 日成交均量之百分比比率，使外部 AI 能精確理解主力進出規模強度；同時將估值與治理無數據欄位由冷硬的 `N/A` 轉化為語義誠實的標籤 `待同步 (官方資料排程中)`，杜絕外部 AI 誤判公司暴雷。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `src/engine/aiForcePromptAdapter.ts` 計算 `foreignRatio20D` 與 `trustRatio20D`（相對於 20 日均量）。
- [ ] 輸出格式格式化為：`${shares} 張 (佔 20 日均量 ${ratio}%)`。
- [ ] 當欄位未獲取時，以 `待同步 (官方資料排程中)` 取代 `N/A`。
- [ ] 更新 `src/engine/aiForcePromptAdapter.test.ts` 驗證計算邏輯與輸出字串。
