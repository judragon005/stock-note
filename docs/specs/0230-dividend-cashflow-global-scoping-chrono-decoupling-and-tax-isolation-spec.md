# 規格書 0230：股利現金流全域同態收縮、時序因果阻斷、跨境稅制隔離與自然鍵防撞規格書 (Spec 0230)

## Problem Statement

使用者在「股利收益日誌與現金流全景」面板中進行深度財務檢視時，發現並回報了一系列跨時序、跨市場、跨元件的數據失真與結構性缺陷：
1. **未來預約款項時序倒灌（Chrono Taint & Ghost Cashflow）**：
   - 使用者或系統測試在明細中記錄了一筆「2026-12-16 華邦電 (2344) 預約股利」後，歷史月份學習器（`extractHistoricalPayoutMonths`）因缺乏發放日時序門禁，誤將 12 月學習為華邦電的每年度常態發放月。
   - 現金流投影引擎在 12 月份對華邦電套用 4.5% 粗估殖利率（20,000 股 $\times$ 現價 25 元 $\times$ 4.5%），在 12 月份憑空捏造出 **NT$ 22,500** 的幽靈現金流，導致 12 月總額虛胖為 NT$ 41,427（69%）。
   - 該虛胖數值徹底抹滅了 12 月原本實質為「枯水期（真實 NT$ 18,927，僅佔月均 31%）」的事實，導致系統下方的「00929/00934 互補配置推薦」遺漏了 12 月份的枯水期填補建議。
2. **全域持股與借貸過濾域撕裂（Scoping Fracture）**：
   - 頂層過濾器切換為「美股市場」或「特定券商/質押子帳戶」時，`scopedTrades` 與 `scopedReceivables` 雖然正確過濾，但頂層卻將**未經任何過濾的原始全量 `holdings` 裸傳給投影引擎**；且質押借貸利息也未按帳戶過濾，導致美股看板中依然算出台股華邦電與全域質押利息。
3. **未到期預約款項偷跑券商對帳單（Pre-mature Reconciliation Leak）**：
   - 年度各標的券商對帳小計（`annualReconciliationList`）僅以年份字串比對，未檢驗款項是否已實質入帳，將未來未到期的預約款項提前計入券商對帳小計，導致系統金額與券商 APP 實際入帳存摺對不上。
4. **雙軌應收股利與長條圖脫節（Chart-Card Desync）**：
   - 「除息待入帳行事曆面板」消費的是已融合本地預約交易的 `activeReceivables`；但「月度長條圖」底層的 `aggregateDividendReport` 卻消費未融合的原始清單，導致待入帳卡片顯示有款項，長條圖對應月份的待入帳柱狀圖卻為 0。
5. **跨境稅收管轄邊界違規（Cross-Border Tax Contamination）**：
   - 台灣所得稅法 8.5% 股利抵扣額（上限 8 萬）直接消費包含美股海外所得換算之台幣總額，嚴重違反海外所得採「最低稅負制」、不得享有台灣本土 8.5% 境內股利抵扣之稅制法規。
6. **金融事件自然鍵碰撞引發雙重認列（Double Counting Collision）**：
   - 官方除息公告與手動預約交易以 `payDate` 比對，若兩者因券商延遲有 1~2 天誤差，將被判定為兩筆不同事件，導致待入帳金額暴增 200%。
7. **歷史填息拿 2026 現價判定與 YOC 尺度失真（Look-Ahead & Scale Distortion）**：
   - 五年前的除息交易拿 2026 年今日現價判定是否填息；季配/月配股票之單次配息直接除以成本，台積電每季配息顯示為 YOC 0.4%，造成嚴重視覺尺度失真。

---

## Solution

1. **建立時序因果屏障（Causal Horizon Wall）**：
   - 於 `extractHistoricalPayoutMonths` 與 `annualReconciliationList` 注入 `currentDateStr` 嚴格物理門禁，凡 `payDate > currentDateStr` 之未結算款項，**物理性禁止反向倒灌歷史慣性庫或計入券商對帳小計**。
   - 華邦電 (2344) 12 月幽靈現金流徹底歸零，12 月實質現金流自癒修正為 NT$ 18,927，系統精準自動恢復 12 月為「枯水期（31%）」，並連帶觸發 12 月互補配置建議。
