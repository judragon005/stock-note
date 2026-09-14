# 02 — Cache Integrity Sentry & Tri-Statement Auto-Healing Pipeline

**What to build:**
在 `financialReportService.ts` 建立「快取完整性檢驗哨兵」。若本地 IndexedDB 紀錄屬於舊版殘缺快取（所有 CFO 皆為 0 或缺少資產負債總計），自動判定為無效快取，背景發起三大報表並行請求並覆蓋快取。同時擴充台股資產負債與現金流科目別名映射白名單。

**Blocked by:** 01-financial-amount-broker-formatter.md

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #50

- [x] 本地快取完整性探針（CFO 與總資產非全 0 校驗）
- [x] 殘缺快取自動洗滌重撈覆蓋，杜絕髒快取殘留
- [x] 補齊台股 MOPS/FinMind 申報科目別名 mapping
- [x] 單元測試驗證自動自癒邏輯
