# 04 — 定時排程節奏化（每日/每週/每月自適應無人值守）

**What to build:**
落實自適應節奏化同步，在現有排程腳本內以條件式附掛實現無人值守增量更新，杜絕使用者日後頻繁手動補資料之負擔：
1. **台股排程附掛 (`scripts/market-sync/sync-tw-market.cjs`)**：
   - 每日 16:00 順路更新 TWSE/TPEx 官方估值與最新除權息預告。
   - 若當日為**每週五且超過 19:00**，順路觸發 `runTdccIngestion`（集保千張大戶持股）。
   - 若當日落於**每月 1~11 號**，順路觸發 `runMonthlyRevenueIngestion`（月營收成長）。
   - 若當日為**每月 16 號**，順路觸發董監質押入庫。
2. **美股排程附掛 (`scripts/market-sync/sync-us-market.cjs`)**：
   - 每日 08:00 順路執行 `ingestMacroSentimentToDb`（美債 10Y、VIX、CNN 恐懼指數）。
   - 順路沉澱美股熱門標的之 Yahoo 估值快取。
3. 健全單元測試與安全守衛。

**Blocked by:** Ticket 03

**Status:** done

- [x] 在 `sync-tw-market.cjs` 中加入週期分流附掛邏輯 (週五 TDCC、月初營收、月中質押、每日除權息/估值)
- [x] 在 `sync-us-market.cjs` 中加入宏觀指標附掛調用
- [x] 編寫測試驗證各週期分流條件判定正確性 (`src/engine/cadenceScheduledSync.test.ts`)
- [x] 執行全套回歸測試 (`npm test`) 100% 通過