2. **全域過濾同態收縮中樞（Homomorphic Scoping Context）**：
   - 在頂層建立 `scopedHoldings` 與 `scopedLoans`，使「持股清單」、「質押借貸利息」、「交易明細」、「應收股利」、「滾動現金流投影」五大資料流對齊 `market` 與 `selectedAccountId`，杜絕跨市場/跨帳戶幽靈股票與利息洩漏。
3. **單一事實來源報表聚合（SSOT Unified Receivables into Reporting）**：
   - `aggregateDividendReport` 改為直接消費已融合去重之 `activeReceivables`，確保「除息待入帳行事曆面板」與「各月份現金流分佈長條圖」消費 100% 同源之應收數據，消滅長條圖待入帳消失之 Bug。
4. **法定跨境稅制水密艙隔離（Watertight Tax Jurisdiction Bulwark）**：
   - 報表聚合引擎獨立統計 `currentYearTwDividendsTWD`（中華民國境內公司分配之股利 54C），8.5% 綜所稅抵扣額僅允許境內股利進入，徹底隔離美股海外所得。
5. **金融事件自然鍵防撞去重（Natural Key Deduplication Protocol）**：
   - 以 `Market_Symbol_ExDate`（除息基準日唯一不變性）取代易變的 `payDate` 作為雙軌應收去重中樞，徹底阻斷官方推估與手動記帳之雙重認列。
6. **年化 YOC 與歷史時點填息校準（Annualized YOC & Point-in-Time Fill Status）**：
   - YOC 引進頻率加權因子（季配 $\times 4$、月配 $\times 12$），顯示真實年化殖利率；歷史交易明細折合台幣優先調用成交當日匯率快照（`trade.exchangeRate`），杜絕全域即時匯率硬乘產生的幽靈匯差。

---

## User Stories

1. As a dividend investor holding 20,000 shares of Winbond (2344), I want the projected cashflow calendar in December to show NT$ 0 instead of a fabricated NT$ 22,500, so that forward projections reflect empirical summer payout habits (August) rather than a misclassified winter distribution.
2. As a retiree relying on dividend cashflow, I want the system to accurately flag December as a dry season month (NT$ 18,927, 31% coverage) once the phantom Winbond dividend is removed, so that the complementary ETF recommendation system (e.g., 00929, 00934) actively suggests rebalancing into December.
3. As an investor filtering by US Market, I want the 12-month forward cashflow calendar and top contributors card to strictly exclude TW stocks (like Winbond 2344), so that selecting a market view does not leak cross-market portfolio holdings.
4. As an investor managing segregated sub-accounts (e.g., dedicated pledge loan accounts), I want pledge loan interest expenses and stock positions to strictly scope to the active account filter, so that net carry spreads are calculated per account without cross-account contamination.
5. As an accountant cross-checking broker statements, I want the "Annual Broker Reconciliation Summary" panel to only include settled dividends whose payment dates have actually arrived, so that future booked reservations do not inflate my historical statement reconciliation.
6. As a visual trader looking at the Monthly Dividend Distribution bar chart, I want upcoming pending dividends recorded in the table to display as orange hatched bars in the chart for that month, so that the chart and the pending cards never contradict each other.
7. As a Taiwan taxpayer holding both TW and US equities, I want the 8.5% dividend tax deduction calculation (capped at NT$ 80,000) to strictly consume Taiwan-sourced domestic dividends (54C), so that foreign US dividend withholdings (30%) do not illegally consume my domestic deduction allowance.
8. As a user recording a dividend reservation whose estimated pay date slightly differs from the official crawler (e.g., Dec 16 vs Dec 18), I want the system to de-duplicate on `Market_Symbol_ExDate`, so that my pending cashflow is not doubled by accident.
9. As a long-term compounder reviewing quarterly dividend payers like TSMC (2330), I want the Yield on Cost (YOC) column to reflect annualized yields (dividend $\times 4 / \text{cost}$) rather than an unannualized 0.4%, so that yields remain cognitively comparable across monthly, quarterly, and annual payers.
10. As a multi-year investor reviewing foreign dividends from 2021, I want historical USD conversions to respect the recorded transaction exchange rate rather than multiplying by today's spot rate (32.5), so that historical records match my actual bank passbook deposits.
11. As a user experimenting with monthly budget goals, I want custom expense inputs to enforce numerical guardrails (NT$ 1,000 to NT$ 1,000,000), so that typing edge values or clearing inputs never crashes the calendar into `NaN%`.

---

## Implementation Decisions

