# 01 — 戰情室 Layer 6 視覺高度放大至 295px 與卡片標籤純數字化

**What to build:**
1. 在 `src/components/aiForceDashboard/AiForceDashboardView.tsx` 中將 Layer 6 (`data-layer="6-energy-sentiment"`) 的四個卡片容器高度由寫死的 `height: '250px'` 放大至 `height: '295px'`。
2. 在 `src/components/aiForceDashboard/cards/EnergySentimentTwinCard.tsx` 中拔除 `height: '250px'` 與 `maxHeight: '250px'`，改為自適應 `height: '100%'`，文字維持正常字級不縮小，提升垂直呼吸感。
3. 統一卡片徽章格式，拔除英文字樣 `CARD `，全面改為純數字標籤：
   - `EnergySentimentTwinCard`: `CARD 10 · 13` ➔ `10 · 13`
   - `DynamicSignalsCard`: `CARD 12` ➔ `12`
   - `ValuationMetricsCard`: `CARD 21` ➔ `21`
   - `TdccDistributionCard`: `CARD 19` ➔ `19`
   - `MonthlyRevenueCard`: `CARD 20` ➔ `20`
4. 同步更新所有相關單元測試中的文字斷言。

**Blocked by:** None — can start immediately.

**Status:** done

- [x] 在 `AiForceDashboardView.tsx` 將 Layer 6 四欄外層高度提升至 `295px`
- [x] 在 `EnergySentimentTwinCard.tsx` 移除 `maxHeight: '250px'`，改為 `height: '100%'`
- [x] 將 Layer 6 及其他卡片標籤改為純數字（`10 · 13`、`12`、`21`、`19`、`20`）
- [x] 單元測試通過 (`EnergySentimentTwinCard.test.ts`、`DynamicSignalsCard.test.ts`、`ValuationMetricsCard.test.ts` 等)
