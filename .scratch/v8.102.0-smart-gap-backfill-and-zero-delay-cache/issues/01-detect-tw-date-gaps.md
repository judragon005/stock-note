# Ticket 01 — 台股湖倉水位線與缺口自動探測核心 (`detectTwDateGaps`)

**What to build:**
在 `scripts/market-sync/backfill-tw-history-web.cjs` 中實裝 `detectTwDateGaps` 函數。
依據法定實質交易日清單（`generateTradeDateCandidates`），使用 Prepared Statement 高效掃描 SQLite 湖倉中的 `daily_candles` 與 `tw_institutional_chips` 雙指標數據（普通股 $\ge 1800$ 且 籌碼 $\ge 2000$）。
精準識別出未達標之日期清單（`gapDates: string[]`），回傳格式為：
`{ hasGaps: boolean, gapDates: string[], totalChecked: number, validCount: number, latestInDbDate: string | null }`。

**Blocked by:**
None — can start immediately.

**Status:**
closed

**Acceptance criteria:**
- [x] 於 `scripts/market-sync/backfill-tw-history-web.cjs` 匯出 `detectTwDateGaps` 函數。
- [x] 當資料庫中指定區間的全部交易日皆具備普通股 $\ge 1800$ 且籌碼 $\ge 2000$ 時，回傳 `hasGaps: false` 且 `gapDates: []`。
- [x] 當資料庫中缺少某 2 天數據或單邊缺失時，精準將該 2 天列入 `gapDates` 陣列（依日期由新至舊排序）。
- [x] 當資料庫完全為空時，回傳全部候選日期作為 `gapDates`。
- [x] 撰寫單元測試覆蓋以上三種邊界情境，維持 100% 綠燈。
