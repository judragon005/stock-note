# 01 — 美股四大指數與台股全量成分庫實體化及選池擴展

**Parent:** #395

**What to build:**
實體化美股四大市場（道瓊 30、費城半導體 30、那斯達克 100、標普 500）與台股全量（2,285+ 檔）、中型 100 的成分股種子庫，擴充 `AssetPoolType` 聯合型別，使 `getScopedUniverseSymbols` 能正確過濾對應市場，並於 `MuscleBookerHeader` 升級為包含 `<optgroup>` 的分組下拉選單。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [x] `src/data/usIndicesComponents.ts` 導出 `US_DOW_30_SYMBOLS` (30 檔)、`US_SOX_30_SYMBOLS` (30 檔)、`US_NASDAQ_100_SYMBOLS` (100 檔)、`US_SP_500_SYMBOLS` (500+ 檔)、`TW_ALL_SYMBOLS` (2,285+ 檔)、`TW_MID_100_SYMBOLS` (100 檔)。
- [x] `AssetPoolType` 擴充支援 `TW_ALL`、`US_SP500`、`US_NASDAQ100`、`US_DOW30`、`US_SOX30`、`MID100_MOMENTUM`。
- [x] `getScopedUniverseSymbols` 支援各池標的解析與 Storage 快取回退。
- [x] `MuscleBookerHeader.tsx` 使用 `<optgroup>` 區分台灣市場、美股四大市場與投資組合。
- [x] 單元測試 `usIndicesComponents.test.ts` 100% 通過。

