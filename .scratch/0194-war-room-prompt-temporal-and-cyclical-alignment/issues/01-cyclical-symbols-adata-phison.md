# 01 — 景氣循環股清單擴充：威剛 3260 與群聯 8299 (Cyclical Symbols Expansion)

**Parent:** #288

**What to build:**
在景氣循環產業過濾器清單中補入威剛（3260）與群聯（8299），保證 `isCyclicalIndustry('3260')` 與 `isCyclicalIndustry('8299')` 回傳 `true`，外聯提示詞可正確輸出 `<is_cyclical_stock is_cyclical="true">景氣循環週期股...</is_cyclical_stock>`。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] `src/engine/industryGate.ts` 的 `CYCLICAL_SYMBOLS` Set 補入 `'3260'` 與 `'8299'`。
- [x] `isCyclicalIndustry('3260')` 回傳 `true`，`isCyclicalIndustry('8299')` 回傳 `true`。
- [x] `src/engine/industryGate.test.ts` 包含 3260 與 8299 之景氣循環驗證測試。
- [x] 既有景氣循環標的與一般非循環標的測試 100% 通過。
