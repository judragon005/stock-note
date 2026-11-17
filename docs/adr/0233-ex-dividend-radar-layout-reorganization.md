# ADR-0233: V9.20.6 近日持倉除息行事曆雷達佈局重構與短線現金流流水線整合

## 狀態
已通過 (Accepted)

## 上下文
在 V9.20.5 (Spec 0232) 中，我們引入了「近日持倉除息行事曆雷達 (`ExDividendRadarCard`)」，初期掛載於工作台頂部。然而，這引發了使用者在視覺動線與決策時間軸上的割裂問題：
1. **宏觀與微觀層級倒置**：用戶一進入頁面，尚未檢視年度 12 個月預估與財務 KPI，即被迫聚焦於微觀的近期個股除息日程。
2. **現金流生命週期動線斷裂**：除息事件天然具備「即將除息 (Upcoming Ex-Date)」與「已除息待入帳 (Receivable Pending Payment)」的前後順序。將兩者拆分在頁面首尾，阻斷了一體化的戰術走廊。

## 決策
1. **重構垂直佈局流向 (Macro-to-Micro Hierarchy)**：
   - 頂部保留「未來 12 個月現金流預估行事曆」與「四大發光 KPI 摘要面板」（宏觀層）。
   - 中間層為「各月份現金流分佈 + 股息貢獻排行」雙欄網格（結構分析層）。
   - 下方緊接「近日持倉除息行事曆雷達 (`ExDividendRadarCard`)」與「除息待入帳行事曆面板 (`#receivable-calendar`)」，形成緊湊的短線現金流結算走廊（Tactical Settlement Corridor）。
   - 底部維持「歷史股息入帳明細列表」（明細稽核層）。
2. **測試契約與 Seam 固化**：
   在 `DividendLogView.test.ts` 中建立以靜態字串索引為基礎的順序防護網：
   $$\text{Index}(\text{"dividend-dual-panel-grid"}) < \text{Index}(\text{"近日持倉除息行事曆雷達"}) < \text{Index}(\text{"receivable-calendar"})$$
3. **零代碼侵入與奧坎剪刀**：
   不引入任何新狀態或額外 CSS Class，保留外層 flex column 的 `gap: 24px` 自然節奏與完整的 Props 綁定。

## 影響與結果
- 視覺流向嚴格符合由宏觀規劃至短期戰術執行的單向認知路徑。
- 測試套件 100% 綠燈，建置 0 錯誤。
