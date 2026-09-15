# 05 — 自動化測試套件與零遺漏稽核驗收報告 (Automated Test Suite & Audit Report)

**What to build:**
實作品質防線與驗收報告：
1. 單元測試：驗證日曆對齊算法、停牌補值邏輯、交易所單日批次剖析與指標連續性。
2. 驗收稽核：產生完整的回補執行報告 `backfill_audit_report.json`，統計全市場總檔數、成功回補檔數、停牌標記檔數、靶向線上修復天數與整體耗時。
3. 確保 `npm test` 100% 通過與 `npm run build` TypeScript 0 錯誤。

**Blocked by:** Ticket 04

**Status:** ready-for-agent

- [x] 編寫單元測試覆蓋日曆對齊、停牌填補與資料清洗邏輯
- [x] 執行回補腳本並輸出完整的 `backfill_audit_report.json`
- [x] 確保本地既有單元測試全數綠燈、前端建置 0 錯誤
