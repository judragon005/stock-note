# 原子票券 #03: SummaryCards 被動收入卡片與獨立利息膠囊 UI 整合與 App.tsx 市場隔離連動

- **父層主票券**: [issue-0045.md](issue-0045.md)
- **狀態**: `RESOLVED`
- **分流狀態 (Triage Status)**: `ready-for-agent`
- **負責目標**: `src/components/SummaryCards.tsx`, `src/App.tsx`


---

## 🎯 任務內容與驗收縫隙 (Test Seam)

1. **App.tsx 傳參與市場隔離**：
   - 在 `App.tsx` 計算 `exposureMetrics` 時，依照 `currentMarket` 傳入對應市場之 `holdings`、`cashBalances`（美股取 USD、台股取 TWD、ALL 取折算 TWD）與 `loans`。
   - 計算當前市場之 `interestIncomeBreakdown` 並作為 props 傳遞至 `SummaryCards.tsx`。
2. **SummaryCards.tsx 視覺與膠囊整合**：
   - 累計被動收入卡片主數字：加總「股息收益 + 利息收益」。
   - 下方膠囊區：
     - 將各項利息明細以個別獨立 Cyan 色調膠囊（`💵 {name} +{currencySymbol}{amount} {currency}`）渲染，每一項獨立分開，不混在一起。
     - 保持「減資退款」、「美股預扣 30%」、「二代健保補充保費」膠囊的正常顯示。
