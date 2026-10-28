# 0208 Specification: 投資組合與庫存法人級會計修復、跨帳戶隔離、斷頭管線貫通與風控歸因升級規格 (Portfolio & Inventory Institutional Accounting Repair, Account Isolation, Pipeline Wiring, and Risk Attribution Upgrade)

## Problem Statement

使用者在「投資組合與庫存 (Portfolio & Inventory)」頁面進行日常看盤、跨券商核帳與機構級風險管理時，面臨以下 4 大領域、共 24 項實質數據失真、管線斷裂與功能缺口：

1. **假常數與底層會計恆等式裂痕 (Hardcoded Constants & Accounting Flaws)**：
   - **美股雙軸 FX 匯差寫死 `32.0`**：計算美股股票本體價差與外匯匯差時，買進基準匯率被硬編碼為 `32.0`，導致外匯歸因完全失真。
   - **已平倉與部分平倉總報酬率失真**：`totalReturnPercent` 以當前剩餘在倉成本 (`finalCostBasis`) 為分母，導致已清倉標的 (`shares === 0`) 的已實現報酬率永遠顯示 `+0.00%`，而部分減碼留零股之標的報酬率暴衝失真。
   - **雙會計引擎 (`calculator` vs `lotEngine`) 脫鉤**：`lotEngine` 漏實作 `ADJUSTMENT`、`STOCK_MERGER`、`SPIN_OFF` 與 `MARGIN_BUY/SELL`，且多批次配股 (`STOCK_DIVIDEND`) 與減資 (`CAPITAL_REDUCTION`) 缺乏尾差收斂，導致批次成本覆蓋後與總股數脫鉤。
   - **除權息應收股利 (`receivableDividendEngine`) 4 大漏洞**：呼叫 `estimatePaymentDate` 漏傳 `symbol` 參數致 75 行官方發放日表失效；除息後賣出清倉導致應收股利憑空蒸發；已登錄進帳本的股利未排除導致雙重計算 (Double Counting)；`HoldingsTable` 將尚未除息 (`UPCOMING_EX`) 的預告股息誤納入除息平滑補償。
   - **XIRR 與淨曝險/融資負債黑洞**：計算整戶 XIRR 時漏傳 `fxMap` 退回 `32.0`；無借貸時將淨槓桿 (`netLeverage`) 硬設為 `0.00x` 與公式矛盾；在倉融資買進 (`isMargin`) 的券商融資負債未計入總負債與淨值，導致與「資產成長 (NAV)」頁面的期末淨值差額達 60%。

2. **多帳戶 (`selectedAccountId`) 與多市場 (`currentMarket`) 維度污染**：
   - 頂部切換特定券商帳戶時，`portfolioXirr`、`cashLedgerSummary`、`scopedLoans`、`AllocationChart`、`MarginStressModal`、`HoldingsTable` 展開時間軸與 `LotsBreakdownModal` 未同步過濾該券商帳戶，造成「表內外數字打架、全帳戶金流配單一帳戶市值」的嚴重混血錯誤。
   - 切換至台股 (`TW`) 視圖時，`AllocationChart` 仍混入美金現金。
   - `ReconciliationModal`（持倉對帳審計）生成的 `ADJUSTMENT` 調整單未綁定真實 `accountId`，導致非預設帳戶對帳失效。
   - `rebalancingEngine`（再平衡引擎）將容忍帶條件 `&&` 誤寫為 `||` 導致 5% 容忍帶 100% 失效、忽略非目標在倉股的賣出建議、注水模式將帳上現金重複加總兩次。
   - `behavioralAuditEngine` 凹單天數誤用 `lastTradeDate`（一領股息即重置為 1 天），且追高/冷靜勝率寫死為 `35.0% / 65.0%`；`TradeModal` 將 `00679B`/`00631L` 等帶字母尾碼之台股 ETF 誤判為美股。

