# 03 — External Data Pipeline for Taiwan Market (FinMind / MOPS)

**What to build:**
實作台股外部數據轉換管道 `src/engine/taiwanFinancialPipeline.ts`。串接 FinMind API 或公開觀測站 OpenAPI，將損益表、資產負債表、現金流量表與會計師查核意見清洗映射至 `QuarterlyFinancialRecord` 結構，支援按需補齊最近 8~12 季數據。

**Blocked by:** 01-financial-types-and-schema.md, 02-indexeddb-storage-and-financial-store.md

**Status:** ready-for-agent

- [x] 實作 `fetchTaiwanQuarterlyFinancials(symbol: string, token?: string)` 請求與清洗邏輯
- [x] 處理台股財報科目名稱映射（營業收入、營業毛利、營業利益、稅後淨利、應收帳款、存貨、CFO、Capex、股利）
- [x] 擷取會計師查核意見代碼並判斷四大會計師事務所
- [x] 單元測試驗證台積電 (2330) 與一般傳產股之數據清洗正確性與缺失欄位防禦容錯
