# 08 — 金融股/ETF 坐標防壓扁與多維度 Y 軸切換

**Parent:** #433 (Spec 0218)
**GitHub Issue:** #441 (CLOSED)

**What to build:**
1. 建立普通股與 ETF 獨立正規化分母（`maxAbsShares` vs `maxAbsEtfShares`）。
2. 支援 Y 軸切換「買賣超金額 (AMOUNT)」、「投量比 (RATIO)」與「張數 (SHARES)」。

**Acceptance Criteria:**
- [x] 巨量 ETF 不壓扁一般個股 Y 軸。
- [x] 多維度 Y 軸切換流暢。
- [x] 單元測試 100% 通過。
