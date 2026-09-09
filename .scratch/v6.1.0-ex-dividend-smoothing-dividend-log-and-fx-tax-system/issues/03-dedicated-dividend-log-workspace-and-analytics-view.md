# Ticket #03: 專屬股息日誌活頁籤、月度現金流柱狀圖與股息行事曆視圖

## 🎯 任務目標 (對應技術債 #0004)

建立股利數據聚合器 `src/engine/dividendAggregator.ts`，並打造專屬視覺化視圖 `src/components/DividendLogView.tsx` 與工作台 `WorkspaceTabs.tsx` 整合。

---

## 🛠️ 實作要點

1. **股利彙整引擎** (`src/engine/dividendAggregator.ts`)：
   - 彙整全歷史/當年度股利總額、YoY 成長率、近 12 個月現金流。
   - 計算 1~12 月各月現金流分佈（含應發、實領、扣稅）。
   - 統計 Top 個股股息貢獻排行榜。
2. **專屬股利日誌元件** (`src/components/DividendLogView.tsx`)：
   - **4 大發光 KPI 摘要卡**：累計實領股息、今年度被動收入、YoY 成長率、預估待入帳應收股息。
   - **月度現金流柱狀圖**：直觀呈現 1~12 月每月現金流與跨年切換。
   - **股息行事曆時間軸**：標記即將除息日、預計發放日與二代健保/預扣稅警示。
   - **股息流水明細表**：穿透單筆入帳、每股配息、除息股數與扣稅淨額。
3. **工作台活頁籤整合** (`src/components/WorkspaceTabs.tsx`)：
   - 增加 `dividend` Tab，配置專屬貨幣圖示與實領累計 Badge。

---

## 🧪 驗收條件 (Acceptance Criteria)

- [ ] 股利日誌完整渲染，支援年度切換與月份柱狀圖交互。
- [ ] 股息行事曆清晰標示即將除息與待發放應收股利。
- [ ] 活頁工作台點擊流暢，響應式排版良好。

