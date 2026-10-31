# 03 — 已配置加密 API 金鑰池自動水合與 /api/market/macro 多源權威總經接線 (Encrypted API Key Pool Auto-Hydration & Multi-Source Macro Pipeline)

**What to build:**
啟動時透過 `ensureKeyPoolHydrated()` 自動將使用者於 `UnifiedApiKeyManager` 已配置的加密金鑰池 (`FRED`, `FinMind`, `Finnhub`, `FMP`, `Tiingo`, `Alpha Vantage`) 載入 `globalKeyRotator`，並透過本地安全 Header 橋接至 `/api/market/macro`（含 5 秒超時熔斷與額度回報）。點擊「🔄 重新整理數據」時，直接由 `FRED` 拉取官方 Fed 基準利率 (`FEDFUNDS`)、美國 CPI 年增率 (`CPIAUCSL`)、10Y-2Y 利差 (`T10Y2Y`)、高收益債利差 (`BAMLH0A0HYM2`)，由 `Yahoo Finance` 拉取 `GC=F`、`CL=F`、`DX-Y.NYB`、`TWD=X`、`^VIX`、`^TNX`，並由 `FinMind`/期交所拉取外資台指期未平倉與大盤融資維持率。

**Blocked by:** 02 — Zero-Mock 假數據拔除、國際黃金現貨 (GC=F) 正名與真實時間戳狀態徽章

**Status:** ready-for-agent

- [x] `ensureKeyPoolHydrated()` 自動將 `loadEncryptedKeyPool()` 與舊版 `apiKeysConfig` 金鑰註冊進 `globalKeyRotator`
- [x] `/api/market/macro` 接收本地金鑰 Header 並並行抓取 FRED、FinMind、Yahoo Finance 與期交所真實數據寫入 SQLite 快取
- [x] 戰情室「重新整理數據」按鈕真實觸發 `/api/market/macro?refresh=1` 並更新金鑰今日使用額度與畫面指標

