# 06 — 報表引擎徹底拔除 5 根 Mock 日 K 與硬編碼假數值

**What to build:** 徹底重構 `createDefaultAiForceReport` 與 `generateAiForceReportFromCandles`，刪除 5 根假 K 線、寫死 150/2100 元價格、成交量 2,681 張等所有 Mock fallback，建立嚴謹的待命狀態機 (`isDataPending = true`)。

**Blocked by:** 05 — 湖倉歷史籌碼與資券 API 端點聚合輸出

**Status:** done

- [x] 移除 `generateAiForceReportFromCandles` 中不足 5 根時退回假報表的邏輯
- [x] 標的無資料時嚴格標註 `isDataPending = true`，K 線陣列長度嚴格為 0
- [x] 撰寫單元測試驗證 0 假資料邊界