3. **斷頭幽靈管線與本機湖倉 (Lakehouse) 脫鉤**：
   - `FrictionCenterModal`（含台股二代健保與美股海外所得 100萬/750萬稅階雷達）與 `BrokerAccountsModal` 在 `App.tsx` 無任何觸發入口，淪為無法開啟的幽靈功能。
   - `lookThroughEngine` 將一般個股硬塞為 `'台股投資標的'` / `'美股投資標的'`，未串接 `stockDictionary` 真實產業分類；`TreemapChart` 穿透模式分母漏計現金且遺漏負債節點。
   - 啟動時 `loadMarketCacheSummary` 未將本機快取中的 `previousClose` 與歷史日 K (`candles`) 水合至 `quotes`，導致休市/離線時今日漲跌與 15 大技術信號膠囊降級。

4. **法人風控歸因指標與 UX 閉環缺口**：
   - 缺乏個股「**持倉權重 (`Weight %`)**」、「**今日損益對整戶基點貢獻 (`Attribution bps`)**」、「**HHI 投組集中度指數**」與「**整戶停損最大承擔風險 (`Total Capital at Risk`)**」。
   - `HoldingsTable` 表頭無法點擊排序、缺乏「**標準清爽 / 法人深研**」視圖密度切換與「**👁️ 隱私遮罩**」，且展開時間軸將 `ADJUSTMENT` 等誤標為「現金增資」並缺少「**✏️ 就地編輯**」按鈕。

---

## Solution

遵循 KISS 原則與零外部套件膨脹方針，執行四大模組的精準修復與機構級升級：

1. **底層會計、除權息、XIRR 與淨曝險引擎校準**：
   - 由 `historicalFx` 對齊各批次買入日加權計算真實美股成本匯率 `avgCostFxRate`，廢除硬編碼 `32.0`。
   - 為每檔標的建立 `historicalTotalInvestedCost`（歷史累計總投入成本），作為已平倉與含已實現總報酬率之分母，根除已平倉 `+0.00%` 與部分減碼分母失真。
   - 於 `lotEngine` 完整支援 `ADJUSTMENT`、`STOCK_MERGER`、`SPIN_OFF`、`MARGIN_BUY/SELL` 及多批次配股/減資尾差收斂。
   - 修復 `receivableDividendEngine`：補傳 `symbol` 激活官方發放日表、支援除息後賣股保留應收股利、排除已入帳配息防重複計算、僅對 `PENDING_PAYMENT` 執行除息平滑。
   - 對齊跨頁實質總淨值 (NAV)：納入股票市值、帳戶現金、應收股利並扣除質押與融資買進 (`isMargin`) 負債；區分「股票淨曝險率 (`Net Exposure Ratio`)」與「負債槓桿比 (`LTV`)」；補傳 `fxMap` 至整戶 XIRR。

2. **多帳戶/多市場嚴格隔離、再平衡修復與快速下單對齊**：
   - 在 `App.tsx` 統一建立依 `selectedAccountId` 與 `currentMarket` 嚴格過濾之 `scopedTrades`、`scopedCash`、`scopedLoans` 與 `scopedCashLedger`，貫穿 `SummaryCards`、`AllocationChart`、`HoldingsTable`、`LotsBreakdownModal`、`MarginStressModal` 與 `portfolioXirr`。
   - `ReconciliationModal` 改為選取真實 `BrokerAccount` 並將 `accountId` 寫入 `ADJUSTMENT` 調整單。
   - 修復 `rebalancingEngine`：將 `||` 修正為 `&&` 恢復容忍帶、納入非目標在倉股賣出建議、修正注水模式現金重複加總、支援未持有目標標的參考價。
   - `behavioralAuditEngine` 改以批次真實建倉日計算凹單天數並動態統計真實勝率；`TradeModal` 採用 `/^[0-9]{4,6}[A-Za-z]?$/` 精準識別台股 ETF 與特別股。

