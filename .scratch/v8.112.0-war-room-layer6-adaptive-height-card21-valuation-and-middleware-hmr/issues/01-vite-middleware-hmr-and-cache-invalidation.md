# Ticket 01: Vite 中介層熱模組重載與快取動態清理，徹底根治長開脫鉤

- **狀態**：`ready-for-agent`
- **關聯 Spec**：[Spec 0199](../../../docs/specs/0199-war-room-layer6-adaptive-height-institutional-valuation-percentile-and-middleware-hmr-spec.md)
- **關聯 Issue**：#310

## 任務目標
1. 解決 Vite Dev Server 在 24 小時無休運行下，`require.cache` 凍結導致 `scripts/market-sync/` 修改無法反映至執行期的問題。
2. 在 `vite.config.ts` 中設定 `scripts/market-sync` 檔案變更監聽與動態載入中介層函式，確保每次變更立即生效，終身免手動重啟 Node 進程。
3. 驗證 `/api/market/history/:symbol` 能在不重啟 Vite 下動態回傳最新資料表查詢欄位（包含 `valuation`）。
