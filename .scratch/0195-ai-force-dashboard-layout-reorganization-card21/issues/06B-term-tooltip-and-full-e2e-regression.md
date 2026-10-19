# 06B — 金融術語庫 (TermTooltip) 補全與全量戰情室 E2E 回歸測試驗收

**Parent:** #290

**What to build:**
於 `src/types/terms.ts` 與 `TermTooltip` 補全 Card 21 與美股籌碼相關金融名詞（PS 比、折溢價率、Short Float、RVOL 等）。執行全量 E2E 與回歸測試，確保既有戰情室測試與全系統測試 100% 通過、TypeScript 0 錯誤。

**Blocked by:** 01A, 01B, 02B, 05B, 06A

**Status:** completed

## Acceptance Criteria
- [x] 補全 PS 營收比、ETF 折溢價率、Short Float、RVOL 等金融名詞與 Tooltip 解釋。
- [x] 執行 `npm test` 確保 100% 通過，無破壞性變更。
- [x] 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤。