3. **貫通斷頭管線、真實產業穿透與本機湖倉快取水合**：
   - 於 `SummaryCards` 被動收益卡增設待入帳應收股利膠囊、整戶成本殖利率 (YoC %) 與「⚖️ 稅費與合規雷達」按鈕，一鍵開啟 `FrictionCenterModal`。
   - `lookThroughEngine` 串接 `stockDictionary` 與 `etfHoldingsData` 解析真實產業分類；`TreemapChart` 穿透模式對齊含現金與負債之總資產分母。
   - `loadMarketCacheSummary` 啟動時同步水合 `previousClose`、`change`、`changePercent` 與日 K `candles` 至 `quotes`。

4. **法人風控歸因指標與 `HoldingsTable` 操作閉環**：
   - 於 `HoldingsTable` 現有欄位次行內嵌「持倉權重 `%`」與「今日損益基點貢獻 (`±XX bps`)」；於 `AllocationChart` 標題列呈現「HHI 集中度指數」；於 `SummaryCards` 呈現「觸及停損最大承擔風險 (`Total Capital at Risk`)」。
   - `HoldingsTable` 增設表頭點擊排序、`[ 標準清爽 | 法人深研 ]` 密度切換、`[ 👁️ 隱私遮罩 ]`（遮蔽絕對金額、保留百分比與 bps），並修復展開時間軸之交易類別標籤與「✏️ 就地編輯」按鈕。

---

## User Stories

1. As a US stock investor, I want my FX gain/loss breakdown to use the actual weighted historical exchange rate from my purchase dates rather than a hardcoded 32.0, so that I can accurately separate stock alpha from currency fluctuations.
2. As an active trader, I want closed positions (`CLOSED`) and partially sold positions to calculate total return percentage against historical cumulative invested capital (`historicalTotalInvestedCost`), so that closed positions no longer display `+0.00%` and partial sells do not artificially inflate return percentages.
3. As an auditor using FIFO/LIFO/HIFO accounting, I want `lotEngine` to process audit adjustments (`ADJUSTMENT`), spin-offs (`SPIN_OFF`), mergers (`STOCK_MERGER`), margin trades (`MARGIN_BUY`/`MARGIN_SELL`), and exact last-lot rounding for stock dividends and capital reductions, so that lot-level cost basis always matches position-level shares and cost.
4. As a dividend investor, I want `receivableDividendEngine` to pass the `symbol` parameter into `estimatePaymentDate`, retain receivable dividends even if I sell the stock after the ex-dividend date, exclude dividends already logged in `trades`, and only apply dividend smoothing to `PENDING_PAYMENT` (post-ex-date) items, so that my dividend cash flows and smoothed PnL are 100% accurate without double counting.
5. As a multi-account investor, I want selecting a specific broker account (`selectedAccountId`) or market (`currentMarket`) in the header to strictly filter holdings, cash balances, loans, XIRR cash flows, allocation charts, margin stress tests, trade timelines, and lot breakdown modals to that exact scope, so that inner modals and summary cards never contradict the table.
6. As a portfolio manager, I want the first summary card to clearly display the true Portfolio Net Asset Value (NAV, including stock value, cash, and receivable dividends minus loans and margin debt) alongside the true Net Exposure Ratio (`Stock Value / NAV`, where 100% cash-backed equity is `1.00x`), so that my NAV matches the Growth page and avoids the contradictory `0.00x` display.
7. As a compliance-conscious investor, I want a direct button on the passive income summary card to open the `FrictionCenterModal` and view my Taiwan 2.11% NHI supplemental premium alerts and US 1M/7.5M AMT tax threshold progress, alongside receivable dividend badges and portfolio Yield on Cost (YoC).
8. As a user reconciling holdings via `ReconciliationModal`, I want to select my actual `BrokerAccount` from a dropdown so that generated `ADJUSTMENT` trades are bound to the target `accountId` and immediately calibrate that account's share count.
9. As an asset allocator using `RebalancingView`, I want the tolerance band check to require both drift exceeding tolerance AND trade value exceeding the minimum threshold (`&&`), include non-target active holdings as `SELL` recommendations in full rebalance mode, and avoid double-counting existing cash balance in cash-in mode.
10. As a swing trader, I want bag-holding alerts (`isBagHolding`) to calculate holding duration from the actual lot acquisition dates rather than `lastTradeDate` (which gets reset by dividends), and FOMO win rates to be computed from actual trade outcomes rather than hardcoded `35% / 65%`.
11. As a Taiwan ETF investor holding bond or leveraged ETFs (e.g., `00679B`, `00631L`, `00411A`), I want clicking quick buy/sell in `HoldingsTable` to recognize alphanumeric Taiwan symbols as `TW` market (`TWD`) in `TradeModal` rather than misclassifying them as `US` stocks.
12. As a risk-aware investor, I want `lookThroughEngine` to resolve real sector categories from `stockDictionary` and `etfHoldingsData` instead of generic `'台股投資標的'` strings, and `TreemapChart` in Look-Through mode to include cash and debt consistently in its NAV denominator.
13. As an institutional-grade user, I want to see each holding's portfolio weight (`Weight %`), today's PnL attribution in basis points (`±XX bps`), the portfolio Herfindahl-Hirschman Index (`HHI`) concentration badge, and the aggregated `Total Capital at Risk` (maximum loss if all positions hit their stop-loss prices), so that I can manage concentration and downside risk quantitatively.
14. As a daily platform user, I want `HoldingsTable` to support clickable column sorting, a `[ 標準清爽 | 法人深研 ]` view density toggle, a `[ 👁️ 隱私遮罩 ]` privacy mask button, accurate timeline badges for all corporate action types, and an inline `✏️ 編輯` button on each timeline trade row to edit stop-loss plans or post-trade reviews directly.

