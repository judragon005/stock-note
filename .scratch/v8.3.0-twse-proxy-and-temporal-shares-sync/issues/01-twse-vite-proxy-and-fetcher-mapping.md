# Ticket 01: TWSE 官方網域 Vite 本地代理路由與 Fetcher 映射

- **狀態**：CLOSED (RESOLVED)
- **類型**：`type:bugfix`
- **領域**：`area:engine`
- **優先級**：`priority:high`
- **分流標籤**：`ready-for-agent`

## 需求描述
在 `vite.config.ts` 新增 `/api/twse-www` 反向代理至 `https://www.twse.com.tw`；在 `src/engine/priceFetcher.ts` 接入 `targetUrl.startsWith('https://www.twse.com.tw')` 替換邏輯，根治瀏覽器端 CORS 阻擋導致上市股票法人為 0 的問題。

## 驗收條件
1. `priceFetcher.ts` 正確將 `https://www.twse.com.tw` 映射至 `/api/twse-www`。
2. 瀏覽器環境下請求 T86 日報可透過 Vite 代理正常接收。
