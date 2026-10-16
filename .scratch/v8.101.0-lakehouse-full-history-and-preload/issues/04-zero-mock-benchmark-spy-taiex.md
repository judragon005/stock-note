# 04 — 大盤基準 SPY/TAIEX 假數據拔除 (Zero-Mock Benchmark)

**What to build:**
1. 拔除 `src/engine/benchmarkConstants.ts` 中手填寫死至 2025 年 10 月的 SPY 假數據。
2. 升級 `src/engine/benchmarkData.ts`：當獲取 SPY 或 TAIEX 基準序列時，優先請求中介層/本地湖倉獲取真實日 K 收盤價字典。
3. 僅在庫中無該標的日 K 時，安全降級為靜態備份常數保底。

**Blocked by:** 03 — 中介層 API 動態 Limit 查詢與預載視窗對齊 (API Dynamic Limit & Preload Window)

**Status:** completed

- [x] 移除手動寫死的過期 SPY 假數據
- [x] 大盤基準取數優先使用本地真實日 K (`loadBenchmarkDailyPricesAsync` & 動態快取)
- [x] 撰寫單元測試驗證 SPY 基準價格序列來自真實日 K (`src/engine/lakehouseBenchmarkSpyTaiex.test.ts` & `src/engine/benchmarkData.test.ts`)
