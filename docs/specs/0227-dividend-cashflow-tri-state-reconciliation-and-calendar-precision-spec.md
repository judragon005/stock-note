# 0227 Spec: 現金流三態時序統一、股利發放月精準對齊與月度日曆勾稽重構規格書 (Dividend Cashflow Tri-State Reconciliation, Payout Month Alignment & Calendar Precision)

## Problem Statement

使用者在「股利收益日誌與現金流全景」頁面中面臨嚴重的數據矛盾與認知挫折：
1. **各元件間月份筆數對不上**：「未來 12 個月現金流預估行事曆」顯示的各月份筆數與金額，與下方「各月份現金流分佈」長條圖及「歷史現金股利入帳明細」完全對不上。尤其預估行事曆中 8 月份突然暴衝出「29 筆配息」（高達 520% 超標），而其餘多個月份卻被誤判為枯水期。
2. **11 月份明明有 0056 配息入帳，下方歷史表格與月度圖卻完全空白**：
   - 預估引擎中將 0056 的除息月（1, 4, 7, 10 月）誤當作發放月，導致 0056 預估現金流被排在 10 月，而 11 月預估顯示的 1 筆其實是 00878 或其他標的；
   - 下方的月度長條圖與歷史明細表只收錄「已入帳交易 (`isSettled = payDate <= todayStr`)」，未到期的應收股利（`receivableDividends`）在長條圖中直接被歸零（11、12 月無長條），在歷史明細表中完全隱形；
3. **現金流三態（預估 Projection / 應收 Accrual / 實領 Settled）割裂**：三大元件各自為政，缺乏時序狀態鏈路與統一的勾稽指示，導致使用者無法分辨哪些是「庫存粗估期望值」、哪些是「除息後待入帳款項」、哪些是「銀行實領流水」。

---

## Solution

在不重複造輪子且嚴格遵守 KISS 原則下，重構現金流時序鏈路與預估配置：
1. **修正 ETF 與核心權值股發放月份慣性庫**：嚴格區分「除息月 (Ex-Month)」與「現金發放月 (Payout-Month)」，將 0056 正確修正為 `[2, 5, 8, 11]` 月，並與專案既有的 `OFFICIAL_TW_PAY_DATE_MAP` 官方常態庫對齊。
2. **消除年配股無差別集中 8 月之硬編碼**：廢除「所有未收錄股票一律硬塞在 8 月以 4% 粗估」的粗暴邏輯。改由優先萃取該標的於 `trades` 中的歷史實質發放月份；若無歷史紀錄則標註為「*發放期待定*」或依台股除權息週期（7~9月）平滑推估，杜絕單月 29 筆的假性高峰。
3. **月度長條圖升級「三態分層堆疊 (Tri-State Stacked Bars)」**：月度圖表在已結算月份顯示綠色實心柱（已實領），在當前或未來月份若存在已除息之應收股利（`scopedReceivables`），以金黃色條紋柱/高亮分層堆疊呈現，讓 11、12 月不再突兀空白，並在 Tooltip 清晰列出實領額與待入帳款項。
4. **歷史明細表整合「待入帳款項與一鍵已入帳」快速切換**：在明細表頂部增加清晰的時序口徑提示，並提供「待入帳款項」檢視與「一鍵已入帳」操作，收到入帳通知即可秒級轉化為正式交易紀錄。

---

## User Stories

1. As a dividend investor, I want the 12-month projected cashflow calendar to correctly project 0056 payouts in February, May, August, and November, so that my expected cashflow matches actual ETF payment dates instead of ex-dividend dates.
2. As a dividend investor, I want stocks without a hardcoded profile to not blindly concentrate in August with 29 payouts, so that my dry season alerts and monthly coverage ratios are not distorted by artificial spikes.
3. As a dividend investor, I want stocks with historical trade records to use their actual historical dividend payment months for forward projection, so that my portfolio's unique payout rhythms are accurately represented.
4. As a dividend investor, I want the monthly cashflow bar chart to show pending receivable dividends alongside settled dividends in current and upcoming months, so that November and December do not appear as empty zero-bars when payouts are already declared.
5. As an investor planning monthly living expenses, I want the monthly cashflow bar chart to visually distinguish settled cash (solid green) from pending receivables (striped amber), so that I know what is already in my bank vs what is arriving soon.
6. As a dividend investor, I want hovering over a future month in the monthly chart to display a tooltip breaking down both settled amounts and pending receivable items with payment dates, so that I can audit incoming cash.
7. As a stock tracker user, I want the dividend history table to provide a clear indicator or toggle for pending receivables, so that I don't panic when an announced dividend isn't yet listed as a historical settled transaction.
8. As a stock tracker user, I want to click an "Instant Settle" (一鍵已入帳) button directly when my bank app notifies me of a dividend arrival, so that the receivable dividend instantly converts into a realized trade record without manual typing.
9. As an investor using leveraged loans (質押), I want the projected cashflow calendar to compare projected income against monthly interest deductions across all 12 months, so that I have early warning before entering a real dry-season deficit.
10. As a high-dividend ETF investor, I want the system to clearly distinguish between forward projection (期望值), pending receivables (應收款), and settled history (實領淨額), so that I never get confused about why numbers across different cards don't match 1:1.
11. As a desktop user, I want the monthly calendar card, monthly chart, and historical table to maintain sub-pixel layout alignment without horizontal stretching or text truncation, so that the dashboard feels institutional-grade.
12. As a mobile user, I want responsive fallback for the tri-state monthly chart and calendar grid, so that I can inspect my dividend dates cleanly on screens under 768px.

