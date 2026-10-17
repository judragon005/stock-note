# Spec 0191: Vite 代理彈性容錯、前端短路熔斷與標的市場精準路由架構 (Vite Proxy Resilience, Circuit Breaker & Symbol Routing Engine)

## Problem Statement

在前端應用程式啟動或載入儀表板時，終端機頻繁噴發大量代理異常與紅字堆疊追蹤：
`[vite] http proxy error: /v8/finance/chart/00923.TW?interval=1d&range=3mo`
`Error: getaddrinfo ENOTFOUND query1.finance.yahoo.com`
`[Proxy Error] 代理轉發異常: getaddrinfo ENOTFOUND query1.finance.yahoo.com`

從使用者、開發者與系統穩定性的視角，目前面臨以下核心問題：
1. **開發環境錯誤日誌被嚴重污染**：本機開發機在離線、DNS 伺服器異常或 Yahoo Finance 外部節點波動時，Node.js 的 `http-proxy` 拋出未抑制的 `ENOTFOUND` 錯誤。終端機在載入持股時瞬間被數十筆錯誤日誌洗版，淹沒了真正關鍵的除錯資訊。
2. **無效的跨市場盲目重試造成請求翻倍**：現有 `priceFetcher` 的 fallback 邏輯在個股請求 `.TW` 失敗時，盲目嘗試 `.TWO`（例如將明確屬於證交所上市的 `0050.TW`、`0056.TW`、`006208.TW`、`2330.TW` 在失敗後再次發送為 `0050.TWO`、`0056.TWO`、`006208.TWO`、`2330.TWO`），導致在網路異常時外部無效請求數翻倍（100% 膨脹）。
3. **缺乏前端全域短路熔斷機制**：當本地 Vite 代理已明確回傳 502 Gateway Error（或 DNS 失敗）時，前端缺乏快速熔斷機制，仍持續對投資組合中其餘 20~40 檔標的發起外部請求，造成瀏覽器介面長時間懸掛（Pending）等待超時，延遲了本地歷史日 K 降級管線的啟動時機。
4. **離線主權與本地資料庫降級未及時接管**：專案雖然已具備完整的本地緊湊歷史日 K（[ADR 0154](file:///d:/APP/股票紀錄/docs/adr/0154-compact-history-indexeddb-hydration-and-yahoo-proxy-resilience.md)）與 SQLite Lakehouse，但因為外部網路探測超時耗時過長，造成使用者在無網路或離線環境下使用系統時，產生卡頓與假性載入失敗體驗。

## Solution

建立端到端的代理防禦、智慧市場路由與前端短路熔斷三層架構：
1. **Vite 代理層錯誤抑制與安靜降噪 (Vite Proxy Noise Suppression)**：在 `vite.config.ts` 中擴充代理錯誤監聽器，將 `ENOTFOUND`、`EAI_AGAIN`、`ETIMEDOUT` 與既有的 `ECONNRESET` 共同納入安靜降噪範疇，抑制冗長的 Node.js 原始堆疊追蹤，統一輸出簡短警告並回傳標準 JSON 502 負載。
2. **標的市場精準後綴守衛 (Strict Market Suffix Gate)**：在發起報價請求前，先透過本機官方股票字典 (`officialStockDictionary`) 與核心藍籌清單鎖定市場歸屬。明確屬於 TWSE 上市之標的強制鎖定 `.TW`，TPEx 上櫃標的強制鎖定 `.TWO`，嚴禁對已知市場的標的進行跨市場盲目重試，立即削減 50% 的無效請求。
3. **前端輕量短路熔斷器 (Client-Side In-Memory Circuit Breaker)**：在 `priceFetcher` 中實現極簡熔斷狀態機。當代理回傳 502（`ENOTFOUND` / DNS 失敗）或網路離線時，熔斷器立即轉為 `OPEN` 狀態（冷卻 60 秒），短路後續所有外部標的請求，直接秒級啟動本地 IndexedDB / Compact Cache / Lakehouse 數據源，確保離線環境下依然享有極速體驗。
4. **離線主權無縫合流與透明感知**：在熔斷短路期間，UI 元件保持 100% 正常渲染並自動定錨於本機歷史日 K，安靜標註「本地歷史資料庫已在庫」，杜絕假性警告與紅色彈窗驚擾使用者。

## User Stories

1. As a software developer, I want the Vite development server to suppress redundant stack traces when external DNS fails (`ENOTFOUND`), so that my terminal output remains clean and focused on actual code changes.
2. As a software developer, I want transient network errors like `ENOTFOUND` and `ETIMEDOUT` to return a well-formed JSON 502 response immediately, so that frontend clients can parse the error cleanly without hanging.
3. As a retail investor using the app offline, I want the stock tracker to stop sending repetitive HTTP requests to external servers, so that battery and CPU resources are conserved.
4. As an active trader holding 30+ stocks, I want a single failed network request to trip the circuit breaker, so that all remaining holdings skip external network probes and load instantly from local storage.
5. As an active trader, I want the system to know that `0050` is a TWSE listed ETF and never probe `0050.TWO`, so that redundant network requests and server load are eliminated.
6. As an active trader, I want the system to know that `00679B` is a TPEx listed bond ETF and never probe `00679B.TW`, so that the correct quote is fetched on the first attempt without probing delays.
7. As a fundamental analyst, I want unlisted or newly added ad-hoc tickers to retain a fallback probe mechanism, so that experimental or newly listed securities can still be fetched accurately.
8. As a frontend developer, I want the in-memory circuit breaker to reset automatically after a 60-second cooldown period, so that connectivity is seamlessly restored once the internet connection returns.
9. As a retail investor, I want historical K-line charts to hydrate immediately from the local compact database when external quotes fail, so that my technical analysis is never interrupted by network glitches.
10. As a performance-oriented user, I want total dashboard loading time during offline mode to be under 300 ms instead of 10+ seconds of network timeout wait, so that the application feels instant and resilient.
11. As a quality assurance engineer, I want pure unit tests to verify the circuit breaker state transitions (Closed -> Open -> Half-Open -> Closed), so that regressions in resilience logic are caught before release.
12. As a system architect, I want these resilience improvements to require zero external npm packages, so that the application stays lightweight, zero-cost, and strictly adheres to the KISS principle.

## Implementation Decisions

- **Proxy Layer Hardening**: In the development server configuration, errors matching `ENOTFOUND`, `EAI_AGAIN`, `ETIMEDOUT`, `ECONNREFUSED`, and `ECONNRESET` are intercepted. Instead of printing multi-line stack traces, the proxy logs a single-line informative warning and emits HTTP 502 with structured JSON (`{ error: 'Proxy Gateway Error', code: err.code }`).
- **In-Memory Circuit Breaker State Machine**:
  - `CLOSED` (Normal): Requests pass through to the local proxy.
  - `OPEN` (Tripped): When proxy returns 502 with `ENOTFOUND` or consecutive connection aborts occur, the circuit breaker opens for 60 seconds. All subsequent requests fail fast immediately without making network calls.
  - `HALF-OPEN` (Probe): After 60 seconds, a single test probe is allowed. If successful, transitions to `CLOSED`; if failed, resets the cooldown to `OPEN`.
- **Authoritative Market Suffix Resolver**:
  - Tickers defined in the official stock dictionary or blue-chip presets are mapped to their canonical exchange suffix (`.TW` for TWSE, `.TWO` for TPEx).
  - Tickers with established market tags skip secondary fallback attempts entirely.
  - Unknown or user-defined custom tickers retain safe dual-pipeline probing (`.TW` then `.TWO`).
- **SSOT Local History Fallback**:
  - When the circuit breaker is `OPEN` or fetch encounters a 502, `priceFetcher` and `historicalOhlcvBackfill` immediately resolve data from IndexedDB or `tw_market_ohlcv_compact.json`.
- **Zero-Dependency Core**: All circuit breaker state logic and market routing checks are implemented using standard TypeScript primitives and pure in-memory data structures without adding third-party resilience libraries.

## Testing Decisions

- **Test Seam 1 (`src/engine/priceFetcher.test.ts`)**:
  - Verify that known TWSE symbols (e.g. `2330`, `0050`, `0056`) do NOT trigger fallback requests to `.TWO` when `.TW` returns an error.
  - Verify that known TPEx symbols (e.g. `00679B`, `00713` if OTC) do NOT trigger `.TW` requests.
  - Verify that an unknown symbol still safely falls back to `.TWO` if `.TW` fails.
  - Verify that receiving a 502 with `ENOTFOUND` trips the circuit breaker and causes immediate fast-fail on the next call within the cooldown window.
  - Verify that the circuit breaker allows a retry probe after the cooldown timer expires.
- **Test Seam 2 (`src/engine/cspSecurity.test.ts` / integration)**:
  - Verify that proxy error interception formats the 502 JSON payload consistently.
- **Prior Art**: Follows patterns established in [ADR 0100](file:///d:/APP/股票紀錄/docs/adr/0100-engine-decoupling-fast-refresh-and-proxy-resilience.md), [ADR 0154](file:///d:/APP/股票紀錄/docs/adr/0154-compact-history-indexeddb-hydration-and-yahoo-proxy-resilience.md), and [ADR 0184](file:///d:/APP/股票紀錄/docs/adr/0184-market-backfill-smart-skip-retry-and-eta.md).

## Out of Scope

- Introducing heavyweight third-party circuit breaker libraries (e.g. Cockatiel, Opossum).
- Modifying production Nginx/Caddy server reverse proxy configurations beyond the development server.
- Altering core technical indicator formulas or K-line math engines.
- Modifying official TWSE/TPEx daily closing CSV ingestion pipelines.

## Further Notes

- This specification bridges the gap between development server proxy stability and client-side offline resilience.
- By eliminating 50% of redundant requests through authoritative market routing, we dramatically reduce the risk of rate limiting from Yahoo Finance while completely eliminating terminal log spam during network fluctuations.
