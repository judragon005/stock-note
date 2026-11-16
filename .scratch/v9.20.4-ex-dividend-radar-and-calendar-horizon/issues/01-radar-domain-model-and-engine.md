# 01 — 建立除息時序雷達領域模型與近 60/90 天排程純運算引擎

**What to build:** 在 types/dividend.ts 定義 UpcomingExDividendRadarItem 介面，並於 receivableDividendEngine.ts 實作 generateUpcomingExDividendRadarEvents 純函式。以台北時區純日曆天為軸，關聯當前股數大於 0 的持倉與既有除息日程，精確篩選 T_today <= exDate <= T_today + 60d（或 90d）之事件，產出除息倒數天數（daysUntilEx，0 代表今日除息）與除息至入帳凍結期（daysFromExToPay）。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent
**GitHub Issue:** #566

- [ ] 定義 UpcomingExDividendRadarItem 介面（含倒數天數、凍結期、確定/推估狀態等欄位）
- [ ] 實作純運算函式 generateUpcomingExDividendRadarEvents
- [ ] 透過時鐘凍結單元測試驗證今日除息 (T=0)、59 天、60 天與 61 天邊界過濾