---

## Implementation Decisions

### 1. 模組修改與職責劃分
- **`src/engine/projectedCashflowEngine.ts`**：
  - 更新 `DEFAULT_DIVIDEND_PROFILES`：
    - `0056`: `payoutMonths: [2, 5, 8, 11]` (由 `[1, 4, 7, 10]` 修正為實質發放月)。
    - 補齊或確認 `00878` `[3, 6, 9, 12]`（2/5/8/11 月除息，實質次月發放）、`00919` `[1, 4, 7, 10]`（注意 00919 是 3/6/9/12 月除息，次月發放）、`00713` `[1, 4, 7, 10]`、`2330` `[1, 4, 7, 10]` 之發放月準確性。
  - 重構 `resolvePayoutForMonth` 回退邏輯：
    - 接收可選的歷史交易摘要 `historicalPayoutMonthsMap?: Map<string, number[]>`。
    - 若無歷史紀錄且非內建清單標的，不再單點粗暴回傳 `monthNumber === 8`，而是將粗估殖利率（如 4%）平均分攤至除權息常態月（7、8、9 月）或標註未定，杜絕 8 月份單點暴衝 29 筆之異常。
- **`src/engine/dividendAggregator.ts`**：
  - 在 `aggregateDividendReport` 中擴充 `monthlyDistribution` 的資料結構，使其包含待入帳應收股利金額：
    ```ts
    export interface MonthlyDividendDistributionItem {
      monthKey: string;
      monthLabel: string;
      grossTWD: number;
      netTWD: number;
      taxTWD: number;
      count: number;
      pendingNetTWD?: number;    // 新增：當月待入帳應收股利折合台幣
      pendingCount?: number;     // 新增：當月待入帳筆數
    }
    ```
  - 歷遍 `receivableDividends` 中狀態為 `PENDING_PAYMENT` 或 `OVERDUE` 者，依據其 `payDate`（或推估發放日）的月份歸屬，加總至對應月份的 `pendingNetTWD` 與 `pendingCount`。
- **`src/components/dividend/DividendMonthlyChart.tsx`**：
  - 長條圖柱狀體支援三態視覺：當月若有實領金額，繪製實心綠柱；若有待入帳應收金額，在頂部堆疊金黃色半透明/條紋區塊（或若實領為 0 則顯示金黃色待入帳柱）。
  - Tooltip 升級：同時顯示「已實領：NT$ X」與「待入帳：NT$ Y (N筆)」，並合計當月預期全額。
- **`src/components/dividend/DividendHistoryTable.tsx`**：
  - 在明細表頭與年份切換旁，加入清楚的輔助提示：「此表為銀行實領流水；未到期之除息款項請見上方待入帳行事曆」。
  - 確保待入帳款項具備快捷跳轉或篩選視圖。

### 2. 避免重複造輪子
- 100% 複用 `receivableDividendEngine.ts` 之 `estimatePaymentDate` 與 `OFFICIAL_TW_PAY_DATE_MAP`，不再自行定義第二套發放日對照。
- 100% 複用 `taxComplianceEngine.ts` 與 `cashLedgerEngine.ts`，不變更底層稅務與質押合約接口。

---

## Testing Decisions

### 什麼是好的測試？
只針對**公開介面行為與業務輸出（Black-box Behavior）**進行斷言，嚴禁測試內部私有變數或具體 CSS 像素實作細節。

### 測試模組與覆蓋重點：
1. **`src/engine/projectedCashflowEngine.test.ts`**：
   - 驗證持倉包含 `0056` 時，預估現金流正確出現在 2、5、8、11 月，且 10 月份不再誤含 0056。
   - 驗證持有多檔普通股標的（不在 profiles 清單）時，8 月份不再出現集中暴衝 29 筆，枯水期門檻回歸合理水準。
   - 驗證傳入歷史交易時，優先採用歷史實際發放月作為投影依據。
2. **`src/engine/dividendAggregator.test.ts`**：
   - 驗證當存在 11 月發放之 `ReceivableDividend` 時，`monthlyDistribution` 11 月份包含對應之 `pendingNetTWD` 與 `pendingCount`。
   - 驗證 `currentYearDividendsTWD` 仍維持以已結算（Settled）為準，會計原則不失真。
3. **`src/components/dividend/DividendMonthlyChart.test.tsx`**：
   - 驗證當月份包含 `pendingNetTWD` 時，長條柱與 Tooltip 能正確渲染待入帳金額與提示。
4. **全專案回歸測試**：
   - 執行 `npm test` 確保 100% 測試通過。
   - 執行 `npm run build` 確保 TypeScript 0 錯誤。

---

## Out of Scope

1. 本次不重寫歷史交易記錄底層 SQLite/LocalStorage 儲存架構。
2. 本次不引入任何需付費之第三方商業除權息 API（保持 100% 免費運作與離線優先）。
3. 本次不變更資產配置總覽頁（AllocationView）或即時看盤頁。

---

## Further Notes

- 關聯技術決策請參考 `docs/adr/0226-cross-market-dividend-cashflow-and-composition.md`。
- 本規格遵循單一事實來源（SSOT）原則，消滅「預估 vs 歷史」各說各話的破版體驗。

