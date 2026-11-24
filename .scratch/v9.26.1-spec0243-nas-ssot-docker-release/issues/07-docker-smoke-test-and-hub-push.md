# 07 — linux/amd64 建置、本機容器冒煙閘門與 Docker Hub 雙標籤推送

**What to build:** 完成 TDD、全量測試、Build 與主幹合併後，以 `linux/amd64` 建置生產映像檔，於本機起隔離臨時容器驗證 `/healthz`、`/api/market/sync-status`、`/api/proxy` SSRF 阻擋與 `SIGTERM` 退出碼 `0`，驗證通過後推送 `judragon003/stock-tracker:v9.26.0` 與 `:latest` 至 Docker Hub。

**Blocked by:** 05, 06

**Status:** ready-for-agent

- [ ] `docker build --platform linux/amd64` 建置成功且映像檔體積輕量
- [ ] 本機臨時容器冒煙驗證全數端點 HTTP 200、SSRF 阻擋 HTTP 403、`docker stop` Exit Code `0`
- [ ] 成功推送雙標籤 `judragon003/stock-tracker:v9.26.0` 與 `judragon003/stock-tracker:latest` 至 Docker Hub
