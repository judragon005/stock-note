# 02 — 封堵金鑰測活端點 (POST /api/market/probe-key) 全讀 SSRF 漏洞

**Parent:** #609 (Spec 0247)

**What to build:** 讓市場同步中介層之金鑰測活端點強制經過統一 SSRF 守衛與 `redirect: manual`，徹底阻斷私網探測、非白名單外連與 3xx Open Redirect 繞過。

**Blocked by:** 01

**Status:** done

- [x] 私網 IP、非白名單網域、非 HTTPS 網址回傳 403/400 且不發起底層網路連線
- [x] 上游回傳 301/302/307/308 重導向時強制攔截不跟隨
- [x] 合法金融供應商測活行為 100% 維持正常
