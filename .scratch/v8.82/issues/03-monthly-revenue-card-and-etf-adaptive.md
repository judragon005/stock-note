# 03-monthly-revenue-card-and-etf-adaptive

## Description
實裝存股族核心必備之 Card 20「月營收與營運成長走勢卡」，個股展示近 12 個月單月營收長條圖與 YoY 成長率；同時防禦預設標的 0050 之 ETF 破綻，實裝 ETF 智慧識別器，切換為「ETF 資產規模 (AUM) 與配息殖利率河流」視圖。

## Target Files
- `src/components/aiForceDashboard/cards/MonthlyRevenueCard.tsx`
- `src/components/aiForceDashboard/cards/MonthlyRevenueCard.test.ts`
- `src/components/aiForceDashboard/AiForceDashboardView.tsx`

## Acceptance Criteria
- [x] 建立 `MonthlyRevenueCard.tsx`，以長條圖展示近 12 個月營收數列，顏色區分 YoY 成長率。
- [x] 自動標註「連續 3 個月年月雙增」或「創歷史新高 (ATH)」波段起漲標籤。
- [x] 當標的為 ETF（如 0050, 0056）時，智慧自適應切換為「ETF 資產規模與收益分配」視圖，標註受益人成長趨勢，徹底杜絕無營收報錯。
- [x] 單元測試 `MonthlyRevenueCard.test.ts` 驗證個股月營收與 ETF 自適應切換 100% 通過。

## Status
- [x] completed
