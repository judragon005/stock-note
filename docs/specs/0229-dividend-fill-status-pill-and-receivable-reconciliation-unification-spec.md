# 規格書 0229：股利實質填息全覆蓋、雙軌應收對帳統一與現金流全時態對齊 (Spec 0229)

## Problem Statement

使用者在「股利收益日誌與現金流全景」頁面中，面臨三個關鍵體驗與數據信任度問題：
1. **填息膠囊無故消失（Disappearing Fill Status Pill）**：在「歷史現金股利入帳明細」列表中，原本應顯示「實質填息」或「貼息中」的狀態膠囊完全不見，導致投資人無法判斷各檔除息標的是否實質回補缺口、賺取真息收，亦或僅是本金返還。
2. **待入帳行事曆與明細紀錄互相矛盾（Split-Brain Pending Discrepancy）**：上方「⚡ 除息待入帳行事曆」顯示「目前暫無除息待入帳款項」，但下方「歷史現金股利入帳明細」首列卻明確躺著「2026-12-16 待入帳 華邦電 NT$ 8,000 [一鍵入帳]」，造成嚴重視覺與認知分裂。
3. **現金流時態口徑混淆（Temporal Mismatch In Cashflow Displays）**：頂部「未來 12 個月現金流預估行事曆」金額（NT$ 625,042）與下方「2026 各月份現金流分佈長條圖」數值加總存在落差（前者的滾動 12 個月 vs 後者的自然年度），缺乏清楚口徑提示與對齊切換，引發計算錯誤的疑慮。

---

## Solution

1. **實質填息狀態自癒流水線（Self-Healing Dividend Recovery Pipeline）**：
   - 解除填息膠囊對「當前持股快照（`holdings`）」與「即時最新價」的硬短路依賴。
   - 擴充四態顯示架構（實質填息 `FILLED`、貼息中 `UNFILLED`、已平倉 `CLOSED_POSITION`、待補除息價 `PENDING_DATA`）。
   - 當標的已清倉時，自歷史交易回溯除息日後的行情或標記「已平倉結清」，杜絕膠囊靜默隱藏（Silent Return null）。
2. **雙軌應收股利中樞統一（Unified Dividend Receivable SSOT）**：
   - 終結 `scopedReceivables`（外部爬蟲/引擎產物）與 `dividendTrades`（本地預約待入帳交易）之雙軌分裂。
   - 建立全域單一選擇器（`unifiedPendingReceivables`），將兩者進行聯集與去重。上方行事曆直接消費此選擇器，確保只要明細中有待入帳紀錄，上方行事曆 100% 同步感應與展示。
3. **雙時態現金流展示與對齊（Bi-Temporal Cashflow Presentation & Toggle）**：
   - 在未來 12 個月現金流預估卡片中，加入「滾動未來 12 個月 (Rolling 12M)」與「當前自然年度 (Calendar Year)」切換視圖或清楚視覺標籤，並與下方長條圖維持嚴格的會計閉環。

---

## User Stories

1. As a dividend investor, I want to see the dividend recovery status pill for every historical dividend record, so that I can immediately verify whether the stock has recovered its ex-dividend gap or if it is currently in an unfilled loss state.
2. As a dividend investor who has sold or closed a position after receiving dividends, I want to see a clear "Closed Position" or historical recovery pill instead of a blank space, so that my past dividend records remain informative and complete.
3. As an active trader, I want to see a fallback badge like "Pending Reference Price" when ex-dividend price data is missing, so that I know why the status cannot be computed and can provide or sync historical quotes.
4. As a user checking upcoming receivables, I want the "Receivable Dividends Pending Payment" calendar to accurately show all pending dividends (including manually recorded future dividend transactions like Winbond 2344), so that there is no contradiction between the top calendar and the bottom table.
5. As a user clicking the "One-Click Instant Settle" button on a pending dividend, I want both the bottom table and the top receivable calendar to update simultaneously, so that settled dividends smoothly transition out of the pending list.
6. As a portfolio manager, I want the 12-month projected cashflow card and the monthly distribution bar chart to have consistent and explicitly labeled time frames (Rolling Forward 12M vs Selected Calendar Year), so that I don't confuse forward projections with current year actuals.
7. As an investor with multiple US ETF positions (e.g., VT), I want foreign dividend withholdings and USD currency conversions to clearly display the exchange rate snapshot, so that the TWD net figures match my broker statements.
8. As a user navigating between different calendar years, I want the filter to strictly isolate transactions by effective payment date or ex-date without cross-year double counting, so that annual tax and dividend sums remain mathematically pure.
9. As a user with slow network or offline cached data, I want all dividend calculations to execute synchronously via memoized pure functions, so that scrolling and filtering the table never lags or stutters.
10. As a precision accountant, I want the reconciliation summary card (Card 3) to mathematically reconcile the difference between expected receivables and actual cash receipts, so that I have zero unreconciled delta.

