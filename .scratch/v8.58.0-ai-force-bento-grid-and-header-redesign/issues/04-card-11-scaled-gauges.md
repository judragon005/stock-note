# 04 — 11 健康度綜合評估表 5 環放大與佈局優化 (Card 11 Scaled Gauges)

**What to build:**
修改 `HealthSummaryCard.tsx`：
- 5 個圓環進度規直徑依容器等比放大，字體適度縮放。
- 指標名稱與百分比文字垂直間距優化，徹底消除 5 環縮小擠壓成一團的現象。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 5 個圓環直徑相較於原縮小版放大至少 30%~40%
- [x] 標籤文字與百分比清晰不重疊
- [x] 相關單元測試 `HealthSummaryCard.test.ts` 100% 綠燈
