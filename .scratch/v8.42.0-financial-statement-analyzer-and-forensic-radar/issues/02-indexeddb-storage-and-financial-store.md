# 02 — IndexedDB Storage & Financial Store Persistence

**What to build:**
擴充 `src/utils/db.ts`，新增 `financial_statements_store` 物件倉儲與複合主鍵索引 (`[symbol+year+quarter]`)。實作查詢現有季度、批次快取與按需防禦讀取邏輯，確保已結算歷史季度 100% 永久快取，零重複發送網路請求。

**Blocked by:** 01-financial-types-and-schema.md

**Status:** ready-for-agent

- [x] 在 `src/utils/db.ts` 升級 IndexedDB schema，建立 `financial_statements_store`
- [x] 實作 `getStoredFinancialRecords(symbol: string): Promise<QuarterlyFinancialRecord[]>`
- [x] 實作 `saveFinancialRecords(records: QuarterlyFinancialRecord[]): Promise<void>` 支援冪等批次寫入
- [x] 撰寫單元測試驗證 IndexedDB 讀寫、更新與版本遷移無損容錯
