# Issue #279: Spec 0191: Vite 代理彈性容錯、前端短路熔斷與標的市場精準路由架構

- **狀態**：`OPEN`
- **標籤**：`enhancement`, `ready-for-agent`
- **URL**：https://github.com/judragon005/stock-note/issues/279
- **對應規格**：[docs/specs/0191-vite-proxy-resilience-circuit-breaker-and-symbol-routing-spec.md](../../../docs/specs/0191-vite-proxy-resilience-circuit-breaker-and-symbol-routing-spec.md)

## 需求概述

1. **Vite 代理層錯誤抑制與安靜降噪**：在 `vite.config.ts` 捕獲 `ENOTFOUND`、`EAI_AGAIN`、`ETIMEDOUT`，輸出單行警告並回傳 JSON 502。
2. **標的市場精準後綴守衛**：在 `priceFetcher.ts` 中結合本機股票字典，鎖定上市標的 `.TW` 與上櫃標的 `.TWO`，嚴禁對已知上市標的進行無效的 `.TWO` 重試。
3. **前端輕量短路熔斷器**：當外部代理回傳 502/ENOTFOUND 時，進入 60 秒熔斷狀態，短路後續外部網路請求，直接回退本地歷史資料庫。
4. **離線主權無縫合流**：確保無網路環境下介面載入時間在 300ms 內，無紅色彈窗與阻塞。
