# 07 — 公開資訊觀測站 (MOPS) 全市場月營收成長與歷史新高入庫模組

**What to build:** 
建立模組 `scripts/market-sync/ingest-tw-monthly-revenue.cjs`，抓取 MOPS 上市櫃月營收彙總表，計算 YoY 年增率、MoM 月增率，並自動比對歷史峰值標註 `is_all_time_high`，批次寫入 `tw_monthly_revenue`。

**Blocked by:** 01-sqlite-schema-expansion-and-indices.md

**Status:** done

- [x] 實作 TWSE/TPEx MOPS 月營收報表解析器
- [x] 實作營收增長率運算與歷史新高判斷邏輯
- [x] 實作 `saveMonthlyRevenueToSqlite` 批次寫入模組
- [x] 撰寫單元測試 `tests/market-sync/monthly-revenue.test.ts` (實作於 `src/engine/monthlyRevenue.test.ts`)，驗證 YoY/MoM 與歷史新高標籤精確計算
- [x] 支援指定年月（如 `2026-08`、`2026-09`）手動補回歷史營收
