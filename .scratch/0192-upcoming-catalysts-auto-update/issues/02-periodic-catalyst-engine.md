# 02 — 實作確定性常態金融週期推算演算法 (src/engine/periodicCatalystEngine.ts)

**Parent:** #281

**What to build:**
實作零外部依賴、純基於原生 Date 數學運算的常態金融週期計算演算法，保證在完全離線情況下可精準推算未來任意月份的金融週期：
1. **台指期貨/選擇權月結算日**：每月第三個星期三（如 2026-10-21、2026-11-18），類別為 `DERIVATIVE_SETTLEMENT`，衝擊度為 `HIGH`。
2. **美股月選擇權到期與四巫日**：每月第三個星期五（如 2026-10-16、2026-11-20），其中 3、6、9、12 月為「美股四巫日 (Quadruple Witching)」，類別為 `DERIVATIVE_SETTLEMENT`，衝擊度為 `HIGH`。
3. **美國非農就業報告公布日 (NFP)**：每月第一個星期五，類別為 `EMPLOYMENT`，衝擊度為 `HIGH`。
4. **美國 CPI 通膨公布日估算**：每月第二個星期三，類別為 `INFLATION`，衝擊度為 `HIGH`。
5. 導出 `generatePeriodicCatalysts(asOfDate: string, lookaheadMonths: number = 2): Omit<UpcomingCatalyst, 'daysLeft'>[]`，動態生成未來 2 個月內的常態週期事件。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 函式 `getThirdWednesday(year, month)` 與 `getThirdFriday(year, month)` 計算 100% 精準。
- [ ] `generatePeriodicCatalysts('2026-10-17')` 能正確產生 2026 年 10 月與 11 月之台指結算日、四巫日/月結算與非農報告。
- [ ] 撰寫 `src/engine/periodicCatalystEngine.test.ts` 驗證不同月份與跨年度邊界的計算準確性。
