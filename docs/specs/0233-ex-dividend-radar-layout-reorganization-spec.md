# Spec 0233: 近日持倉除息行事曆雷達佈局重構與短線現金流流水線整合規格

## Problem Statement

長期投資人與存股族在檢視「股利日誌與被動現金流」頁面時，面臨視覺流向與決策時間軸割裂的問題：

1. **宏觀與微觀資訊層級倒置**：目前頁面將「近日持倉除息行事曆雷達 (Ex-Dividend Radar)」直接置於最頂部（未來 12 個月現金流預估與 KPI 卡片之上）。使用者進入工作台時，尚未建立年度現金流與財務目標的宏觀錨點，便過早被迫聚焦於微觀的個股除息日程，造成由微觀跳至宏觀再跳回微觀的認知震盪。
2. **現金流生命週期動線斷裂**：除息事件具備「即將除息 (Upcoming Ex-Date)」與「已除息待入帳 (Receivable Pending Payment)」的天然先後時序關係。現行佈局將雷達置頂，而將待入帳行事曆放置於下方圖表之後，切斷了「除息前瞻預警 $\to$ 當日除息 $\to$ 應收平滑展示 $\to$ 實際入帳對帳」的一體化戰術決策走廊（Tactical Settlement Corridor）。
3. **視覺空間利用效率不佳**：雷達卡片在最上方獨占橫幅，拉長了首屏觸達「各月份現金流分佈圖表」與「股息貢獻排行」的距離，使高頻檢視月度現金流的使用者必須頻繁向下滾動頁面。

---

## Solution

在 `DividendLogView` 視圖中，重組卡片垂直排列架構：

1. **戰術流水線垂直聚合 (Tactical Settlement Corridor)**：
   將「近日持倉除息行事曆雷達 (`ExDividendRadarCard`)」由頁面最頂部，移至「各月份現金流分佈與股息貢獻排行雙欄網格 (`dividend-dual-panel-grid`)」正下方、且位於「除息待入帳行事曆面板 (`#receivable-calendar`)」正上方。
2. **階梯式時間軸認知流 (Macro-to-Micro Hierarchy)**：
   確立頁面四大認知分層：
   - **Level 1 (宏觀總覽)**：未來 12 個月預估行事曆 + 四大 KPI 摘要。
   - **Level 2 (結構分析)**：各月份現金流分佈 (2/3) + 股息貢獻排行 (1/3)。
   - **Level 3 (短線流水線)**：近日持倉除息雷達 (T-90 ~ T-0) + 除息待入帳行事曆 (T+0 ~ Pay-Date)。
   - **Level 4 (歷史對帳)**：股息入帳明細歷史表與對帳操作。
3. **保留完整交互與狀態同步**：
   重組過程純粹變更 DOM 排版結構與語意容器，不破壞既有折疊展開狀態、市場 (TW/US) 與券商帳戶過濾邏輯。

---

## User Stories