---

## Implementation Decisions

1. **擴充 `dividendMetricsEngine` 之填息評估介面**：
   - 擴充 `determineDividendFillStatus` 支援歷史交易回溯模式。新增 `CLOSED_POSITION` 與 `PENDING_DATA` 狀態回傳，確保傳入空庫存或空除息價時，提供明確的非 null 狀態枚舉。
2. **重構 `DividendHistoryTable` 的膠囊渲染管線**：
   - 移除 `if (!fillStatus) return null` 類的條件短路。
   - 建立 `DividendFillStatusBadge` 元件，統籌四態樣式：
     - `FILLED`: 翠綠色背景，標記「實質填息」。
     - `UNFILLED`: 玫瑰紅背景，標記「貼息中」。
     - `CLOSED_POSITION`: 藍灰背景，標記「已結清部位」。
     - `PENDING_DATA`: 琥珀色微光標籤，標記「待補除息價」。
3. **建立雙軌應收資料聯集選擇器（`unifiedPendingReceivables`）**：
   - 在 `DividendLogView` 中，建立統一整合的選擇器，聚合外部應收池（`scopedReceivables`）與交易流水線中預約待入之紀錄（`t.type === 'DIVIDEND' && payDate > todayStr`）。
   - 將該聯集輸出同時注入 `DividendCalendarCard`、行事曆待入帳卡片與 `DividendHistoryTable`。
4. **現金流時態標籤與對齊配置**：
   - 在 `DividendCalendarCard` 標題增設口徑輔助標籤：`[滾動 12 個月: YYYY/MM ~ YYYY/MM]`，明確指出與 `DividendMonthlyChart`（鎖定 `selectedYear` 自然年）之時間軸差異。
   - 保持既有 Bankers Rounding 與單一貨幣換算邏輯，不破壞歷史資料相容性。

---

## Testing Decisions

- **外部行為導向測試（Black-box Behavior Verification）**：
  - 測試只驗證元件輸出與 DOM 渲染結果（如特定文字標籤、Badge 是否存在、數字總計是否平衡），不刺探內部私有變數或狀態。
- **針對之測試模組**：
  - `src/components/dividend/DividendHistoryTable.test.tsx`：驗證當 `holding` 為 `undefined`（已清倉股票）或缺少除息價時，表格欄位依然正確渲染友善狀態膠囊，不再消失。
  - `src/components/DividendLogView.test.ts` / `.test.tsx`：驗證當存在未來交易記錄時，待入帳行事曆與明細表同時呈現該筆待入帳項目，計數器與金額完全同步。
  - `src/engine/dividendMetricsEngine.test.ts`：針對新增之狀態枚舉與邊界情況（除息日前無價格、負值配息、極端小數點）進行單元測試。
- **現存既有測試參考 (Prior Art)**：
  - 遵循 `src/components/dividend/DividendKpiSummary.test.tsx` 與 `src/engine/receivableDividendEngine.test.ts` 的斷言風格。

---

## Out of Scope

1. 本規格書不涉及後端真實證券 API（如凱基、富邦、國泰）的直接即時 Open Banking 連線對帳。
2. 本規格書不修改既有除權息公告爬蟲邏輯與排程時間。
3. 本規格書不改動全域投資組合淨值（NAV）與買賣交易（BUY/SELL）之損益計算核心。

---

## Further Notes

- 本規格書實作時須嚴格遵守專案 `AGENTS.md` 規範：使用繁體中文、TDD 紅-綠-重構、分支管理（`feature/` 分支）、PR 描述攜帶 `Closes #<id>`。
- 完成後需同步更新 `CONTEXT.md` 與交接手冊。
