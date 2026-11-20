# 06 — 零依賴 NAS 生產伺服器、vite preview 補齊與 Docker 部署

**What to build:** 提供純 Node.js 22 輕量生產伺服器 (start:nas)、Dockerfile、docker-compose.yml 與 vite preview API 補齊。

**Blocked by:** 01, 05

**Status:** done

- [x] /healthz 與 /api/market/sync-status 回應 HTTP 200
- [x] Docker 掛載 /data/market_history.db