1. As a dividend investor, I want to see the macro 12-month projected cashflow and KPIs first at the top of the page, so that I can evaluate my overall financial goals before looking at near-term ex-dividend dates.
2. As a cashflow manager, I want the "Ex-Dividend Radar" to sit directly above the "Receivable Dividends Pending Payment" card, so that I can inspect both upcoming ex-dividend events and pending payouts in a single focused corridor.
3. As an active investor, I want to review my monthly distribution chart and top contributors without being pushed down by the radar card, so that I can immediately assess quarterly cashflow seasonality.
4. As a user tracking a stock's full dividend cycle, I want to see a stock transition smoothly from the ex-dividend radar above to the pending payment card below once its ex-date arrives, so that the lifecycle movement is visually intuitive.
5. As a mobile or small-screen user, I want the radar card to occupy its new position below the charts without causing any horizontal overflow or broken layout, so that my mobile viewing experience remains responsive.
6. As a user filtering by a specific broker account, I want the repositioned radar card to continue reflecting my selected broker account, so that no irrelevant holdings clutter my view.
7. As a user filtering by US or TW markets, I want the repositioned radar card to continue respecting the market filter, so that I only see assets matching my active market scope.
8. As a user with multiple upcoming dividends, I want the collapse/expand state of the radar card to remember my preference in its new position, so that it doesn't take up excessive screen real estate unless I choose to expand it.
9. As a privacy-conscious investor, I want the repositioned radar to respect blurred/hidden balance settings, so that sensitive dollar amounts are not exposed if privacy mode is engaged.
10. As a precision accountant, I want the second-generation NHI warning badges inside the repositioned radar to remain clearly visible, so that I don't miss tax thresholds while reviewing pending items.
11. As a keyboard and screen-reader user, I want the tab navigation order to logically follow the visual flow from charts to radar to receivables, so that accessibility focus order matches visual presentation.
12. As a QA engineer, I want end-to-end tests to verify that the radar card renders after the monthly chart container and before the receivable calendar container, so that regressions in card ordering are caught automatically.

---

## Implementation Decisions

1. **元件排版階層重構**：
   - 調整 `DividendLogView.tsx` 渲染順序：
     將 `<ExDividendRadarCard />` 呼叫點自頂部（`DividendCalendarCard` 之前）移除，搬移至 `<div className="dividend-dual-panel-grid">` 之後、`<div id="receivable-calendar">` 之前。
   - 保留所有既有 Props 傳遞與狀態綁定不變：
     `radarEvents={upcomingRadarEvents}`、`horizonDays={radarHorizonDays}`、`onHorizonChange={setRadarHorizonDays}`、`isExpanded={isRadarExpanded}`、`onToggleExpand={() => setIsRadarExpanded((v) => !v)}`、`market={market}`。

2. **容器間隔與視覺節奏 (Spacing & Vertical Rhythm)**：
   - 維持外層父容器之 `display: flex; flex-direction: column; gap: 20px;`（或 24px），確保 `dividend-dual-panel-grid`、`ExDividendRadarCard` 與 `#receivable-calendar` 之間維持一致且標準的呼吸間距，避免相鄰卡片陰影與邊框疊合。

3. **零代碼侵入與奧坎剪刀原則**：
   - 本變更不引入任何外部第三方依賴或新自定義 CSS Class，僅調整 JSX 結構順序。
   - 確保不影響既有內部邏輯與計算引擎效能。

---

## Testing Decisions

1. **測試良性原則 (High-Seam Behavioral Testing)**：
   - 避免刺探私有 DOM 或內部 state。
   - 以頂層視圖掛載（`renderToStaticMarkup(React.createElement(DividendLogView, ...))`）為單一測試縫隙 (Single Test Seam)。

2. **DOM 時序與順序驗證契約**：
   - 在 `src/components/DividendLogView.test.ts` 新增測試案例，檢驗產出的靜態 HTML 字串中各主要錨點標記的字元索引順序：
     $$\text{Index}(\text{"dividend-dual-panel-grid"}) < \text{Index}(\text{"近日持倉除息行事曆雷達"}) < \text{Index}(\text{"receivable-calendar"})$$
   - 確保在各市場與篩選條件下，結構順序均保持嚴格單向不變。

3. **既有測試回歸門禁**：
   - 確保所有現有 26 項單元測試與端到端整合測試保持 100% 通過。

---

## Out of Scope

- 修改 `ExDividendRadarCard` 內部的 60/90 天前瞻演算法或 UI 卡片樣式。
- 修改 `receivableDividendEngine.ts` 或現金流分佈圖表之計算邏輯。
- 變更歷史對帳表之欄位排序。

---

## Further Notes

- 本規格實作完成後，將與 Spec 0232 形成互補閉環，完整確立股利日誌「宏觀 $\to$ 結構 $\to$ 短期戰術 $\to$ 歷史稽核」四層架構。
