# 04 — External Data Pipeline for US Market (FMP / SEC EDGAR)

**What to build:**
實作美股外部數據轉換管道 `src/engine/usFinancialPipeline.ts`。串接 FMP API 或 SEC EDGAR Company Facts，擷取季度三表與 Stock-Based Compensation (SBC) 欄位，標準化轉換為 `QuarterlyFinancialRecord`，支援按需抓取近 8~12 季數據。

**Blocked by:** 01-financial-types-and-schema.md, 02-indexeddb-storage-and-financial-store.md

**Status:** ready-for-agent

- [x] 實作 `fetchUSQuarterlyFinancials(symbol: string, apiKey?: string)` 請求與清洗邏輯
- [x] 提取美股損益、資產負債、現金流量及專屬 `stockBasedCompensation` 欄位
- [x] 擷取查核審查意見狀態（10-K / 10-Q 標記）
- [x] 單元測試驗證 AAPL、NVDA 等標的在有/無 API Key 時的轉換與 Fallback 行為
