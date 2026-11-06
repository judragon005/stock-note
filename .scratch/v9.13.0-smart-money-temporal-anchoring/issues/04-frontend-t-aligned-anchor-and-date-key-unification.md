# 04 — 前端同日定錨 (T-Aligned Anchor) 與日期鍵格式衝突消除

**Parent:** #433 (Spec 0218)
**GitHub Issue:** #437 (CLOSED)

**What to build:**
1. `ChipsWorkspace.tsx` X 軸與 Y 軸 100% 鎖定在同一個最新已結算交易日。
2. 盤中或收盤未結算時段嚴禁將今日漲跌與昨日籌碼硬拼接。
3. 呈現「籌碼定錨基準日」誠實標章。

**Acceptance Criteria:**
- [x] 時空錯位假背離徹底消除。
- [x] 重新同步時快取日期正確更新。
- [x] 單元測試 100% 通過。
