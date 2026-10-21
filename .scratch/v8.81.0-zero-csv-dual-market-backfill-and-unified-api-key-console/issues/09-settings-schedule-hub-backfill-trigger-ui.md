# 09-settings-schedule-hub-backfill-trigger-ui

## Description
在「設定 ➔ 排程中心」(`src/components/settings/MarketScheduleHubSection.tsx` 或對應區塊) 中新增「台美雙軌零 CSV 背景全回補」控制面板。提供一鍵背景啟動按鈕、執行進度條、當前處理市場/日期與日誌預覽，讓使用者不必開啟終端機也能在 Web 介面啟動電腦不關機背景全量回補。

## Target Files
- `src/components/settings/MarketScheduleHubSection.tsx` (或 `SettingsWorkspace.tsx`)
- `src/components/settings/MarketScheduleHubSection.test.tsx`

## Acceptance Criteria
- [x] 介面展示「台美雙軌零 CSV 背景全回補」卡片，說明用時間換空間、電腦不關機即可完成歷史補全。
- [x] 提供「啟動背景全回補」按鈕，點擊後向後端發起 `POST /api/market/backfill-all`。
- [x] 當背景任務運行中時，按鈕轉為「運行中 (可隨時關閉瀏覽器，後台持續執行)」，並以進度條與徽章顯示已處理交易日與標的數。
- [x] 單元測試驗證按鈕點擊、輪詢狀態與完成呈現。

## Status
- [x] done
