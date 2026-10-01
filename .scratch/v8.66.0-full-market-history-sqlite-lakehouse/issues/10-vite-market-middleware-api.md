# 10 — Vite 原生 Connect 中介層 API (Zero-Port Native Endpoints)

**What to build:**
實作 `scripts/market-sync/vite-market-middleware.cjs` 並掛載於 `vite.config.ts` 的 `configureServer` 生命週期中。
提供三個原生 HTTP REST API：
1. `GET /api/market/quote/:symbol?market=TW|US`：回傳最新單筆日 K、漲跌、交易狀態（`symbols_meta.status`）。
2. `GET /api/market/history/:symbol?market=TW|US&limit=250`：回傳指定標的最近 250 天歷史日 K 數列與籌碼數據。
3. `GET /api/market/symbols?q=...&market=TW|US`：呼叫 `searchSymbolsMeta` 回傳即時模糊搜尋匹配清單。
內部直接透過 `sqlite-db-core.cjs` 查詢本地 SQLite，回傳 JSON，完全不需要啟動額外的 Express 或後端服務 Port。

**Blocked by:** 01 — SQLite 資料庫引擎連線層與核心 Schema 初始化, 02 — 標的註冊表種子入庫與 30ms 模糊搜尋索引, 04 — 台股官方 TWSE/TPEx 收盤日 K 批次入庫, 08 — 美股 Yahoo Chart 日 K 限流採集器與還原價計算

**Status:** ready-for-agent

- [ ] 在 `vite.config.ts` 成功注入 Connect Middleware。
- [ ] 測試 `/api/market/history/2330?market=TW&limit=250` 能在 10ms 內回傳最新 250 根日 K JSON。
- [ ] 測試 `/api/market/symbols?q=台積` 能回傳代碼 `2330` 與名稱 `台積電`。
- [ ] 若標的不存在於資料庫，優雅回傳 404 與 `{ error: 'SYMBOL_NOT_FOUND' }`。
- [ ] 單元測試 `vite-market-middleware.test.cjs` 驗證路由分派、參數過濾與 JSON 回應格式 100% 綠燈。
