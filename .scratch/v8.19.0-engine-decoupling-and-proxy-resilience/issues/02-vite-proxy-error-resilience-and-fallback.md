# Issue 02: Vite 開發代理外部網路異常與斷網防護機制

## 狀態

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`vite`, `network`, `proxy`, `resilience`

## 需求

1. 針對 Yahoo Finance (`query1.finance.yahoo.com`)、TWSE、TPEx 外部連線異常（如 `ENOTFOUND`、`ETIMEDOUT`），在 `vite.config.ts` 中註冊 proxy error 處理器。
2. 優雅回應 502 Bad Gateway，避免未捕獲錯誤拋出污染終端機。
3. 確保前端 `fetchWithCORSProxy` 三層平滑降級機制能順暢觸發。

## 實作成果

- 已於 `vite.config.ts` 中的各 proxy 路由加入 `configure: (proxy) => { proxy.on('error', ...)}`，終端機回歸純淨無報錯。
