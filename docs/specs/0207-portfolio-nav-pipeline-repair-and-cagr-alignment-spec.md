# 0207 Specification: 資產成長全歷史管線修復、券商隔離與量化複利指標規格 (Portfolio NAV Pipeline Repair, Account Isolation, and Quantitative Compounding Metrics)

## Problem Statement

使用者在「資產成長 (NAV)」頁面分析全歷史投資績效時，面臨嚴重的數據失真與功能盲區：
1. **除息月份產生假性跳水**：除息日 (Ex-date) 到發放日 (Pay-date) 之間，持股市值扣除但應收股利未計入，導致折線圖產生虛假暴跌與回撤。
2. **券商帳戶切換無效**：頂部切換特定券商（如國泰或富邦）後，資產成長折線圖與 XIRR 依然顯示所有券商之全量混合資料。
3. **夏普比率系統性虛高**：無風險利率寫死為 1.5%，在美股市場（真實無風險利率 4.3%~4.5%）造成嚴重的績效超額假象。
4. **大盤日 K 滯後**：大盤基準切換時未調用本地湖倉 SQLite API，造成 SPY/0050 等基準停留在靜態備份常數。
5. **本金注入產生暴賺幻覺**：AUM 金額模式下外部大額入金使折線垂直起跳，缺乏視覺錨點區分「入金」還是「選股獲利」。
6. **缺乏長期複合成長與抗跌修復指標**：僅提供總累計報酬率（如 +80%），無法得知長達數年下的真實年化複合報酬率 (CAGR)；水下回撤圖僅有當前天數，無法得知歷史最長套牢修復期。

---

## Solution

在不引入外部套件、不破壞既有架構（符合 KISS 原則）的前提下：
1. **補通 App 頂層管線縫隙**：在 `App.tsx` 調用 `calculateHistoricalNavSeries` 時，補齊傳入 `receivableDividends` 與 `selectedAccountId`，喚醒除息平滑引擎並使券商篩選器生效。
2. **無風險利率動態接軌**：組件改為調用 `resolveDynamicRiskFreeRate(null, baseCurrency)`，在 USD 計價下帶入 4.5%、TWD 計價下帶入 1.8%。
3. **大盤湖倉日 K 非同步接通**：在 `PortfolioGrowthChart.tsx` 切換基準時，非同步調用 `loadBenchmarkDailyPricesAsync(type)`，獲取真實日 K 後自動觸發重繪。
4. **出入金事件視覺打點**：當日有外部資金流（DEPOSIT / WITHDRAWAL）時，於 Hover Crosshair 及事件標籤清楚標注「💵 入金」與「💸 出金」金額。
5. **新增 CAGR 與歷史最長水下天數**：
   - 於累計總損益卡片新增 CAGR %：$\text{CAGR} = (V_{\text{final}} / V_{\text{cost}})^{(365.25 / \text{days})} - 1$。
   - 於水下回撤圖面板新增「歷史最長水下天數 (Longest Drawdown Duration)」。

---

## User Stories

1. As an investor with dividend stocks, I want my asset growth curve to smoothly account for receivable dividends between the ex-date and payment date, so that artificial portfolio drops are prevented.
2. As a multi-broker investor, I want selecting a specific broker account to isolate and recalculate the NAV series for that account only, so that I can evaluate the growth of distinct accounts independently.
3. As a US market investor, I want my Sharpe and Sortino ratios to calculate against the true USD risk-free rate (4.5%), so that my risk-adjusted metrics reflect actual institutional standards without artificial inflation.
4. As an analytical trader, I want benchmark curves (SPY, 0050, TAIEX) to asynchronously hydrate from the local SQLite lakehouse, so that I compare against actual historical market data up to the latest trading day.
5. As a portfolio tracker, I want external deposit and withdrawal events to be highlighted on the chart tooltip, so that I do not confuse capital injections with portfolio alpha.
6. As a long-term compounder, I want to see the Compound Annual Growth Rate (CAGR) alongside total return, so that I can evaluate if my wealth creation beats long-term market averages (e.g., 7~10%).
7. As a disciplined investor, I want to see the longest historical underwater drawdown duration in days, so that I possess a clear psychological anchor of how long it previously took to break even after major market drawdowns.

---

## Implementation Decisions

### Decision 1: App.tsx Pipeline Gap Remediation
- In `src/App.tsx`, pass `receivableDividends` and `selectedAccountId` directly into `calculateHistoricalNavSeries`.
- In `src/App.tsx`, pass the scoped `cashTransactions` (filtered by `selectedAccountId` when active) into `PortfolioGrowthChart`.

### Decision 2: Dynamic Risk-Free Rate in PortfolioGrowthChart
- Replace the hardcoded `1.5` in `PortfolioGrowthChart.tsx` lines 109 and 141 with `resolveDynamicRiskFreeRate(null, baseCurrency)`.

### Decision 3: Asynchronous Benchmark Hydration
- In `PortfolioGrowthChart.tsx`, add a lightweight `useEffect` that calls `loadBenchmarkDailyPricesAsync(benchmarkType)` when `benchmarkType !== 'NONE'`. Maintain a local state `benchmarkLoadedPriceMap` to trigger instant re-alignment when the SQLite lakehouse resolves.

### Decision 4: Capital Flow Event Markers
- When hovering on a snapshot point in `PortfolioGrowthChart.tsx`, if the snapshot contains deposit or withdrawal events, display distinct styled badge tags (e.g., `💵 入金: +NT$100,000` or `💸 出金: -NT$50,000`).

### Decision 5: Quant Compounding & Drawdown Duration Algorithm
- Add `cagrPercent` calculation to `calculatePerformanceMetrics`:
  ```typescript
  // CAGR = (endingNAV / beginningCost)^(365.25 / totalDays) - 1
  ```
- In `PortfolioGrowthChart.tsx`, calculate `longestDrawdownDays` by iterating through consecutive days where `underwaterDrawdownPercent < 0`.

---

## Testing Decisions

- **Seams**:
  - Test seam 1: `src/engine/historicalNav.test.ts` — verify that `receivableDividends` and `selectedAccountId` passed into `calculateHistoricalNavSeries` correctly smooth dividend dips and isolate broker accounts.
  - Test seam 2: `src/engine/quantMetrics.test.ts` — verify dynamic risk-free rate switching and `calculatePerformanceMetrics` outputting `cagrPercent`.
  - Test seam 3: `src/components/PortfolioGrowthChart.test.tsx` — verify CAGR display, broker filtering responsiveness, and asynchronous benchmark state update.

---

## Out of Scope

- Modifying existing SQLite database schemas or server middleware endpoints.
- Introducing external charting libraries (Chart.js / Recharts).
- Modifying tax deduction formulas or dividend NHI calculation engines.

---

## Further Notes

All changes strictly follow KISS principles, eliminating data distortion while preserving sub-second client-side reactivity and zero external bundle bloat.
