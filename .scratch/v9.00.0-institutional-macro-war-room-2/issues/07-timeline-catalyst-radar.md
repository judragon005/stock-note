# 07 — 彭博式三段時序雷達 (今日/7日/30日) 與營收除息倒數

**Parent:** #283

**What to build:**
重構宏觀催化劑事件為「今日登場 (Today)」、「7 日焦點 (7 Days)」、「30 日遠端 (30 Days)」三段時序雷達，並自動注入「每月 10 號在線持股營收截止倒數」與「持股除息預估蒸發加權指數點數」防假跌破。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/types/macro.ts` 導出 `TimelineHorizon`（`'TODAY' | 'WEEK' | 'MONTH'`）。
- [ ] `src/engine/macroAdvisorEngine.ts` 提供 `groupCatalystsByTimeline(catalysts: UpcomingCatalyst[])`，將事件按天數自動劃分為 `today` (0 天), `within7Days` (1~7 天), `within30Days` (8~30 天)。
- [ ] 自動合成每月 10 號營收公布截止事件，標記為 `EARNINGS` 分類。
- [ ] 支援試算持股除息對大盤的預估扣點數 `estimatedExDividendIndexPoints`。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證時序分組、營收倒數及扣點計算無損精確。
