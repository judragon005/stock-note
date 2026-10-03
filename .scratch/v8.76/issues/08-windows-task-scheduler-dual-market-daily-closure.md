# 08 — Windows 工作排程器台美雙軌定時閉環與零漏水稽核報告

**What to build:** 
升級 `scripts/market-sync/setup-windows-task.bat`，完整註冊台股盤後 (每日 16:00)、美股盤前 (每日 08:00)、集保股權 (每週五 19:00) 與月營收 (每月 11 日 09:00) 的定時任務。升級 `scripts/market-sync/audit-verifier.cjs` 生成包含全表健康度的 `sync_audit_report.json`。

**Blocked by:** 04-tw-extended-chips-daily-pipeline-integration.md, 05-historical-chips-gap-backfill-engine.md, 06-tdcc-shareholding-distribution-ingestion.md, 07-monthly-revenue-growth-ingestion.md

**Status:** done

- [x] 升級 `setup-windows-task.bat`，支援一鍵註冊/移除/測試台股、美股、集保與月營收定時排程
- [x] 確保排程調用 `run-sync-silent.vbs` 保持背景完全靜默執行，不彈黑視窗
- [x] 升級 `audit-verifier.cjs`，稽核涵蓋 `daily_candles`, `tw_institutional_chips`, `tw_tdcc_distribution`, `tw_monthly_revenue` 數據筆數與最新日期
- [x] 執行端到端 E2E 驗收測試，抽樣驗證 2330、0050、AAPL 湖倉數據連續性與非零驗收，產出完整稽核報告