1. **頂層資料同態收縮實施（Homomorphic Scoping Implementation）**：
   - 在 `DividendLogView` 內部建立 `scopedHoldings` 與 `scopedLoans`：
     ```typescript
     // Prototype derived snippet
     const scopedHoldings = useMemo(() => {
       return holdings.filter((h) => {
         if (market !== 'ALL' && h.market !== market) return false;
         if (selectedAccountId && selectedAccountId !== 'ALL' && h.accountId && h.accountId !== selectedAccountId) return false;
         return true;
       });
     }, [holdings, market, selectedAccountId]);
     ```
   - 將 `scopedHoldings` 注入 `generate12MonthProjectedCashflow` 與 `DividendTopContributorsCard`。
2. **時序因果屏障純函式改造（Causal Horizon Invariant）**：
   - 改造 `extractHistoricalPayoutMonths(trades: TradeRecord[], currentDateStr: string)`，加入 `payDate <= currentDateStr` 篩選。
   - 改造 `annualReconciliationList`，增加 `payDate <= todayStr` 門禁。
3. **SSOT 報表聚合器輸入升級（SSOT Reporting Ingestion）**：
   - 調整 `DividendLogView` 調用 `aggregateDividendReport`，改為傳入 `activeReceivables`（統一融合應收選擇器產物）。
   - 在 `aggregateDividendReport` 回傳結構中增列 `currentYearTwDividendsTWD`，專供 `taxStats` 計算。
4. **金融自然鍵去重演算法升級（Natural Key De-duplication）**：
   - `buildUnifiedPendingReceivables` 改用 `${market}_${symbol}_${exDate}` 作為唯一防撞鍵。
5. **指標尺度與匯率回溯補強（Metrics & FX Retrofit）**：
   - 在 `DividendHistoryTable` 中依據標的配息頻率（`MONTHLY`: 12, `QUARTERLY`: 4, `SEMI_ANNUAL`: 2, `ANNUAL`: 1）動態換算年化 YOC。
   - 外幣折合台幣優先讀取 `t.exchangeRate`，未記錄時 fallback 至全域即時匯率。
6. **投影常態庫擴充（Default Profile Expansion）**：
   - 於 `projectedCashflowEngine.ts` 擴充台股常見年配與半導體股常態設定：
     - `2344` (華邦電): `ANNUAL`, `payoutMonths: [8]`, `defaultYield: 0.025`, `isCyclical: true`
     - `2303` (聯電): `ANNUAL`, `payoutMonths: [7]`, `defaultYield: 0.05`
     - `2454` (聯發科): `SEMI_ANNUAL`, `payoutMonths: [1, 7]`, `defaultYield: 0.045`

---

## Testing Decisions

- **單元測試行為驗證（Black-Box Behavioral Testing）**：
  - 驗證 `extractHistoricalPayoutMonths` 在傳入未來預約交易時，回傳的月份陣列中絕不包含未來的月份。
  - 驗證 `buildUnifiedPendingReceivables` 當官方公告與手動預約發放日不同但除息基準日相同時，長度為 1（無雙重認列）。
  - 驗證 `generate12MonthProjectedCashflow` 當持股包含華邦電時，12 月份預估金額為 0，8 月份出現合理預估。
  - 驗證 `aggregateDividendReport` 產出之 `currentYearTwDividendsTWD` 嚴格只累計台股市場交易，美股交易 100% 隔離。
- **元件整合測試（Component Integration Testing）**：
  - 在 `DividendLogView.test.ts` 中驗證切換 `market = 'US'` 時，投影行事曆不再出現台股標的。
  - 驗證 `annualReconciliationList` 在有未來預約交易時，對帳小計僅累計到期入帳交易。

---

## Out of Scope

- 國稅局綜合所得稅多級距（5%、12%、20% 等）申報試算器（維持聚焦於 8.5% 股利抵減額與 8 萬上限）。
- 匯率即時波動避險損益衍生品分析。
- 股票股利（配股）入庫之全自動小數點零股強制拋售功能。

---

## Further Notes

- 本規格實施後，使用者在未來 12 個月現金流預估行事曆中所看到的 12 月份，將從虛假的 NT$ 41,427 自癒為真實的 NT$ 18,927，並正確觸發枯水期警示與 00929 補強推薦。
- 本規格全面相容既有 IndexedDB 儲存結構，無需執行任何破壞性資料庫 Migration。
