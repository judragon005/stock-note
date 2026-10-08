# Ticket 04: 卡片 03 與卡片 05 雙雷達全景放大與防折行保護

## 關聯規格
- Spec: `docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md` (Story 3 / AC 3.1, AC 3.2, AC 3.3)

## 問題背景
在舊版 4 卡一列擠壓下，卡片 03（多維度判讀）與卡片 05（風險雷達圖）寬度不足 220px：
- 卡片 03 頂部標題「多維度判」換行到「讀」，評分換行；雷達圖文字縮小至 9px 難以閱讀。
- 卡片 05 底部「主力風險等級：」斷字換行；五角蛛網文字數值同樣過小。

## 任務細節
1. 修改 `src/components/aiForceDashboard/cards/MultiDimensionRadarCard.tsx`：
   - 最大半徑 `maxRadius` 由 100 擴大至 125，中心徽章半徑擴大至 30。
   - 標籤文字由 13px 放大至 15px (fontWeight 800)；分數文字由 12px 放大至 14px (高對比亮藍)。
   - 頂部標題欄加入 `whiteSpace: nowrap`，消除折行。
2. 修改 `src/components/aiForceDashboard/cards/RiskSpiderCard.tsx`：
   - 五角蛛網最大半徑擴大至 120。
   - 標籤文字由 13px 放大至 15px；分數文字由 12px 放大至 14px。
   - 底部狀態列重構為自適應 Flexbox，杜絕「主力風險等級」與「主力風險指數」斷字折行。
3. 同步更新 `MultiDimensionRadarCard.test.ts` 與 `RiskSpiderCard.test.ts`。

## 驗收標準
- [x] 卡片 03 頂部標題與綜合評分維持完整單行，文字與分數清晰可辨。
- [x] 卡片 05 底部狀態列維持完整水平排列，無換行破版。
- [x] 雙雷達圖視覺比例舒展飽滿，字體數值明顯放大提升易讀性。
