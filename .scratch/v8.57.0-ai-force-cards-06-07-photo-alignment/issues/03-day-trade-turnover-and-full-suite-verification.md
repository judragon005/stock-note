# 03 — 卡片 09 換手率文案校正與全戰情室雙軸整合驗收

**What to build:**  
在 `DayTradeRiskCard.tsx` 中將第 2 項指標標籤由「籌碼過手率」修正為照片標準「籌碼換手率」，並更新 `DayTradeRiskCard.test.ts`。在全戰情室整合層 (`AiForceDashboardView.tsx`) 進行 21 個方塊全景回歸驗證，確保 `npm test` 100% 綠燈、`npm run build` 0 錯誤、全盤對齊照片標準。

**Blocked by:** 01-forecast-cone-dual-area-and-y-axis, 02-vwap-cost-structure-dynamic-mountain

**Status:** done

- [x] 在 `DayTradeRiskCard.tsx` 將指標標籤更正為「籌碼換手率」，更新對應測試。
- [x] 執行全專案 `npm test`，確保 100% 測試通過且無 regressions (135 個測試檔、1139 個測試全綠)。
- [x] 執行 `npm run build`，確保 TypeScript 0 錯誤、打包順利。
- [x] 提交 PR 關聯 Issue #109。
