# 05 — 歷史淨值回推與除權息 Lakehouse-First 本地優先 (Lakehouse-First Routing)

**What to build:**
1. 升級 `src/engine/historicalPriceFetcher.ts`：在發起外部 Yahoo Finance 請求前，優先請求本機 `/api/market/history/:symbol` 檢索該標的在指定日期區間之收盤價；在庫數據滿足時直接返回（0.05 秒秒開），未命中時才連網，徹底消除 `ECONNRESET` 逾時與淨值破圖。
2. 升級 `src/engine/dividendService.ts`：在對外發起 FinMind 請求前，先檢驗本地除權息日曆接口，在庫歷史股利充足時直接使用。

**Blocked by:** 03 — 中介層 API 動態 Limit 查詢與預載視窗對齊 (API Dynamic Limit & Preload Window)

**Status:** closed

- [x] `historicalPriceFetcher.ts` 在發起外部請求前優先查詢本地日 K
- [x] `dividendService.ts` 具備本地除權息日曆優先感知
- [x] 撰寫單元測試驗證本地命中時零外部網路請求
