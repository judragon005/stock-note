# ADR 0191: Vite 代理彈性容錯、前端短路熔斷與標的市場精準路由架構 (Vite Proxy Resilience, Circuit Breaker and Symbol Routing)

## 狀態
已接受 (Accepted) - 2026-10-17

## 背景與問題陳述
在開發環境啟動與資料同步過程中，終端機頻繁噴發大量 Yahoo Finance 代理異常與 Node.js 紅色多行堆疊追蹤：
`[vite] http proxy error: /v8/finance/chart/00923.TW?interval=1d&range=3mo`
`Error: getaddrinfo ENOTFOUND query1.finance.yahoo.com`
`[Proxy Error] 代理轉發異常: getaddrinfo ENOTFOUND query1.finance.yahoo.com`

經深入追查，發現系統存在三項核心設計瓶頸：
1. **開發代理錯誤未妥善抑制**：在開發機離線、DNS 暫態中斷或外部節點不穩定時，Vite 內建的 `http-proxy` 與 `console.warn` 將原始堆疊追蹤直接拋出，造成終端機被洗版。
2. **市場後綴盲目探測造成請求翻倍**：既有候選推導邏輯對所有台股均產生 `['symbol.TW', 'symbol.TWO']`。對於已知上市之權值股（如 `0050`、`0056`、`2330`）與債券 ETF（如 `00679B`），在網路異常時必定觸發第二次對立市場的無效請求（如 `0050.TWO`），使外部請求負載暴增 100%。
3. **缺乏前端短路熔斷機制**：當代理拋出 502/ENOTFOUND 時，前端依然對持股中其餘數十檔標的盲目發起外部請求，造成前端介面長久等待超時，未能在第一時間平滑降級至本機歷史日 K 資料庫（[ADR 0154](./0154-compact-history-indexeddb-hydration-and-yahoo-proxy-resilience.md)）。

## 決策內容

1. **Vite 代理層錯誤抑制與安靜降噪 (Proxy Noise Suppression)**：
   - 於 `vite.config.ts` 引入 `customLogger`，精確過濾包含 `ENOTFOUND`、`EAI_AGAIN`、`ETIMEDOUT` 與 `ECONNRESET` 的 proxy error 日誌，消除多行紅色堆疊追蹤。
   - 擴充 proxy `configure` 錯誤監聽器，以單行警告（`[Proxy Warning] Yahoo 網路/DNS 暫態異常: ...`）取代冗長異常輸出。
   - 統一回傳 HTTP 502 JSON 負載 (`{ error: 'Proxy Gateway Error', code: err?.code }`)，利於前端快速識別。

2. **標的市場權威後綴路由守衛 (Authoritative Market Suffix Router)**：
   - 實現 `resolveAuthoritativeMarketSuffix(symbol: string): '.TW' | '.TWO' | 'UNKNOWN'`。
   - 結合 `STATIC_TW_STOCKS` 官方字典（支援去 O 尾綴與債券 ETF 識別）：
     * 證交所上市標的：強制鎖定 `.TW`，嚴格禁止探測 `.TWO`。
     * 櫃買中心上櫃標的：強制鎖定 `.TWO`，嚴格禁止探測 `.TW`。
     * 僅對未列於字典之冷門自訂標的保留 `.TW` 失敗回退 `.TWO` 之雙軌探測。
   - 立即削減 50% 無效外部網路請求，大幅降低遭外部 API 限流與被封鎖之風險。

3. **前端輕量短路熔斷器 (In-Memory Circuit Breaker)**：
   - 實現極簡 `ProxyCircuitBreaker` 狀態機（`CLOSED`、`OPEN`、`HALF-OPEN`），預設冷卻時間 60 秒。
   - 當代理回傳 502（`ENOTFOUND` 或網路失敗）時，立即將狀態切換為 `OPEN`。
   - 熔斷生效期間，`fetchWithCORSProxy` 秒級 Fast-Fail，`historicalOhlcvBackfill` 與報價抓取模組直接跳過外部請求，秒級回退至本機 IndexedDB 與 compact 歷史快取。
   - 60 秒冷卻後轉入 `HALF-OPEN` 允許單次試探，成功則自動復原為 `CLOSED`，具備自我修復能力。

## 後果與效益
- **開發體驗**：終端機輸出恢復純淨，徹底杜絕外部網路中斷時的紅色錯誤堆疊刷屏。
- **外部負載減半**：消除 `0050.TWO` 等跨市場盲目探測，外部 API 請求次數減少 50%。
- **離線極速載入**：在斷網或 DNS 解析失敗時，系統不再進行長達數十秒的無效輪詢，秒級回退本機資料庫，使用者體驗無縫順暢。
- **架構純淨**：零新增外部 npm 依賴，100% 透過原生 TypeScript 與狀態機達成極致防禦。
