# 01 — 外部金融 API 控制台探針修復、CSP/CORS 網路防禦與 NAS 通用反向代理

**Parent Issue:** #209

**What to build:**
解決外部金融 API 控制台探針在瀏覽器與 NAS 容器環境中的 CSP 與 CORS 連線問題：
1. 補齊 `index.html` 與 `src/engine/cspSecurity.ts` 之 CSP 白名單（Finnhub, FRED, Polygon, CoinGecko, SEC）。
2. 更新 FMP 探針至免費方案相容端點 `/stable/quote`。
3. `probeApiKey` 增加 `proxyUrl` 參數支援，解決 FRED 無 CORS 直連報錯。
4. 在 `docs/deployment/server/prod-server.cjs` 建立 `/api/proxy` 通用代理管道。

**Blocked by:** None

**Status:** closed

- [x] CSP 白名單涵蓋 Finnhub, FRED, Polygon, CoinGecko, SEC。
- [x] FMP 探針使用 `/stable/quote` 成功測活。
- [x] FRED 透過 proxy 代理轉發成功。
- [x] 單元測試通過且 NAS prod-server 端點就緒。
