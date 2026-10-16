# 05 — 台美衍生品期指結算日與四巫日感知演算法 (isDerivativesExpiryDay)

**Parent:** #275

**What to build:**
在 `trading-calendar-engine.cjs` 中實作純演算法 `isDerivativesExpiryDay(dateStr, market)`，無須外部依賴，純日期推導台指期結算日（每月第 3 個週三）與美股選擇權結算/四巫日（每月第 3 個週五，且 3/6/9/12 月標註為四巫日）。

**Blocked by:** 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 給定台股日期，能精準判定是否為該月「第 3 個星期三」（台指期結算）。
- [ ] 給定美股日期，能精準判定是否為該月「第 3 個星期五」，並在 3/6/9/12 月回傳 `isQuadrupleWitching: true`。
- [ ] 撰寫單元測試覆蓋多個年份月份之邊界判定。
