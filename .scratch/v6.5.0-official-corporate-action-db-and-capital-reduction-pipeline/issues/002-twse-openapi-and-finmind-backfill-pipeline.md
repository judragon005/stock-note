# 002 — twse-openapi-and-finmind-backfill-pipeline

**What to build:**
在 `corporateActionScanner.ts` 中整合 TWSE/TPEx 官方端點（除權息與減資）與 FinMind Token 支援（台股歷史 10 年減資與股息回填，受控節流 200ms），並在 `SettingsWorkspace.tsx` 提供 FinMind Token 設定與同步按鈕。

**Blocked by:** 001-indexeddb-corporate-actions-store-and-incremental-sync

**Status:** closed

- [x] 強化 `corporateActionScanner.ts` 整合 TWSE/TPEx 官方開放端點與 FinMind API 歷史回填
- [x] 實作 200ms Rate-Limit 節流防護與增量寫入 IndexedDB
- [x] `SettingsWorkspace.tsx` 新增 FinMind Token 與 FMP Key 輸入欄位及說明
- [x] 單元測試驗證官方 OpenAPI 解析與 FinMind 降級機制

