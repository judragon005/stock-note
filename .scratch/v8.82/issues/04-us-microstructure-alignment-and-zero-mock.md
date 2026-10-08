# 04-us-microstructure-alignment-and-zero-mock

## Description
將美股標的（如 NVDA, AAPL）與台股三大法人及張數計價徹底解耦，在 Card 08 與 Card 15 實裝專屬「美股微觀量價動能評分 (Microstructure Score / MFI / OBV)」，確保所有美股標的呈現「股」與「USD」，徹底終結捏造張數。

## Target Files
- `src/components/aiForceDashboard/cards/InstitutionalFlowCard.tsx`
- `src/components/aiForceDashboard/cards/ChipsSummaryCard.tsx`
- `src/components/aiForceDashboard/cards/InstitutionalFlowCard.test.ts`
- `src/components/aiForceDashboard/cards/ChipsSummaryCard.test.ts`

## Acceptance Criteria
- [x] 查詢美股時，Card 08 隱藏外資/投信/自營商雙軸柱狀圖，切換為美股機構微觀量價動能趨勢圖。
- [x] Card 15 籌碼摘要在美股環境下標註「美股無三大法人日報，已切換為機構量價評分」，杜絕外資假張數。
- [x] 確保美股之量能單位 100% 標註為「股」、幣別 100% 標註為「USD」。
- [x] 單元測試驗證美股情境下 0 假張數、0 假外資。

## Status
- [x] completed
