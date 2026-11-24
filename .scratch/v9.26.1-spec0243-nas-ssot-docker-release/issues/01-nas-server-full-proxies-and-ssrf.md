# 01 — NAS 生產伺服器全量外部代理與 SSRF 白名單防護

**What to build:** 為 NAS 生產伺服器補齊與本機開發環境及舊版 NAS 伺服器對等之外部代理路由（`/api/fred/*`、`/api/twse-www/*`、`/api/twse/*`、`/api/tpex/*` 與 `/api/proxy?url=...`），確保宏觀戰情室與台股即時查詢在 NAS 上零 404，並對通用代理強制套用主機白名單（SSRF Guard）與 CORS 標頭。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `/api/proxy?url=...` 對白名單網域正確轉發並附帶 CORS 回應標頭與 `OPTIONS` 預檢支援
- [ ] `/api/proxy?url=...` 對內網 IP 或未授權網域回傳 `403 Forbidden`（SSRF Guard）
- [ ] `/api/fred/*`、`/api/twse-www/*`、`/api/twse/*`、`/api/tpex/*` 與 `/api/yahoo/*` 全部正確解析與轉發
- [ ] 以依賴注入 Mock Upstream 完成離線單元測試並綠燈通過
