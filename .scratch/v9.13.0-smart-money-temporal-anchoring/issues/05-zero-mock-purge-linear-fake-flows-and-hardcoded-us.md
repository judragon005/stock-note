# 05 — 徹底拔除 5 日線性插值假軌跡與美股焦點股硬編碼假數據

**Parent:** #433 (Spec 0218)
**GitHub Issue:** #438 (CLOSED)

**What to build:**
1. `ChipsWorkspace.tsx` 拔除 `buildHoldingHistoricalFlows` 之等比例線性偽造數值。
2. 移除美股焦點清單寫死之假漲跌幅、假 CMF 與假成交量。

**Acceptance Criteria:**
- [x] 彗星軌跡全部直連真實歷史日報或湖倉日 K。
- [x] 美股焦點無假資料硬編碼。
- [x] 單元測試 100% 通過。
