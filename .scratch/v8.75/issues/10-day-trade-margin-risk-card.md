# 10 — 10 當沖信用風險卡真實券資比與浮額風險計算

**What to build:** `DayTradeRiskCard` 串接 SQLite 真實融資餘額與融券餘額，動態計算券資比與浮額籌碼鬆動風險，徹底終結常態預設值。

**Blocked by:** 05 — 湖倉歷史籌碼與資券 API 端點聚合輸出, 06 — 報表引擎徹底拔除 5 根 Mock 日 K 與硬編碼假數值

**Status:** closed

- [x] 升級 `dayTradeRiskEngine.ts`，納入真實融資餘額與融券餘額計算券資比
- [x] 升級 `DayTradeRiskCard.tsx` 視覺呈現券資比與信用增減指標
- [x] 撰寫單元測試驗證券資比運算正確性
