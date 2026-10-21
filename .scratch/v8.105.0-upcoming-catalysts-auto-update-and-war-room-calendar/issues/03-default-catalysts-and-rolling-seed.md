# 03 — 建立 2026~2027 官方前瞻種子庫與自適應滾動產生器 (src/data/defaultCatalysts.ts)

**Parent:** #281

**What to build:**
建立官方已公告之 2026～2027 年重磅日程種子庫，並實作自適應滾動產生器，徹底終結時間過期造成的空白：
1. **官方種子庫收錄**：
   - 2026 年 Q4 與 2027 年 FOMC 利率決策會議排程（如 2026-11-05、2026-12-17 等）。
   - 2026 年 Q4 與 2027 年台灣央行理監事聯席會議排程（如 2026-12-17）。
   - 美國 PCE 物價指數與 GDP 初值預告日。
2. **自適應滾動融合演算法 `generateRollingSeedCatalysts(asOfDate: string)`**：
   - 合併官方種子庫與 `generatePeriodicCatalysts()` 常態週期。
   - 以 `asOfDate` 為基準，自動篩選未來 60 天內之有效事件。
   - 保證無論基準日為何，回傳的候選事件數量始終 $\ge 4$ 筆，杜絕留白。

**Blocked by:** Ticket 02

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 建立 `src/data/defaultCatalysts.ts`，收錄 2026～2027 前瞻日程。
- [ ] 當以 `2026-10-17` 為基準日時，`generateRollingSeedCatalysts('2026-10-17')` 能回傳 2026 年 10 月底與 11 月之台指結算、FOMC、非農等至少 4 筆未來事件。
- [ ] 撰寫單元測試驗證任意日期傳入皆能獲得非空前瞻清單。
