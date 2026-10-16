# 12 — 前端台美市場即時營業狀態卡片與中文休市原因 UI 組件

**Parent:** #275

**What to build:**
在前端首頁或行情排程區域（如 `MarketScheduleHubSection.tsx`）增加台美即時營業狀態視覺卡片。即時呈現當前市場狀態（`盤前` / `盤中` / `盤後` / `休市` / `半日市`），若逢休市清楚標註中文原因（如 `[休市: 教師節]`），並附帶開盤倒數時鐘。

**Blocked by:** 06 — 前端 holidayCalendar.ts 接入 SSOT 字典並保持 100% 向後相容

**Status:** done

## Acceptance Criteria
- [x] 前端即時顯示台股與美股當前營業狀態。
- [x] 若遇休市日，正確渲染中文休市原因標籤（取自 `getHolidayReason`）。
- [x] 支援美股夏令/冬令時間開盤時鐘感知，倒數文字精確呈現。
- [x] 視覺風格維持 Glassmorphism 與專案設計系統一致。
