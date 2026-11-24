# 05 — 單一權威 Dockerfile 收斂與 100% 相容 QNAP 既定掛載

**What to build:** 消除根目錄與部署目錄之雙軌腦裂：移除根目錄 Multi-Stage Dockerfile 硬寫死之 `/data/market_history.db`，使預設資料庫路徑對齊 `/app/.scratch/market-cache/market_history.db`（100% 向後相容 QNAP 現有 `/share/Container/stock-data` 掛載，同時保留 `LAKEHOUSE_DB_PATH` 覆寫能力）；將部署目錄重複之舊 Dockerfile 與伺服器收斂對齊單一 SSOT。

**Blocked by:** 01, 02, 03, 04

**Status:** ready-for-agent

- [ ] 根目錄 Dockerfile 預設建立並掛載 `/app/.scratch/market-cache`，未設定 `LAKEHOUSE_DB_PATH` 時自動讀寫既有相容路徑
- [ ] 部署目錄之 Dockerfile 與範例 docker-compose.yml 對齊單一 SSOT，消除雙軌分岔
- [ ] 根目錄 docker-compose.yml 與部署範例一致支援選配環境變數註解
