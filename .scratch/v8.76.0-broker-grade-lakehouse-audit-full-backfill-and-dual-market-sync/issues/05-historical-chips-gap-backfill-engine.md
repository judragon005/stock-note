# 05 — 背景非阻塞歷史籌碼斷層回補引擎 (2026-08-15 至 2026-10-02 全量回補)

**What to build:** 
建立獨立回補腳本 `scripts/market-sync/backfill-historical-chips-gap.cjs`，自動計算 2026-08-15 起至 2026-10-02 止之有效開市交易日清單（約 35 個交易日）。依序向 TWSE/TPEx 官方介面抓取全市場三大法人 T86 與資券當沖，單日資料以 Transaction 批次寫入 `tw_institutional_chips`。

**Blocked by:** 02-t86-and-extended-chips-field-mapping-repair.md, 04-tw-extended-chips-daily-pipeline-integration.md

**Status:** done

- [x] 實作交易日自動生成器，排除週末與中秋節等國定休市日
- [x] 實作單日整包抓取與 SQLite 批次寫入，每筆交易日間隔 1,500ms，支援失敗指數退避 (Exponential Backoff)
- [x] 支援 `--resume` 斷點續跑模式，已完成日期自動略過，不重複發起請求
- [x] 撰寫測試 `src/engine/historicalChipsGapBackfill.test.ts` 驗證交易日產生與過濾邏輯精確
