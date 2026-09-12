# 02 — Hero Layer Inline Styling Refactor

**What to build:**
重構 `src/components/financial/FinancialHeroLayer.tsx`。
將 Tailwind classes 替換為標準原生 Inline Styles 與深色主題變數。

1. 保持 `getGradeColorClass`、`getTrafficLightBadgeInfo`、`getIndustryBadgeInfo` 既有回傳值以相容 Vitest 測試。
2. 0 秒核心操盤結論橫幅採用原生深色漸層背景與邊框。
3. 四大體質維度卡片採用原生 Flex / Grid 佈局，色碼對齊台灣/美股主題。
4. 綜合評分徽章與產業屬性標籤清晰可讀。

**Blocked by:** 01-modal-floating-and-overlay-styling.md

**Status:** done

- [x] 移除 Tailwind classes，改用原生 Inline Styles
- [x] 四大體質指示燈在手機與桌面端自適應排列
- [x] 既有單元測試 `FinancialHeroLayer.test.ts` 100% 綠燈
