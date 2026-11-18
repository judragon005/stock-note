# Issue 03: 後端湖倉歷史查詢 API 擴充 5 大實體資產與真實折溢價映射

- **層級**: 後端 Middleware / SQLite 湖倉
- **關聯規格**: Spec 0237 Ticket 3 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 擴充 `scripts/market-sync/vite-market-middleware.cjs` 之 `/api/market/history/:symbol` 路由。
2. 查詢並映射真實 `tw_institutional_chips.sbl_balance`、`tw_margin_trades.margin_balance` 日增減、`tw_director_pledges`、`etf_daily_nav` (淨值與折溢價率) 及 `corporate_action_calendar`。