---

## Implementation Decisions

### Decision 1: Accounting, Lot Engine, and FX Cost Rate Calibration
- Extend `HoldingPosition` interface with `historicalTotalInvestedCost: number`, `avgCostFxRate?: number`, `portfolioWeightPercent?: number`, and `todayAttributionBps?: number`.
- In `calculator.ts`, accumulate `historicalTotalInvestedCost` across all `BUY`, `MARGIN_BUY`, `CAPITAL_INCREASE`, and `CB_CONVERSION` trades (net of `SPIN_OFF` transferred cost). Use `historicalTotalInvestedCost` as the denominator for `totalReturnPercent` when a position is closed (`shares === 0`) or has realized PnL, preventing `+0.00%` on closed positions and denominator distortion on partial sells.
- In `calculator.ts` and `fxBreakdown.ts`, compute `avgCostFxRate` for US holdings by weighting each open lot's (or buy trade's) USD cost with the historical USD/TWD rate from `historicalFx` on `buyDate` (falling back to the nearest prior date or `usdToTwdRate`). Pass `item.avgCostFxRate || usdToTwdRate` into `calculateHoldingFxBreakdown` in `HoldingsTable.tsx`.
- In `lotEngine.ts`, implement handlers for `MARGIN_BUY`, `MARGIN_SELL`, `ADJUSTMENT`, `STOCK_MERGER`, and `SPIN_OFF`, and apply last-lot remainder convergence for `STOCK_DIVIDEND` and `CAPITAL_REDUCTION` so `sum(openLots.remainingShares)` and `sum(openLots.totalCostBasis)` remain 100% identical to `calculator.ts`.

### Decision 2: Receivable Dividend Engine & Ex-Dividend Smoothing Guard
- In `receivableDividendEngine.ts`:
  - Pass `symbol` as the 3rd argument to `estimatePaymentDate(exDate, market, symbol)` in all call sites.
  - Check historical eligibility via `getHoldingsAsOfDate(trades, prevDay, symbol)` without skipping symbols whose current `holding.shares === 0`, preserving receivable dividends for positions sold after the ex-dividend date.
  - Exclude official dividend events if a matching `DIVIDEND` trade for the same symbol and ex-date/pay-date window is already recorded in `trades`.
