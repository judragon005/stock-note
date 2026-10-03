# 06 — 台灣集保結算所 (TDCC) 每週股權分散與千張大戶持股比入庫模組

**What to build:** 
建立模組 `scripts/market-sync/ingest-tw-tdcc.cjs`，抓取台灣集保結算所每週五公布之全市場股票股權分散表，計算千張大戶持股比例 (`over_1000_ratio`)、400張以上大戶持股比例 (`over_400_ratio`) 與總股東人數，寫入 `tw_tdcc_distribution`。

**Blocked by:** 01-sqlite-schema-expansion-and-indices.md

**Status:** done

- [x] 實作 TDCC 官方公開資料集或 API 解析器，按標的與分級持股人數/股數聚合大戶比例
- [x] 實作 `saveTdccDistributionToSqlite` 批次寫入模組
- [x] 撰寫單元測試 `tests/market-sync/tdcc-distribution.test.ts` (實作於 `src/engine/tdccDistribution.test.ts`)，驗證計算千張大戶百分比精確度至小數點後兩位
- [x] 支援指定週五日期（如 2026-09-25、2026-10-02）手動補跑與週排程調用