- In `HoldingsTable.tsx`, only apply smoothed PnL compensation for receivable dividends with `status === 'PENDING_PAYMENT'` (already ex-dividend, awaiting payout), excluding `UPCOMING_EX`.

### Decision 3: Multi-Account/Market Scope Isolation, Net Exposure, and Margin Debt Alignment
- In `App.tsx`, derive account-and-market scoped collections (`scopedTrades`, `scopedCashTransactions`, `scopedLoans`, `scopedCashLedgerSummary`) whenever `selectedAccountId !== 'ALL'` or `currentMarket !== 'ALL'`.
- Pass `scopedTrades` into `HoldingsTable` (which forwards them to the expanded timeline and `LotsBreakdownModal`) and `handleInspectSecurityXirr`.
- Pass `fxMap: historicalFx` into `calculatePortfolioXirr`, and compute `terminalNAV` as true scoped Net Asset Value (`Stock Market Value + Scoped Cash + Scoped Pending Receivable Dividends - Scoped Loans - Scoped Margin Debt`).
- In `riskExposureEngine.ts`, include active margin debt from `isMargin` / `MARGIN_BUY` positions and receivable dividends in `navTWD`, and compute `netLeverage` (Net Exposure Ratio) as `totalStockValueTWD / effectiveNavTWD` (e.g., `1.00x` when 100% invested in cash-backed equities, `0.00x` only when holding 0 equities), eliminating the contradictory `0.00x` jump.
- Hydrate `previousClose`, `change`, `changePercent`, and `candles` from `loadMarketCacheSummary` into initial `quotes` / `historicalCandlesMap` so technical signal capsules work offline and after hours.

### Decision 4: Rebalancing, Behavioral Audit, Reconciliation, and TradeModal Fixes
- In `rebalancingEngine.ts`:
  - Change line 354 condition from `Math.abs(item.driftPercent) > tolerance || Math.abs(diffTwd) >= 1000` to `Math.abs(item.driftPercent) > tolerance && Math.abs(diffTwd) >= 1000`.
  - In `SYMBOL` mode, append any active holdings not present in `config.items` with `targetPercent: 0` so full rebalance recommends selling non-target positions.
  - In `RebalancingView.tsx`, default `cashInflow` to `0` (representing new external capital injection) or clearly separate existing cash from new external inflow so `cashBalanceTwd` is never double-counted.
- In `ReconciliationModal.tsx`, accept `accounts: BrokerAccount[]` and `selectedAccountId?: string`, provide an account selector dropdown, and attach the selected `accountId` to generated `ADJUSTMENT` trades.
- In `behavioralAuditEngine.ts`, compute `holdingDays` in `detectBagHoldingPositions` using the earliest open lot date or weighted holding days from `h.lots` instead of `h.lastTradeDate`, and compute `chasingHighWinRate` / `calmEntryWinRate` from actual trade history (falling back to baseline only when sample size is 0).
- In `TradeModal.tsx`, update Taiwan symbol detection regex to `/^[0-9]{4,6}[A-Za-z]?$/` so `00679B`, `00631L`, `00411A`, etc. are accurately routed to `TW` (`TWD`).

### Decision 5: Institutional Risk Attribution (Weight %, bps, HHI, Capital-at-Risk), Pipeline Wiring, and UX Controls
- **Look-Through & Friction Wiring**:
  - In `lookThroughEngine.ts`, resolve sector names for direct holdings via `STATIC_TW_STOCKS` (`category`) and `etfHoldingsData` before falling back, and allow ETF constituent sectors to upgrade generic sector labels.
  - In `TreemapChart.tsx`, include `cashBalanceTwd` and `effectiveDebt` in `LOOK_THROUGH` mode and use total gross assets as the tooltip percentage denominator.
  - Wire `onOpenFrictionCenter` into `SummaryCards.tsx` (on the 4th Passive Income & Tax card) and display receivable dividends and Portfolio YoC %.
- **Institutional Metrics**:
  - Compute **HHI Concentration Index** ($\sum (w_i \times 100)^2$) in `AllocationChart.tsx` and render a status badge (`<1500 分散健康`, `1500~2500 中度集中`, `>=2500 高度集中`).
  - Compute **Total Capital at Risk (CaR)** across active holdings with `stopLossPrice` (and track % of holdings without stop-loss) and display in `SummaryCards.tsx`.
  - Display individual **Portfolio Weight (`權重 XX.X%`)** under Market Value and **Today's Attribution (`±XX bps`)** next to Today's PnL in `HoldingsTable.tsx`.
- **HoldingsTable UX Controls**:
  - Add clickable column sorting on `HoldingsTable` headers (`symbol`, `shares`, `marketValue`, `unrealizedPnL`, `unrealizedPnLPercent`, `totalReturnPnL`, `todaysPnL`).
  - Add `[ 標準清爽 | 法人深研 ]` density toggle and `[ 👁️ 隱私遮罩 ]` privacy mask toggle (propagated across `Portfolio` tab components).
  - Fix expanded timeline badge labels for all `TradeType` values (`ADJUSTMENT`, `SPIN_OFF`, `STOCK_MERGER`, `CB_CONVERSION`, `TENDER_OFFER`, `PREFERRED_REDEMPTION`) and add an inline `✏️ 編輯` button per trade row calling `onEditTrade`.

---

## Testing Decisions

- **What makes a good test**: Tests must assert public outputs and rendered DOM behaviors across the highest possible seams without coupling to internal private state.
- **Test Seams**:
  - **Seam 1 (`src/engine/calculator.test.ts` & `src/engine/lotEngine.test.ts`)**: Verify `historicalTotalInvestedCost` closed/partial return percentages, `avgCostFxRate` weighted FX breakdown, `lotEngine` parity on `ADJUSTMENT`/`SPIN_OFF`/`STOCK_MERGER`/`MARGIN_BUY`, and last-lot rounding convergence.
  - **Seam 2 (`src/engine/receivableDividendEngine.test.ts` & `src/engine/riskExposureEngine.test.ts`)**: Verify `estimatePaymentDate` with `symbol`, post-ex-date sold stock receivable retention, deduplication against logged `DIVIDEND` trades, `PENDING_PAYMENT`-only smoothing, margin debt inclusion in NAV, and true `Net Exposure Ratio` (`1.00x` for cash-backed full equity).
  - **Seam 3 (`src/engine/rebalancingEngine.test.ts`, `src/engine/lookThroughEngine.test.ts`, `src/engine/behavioralAuditEngine.test.ts`)**: Verify `&&` tolerance band enforcement, non-target holding sell recommendations, real sector resolution from `stockDictionary`, and lot-based bag-holding duration.
  - **Seam 4 (`src/components/HoldingsTable.test.tsx`, `src/components/SummaryCards.test.tsx`, `src/components/AllocationChart.test.ts`)**: Verify HHI calculation, Capital-at-Risk display, `FrictionCenterModal` trigger, weight % and bps rendering, column sorting, compact/pro density toggle, privacy mask `***` obfuscation, inline timeline trade edit button, and `00679B` TW market recognition in `TradeModal`.

---

## Out of Scope

- Adding external charting or table dependencies (e.g., AG-Grid, TanStack Table, Recharts).
- Modifying backend SQLite schema structures.
- Introducing Monte Carlo or parametric covariance matrix VaR simulations on the client thread.

---

## Further Notes

All 24 enhancements strictly adhere to KISS and First Principles, turning existing disconnected modules into a unified, zero-mock, institutional-grade portfolio workstation.

