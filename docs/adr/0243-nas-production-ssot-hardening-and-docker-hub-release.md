# ADR 0243: QNAP NAS 24/7 生產伺服器 SSOT 收斂、SQLite WAL 優雅關機、全代理補齊與 Docker Hub 雙標籤發版

- **狀態**：已採納 (Accepted)
- **日期**：2026-11-23
- **關聯規格**：[Spec 0243](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/specs/0243-nas-production-ssot-hardening-and-docker-hub-release-spec.md)
- **關聯 Issue**：#600

---

## 1. 背景與問題 (Context)

專案於本機開發並長期部署於 QNAP TS-h973AX (QuTS hero / ZFS) NAS 進行 24/7 無人值守運行，原架構存在五大底層缺口：
1. **雙軌容器腦裂**：舊版 `docs/deployment/docker/Dockerfile` 掛載 `/app/.scratch/market-cache`，新版根目錄 `Dockerfile` 硬寫死 `LAKEHOUSE_DB_PATH=/data/market_history.db`，直接更新會導致 NAS 既有歷史庫隱形。
2. **代理路由缺口**：`scripts/nas-server.cjs` 僅實作 `/api/yahoo/*`，缺少 `/api/fred/*`、`/api/twse-www/*`、`/api/twse/*`、`/api/tpex/*` 與 SSRF 白名單通用代理 `/api/proxy?url=...`。
3. **缺少優雅關機與 WAL 落盤**：未攔截 `SIGTERM`/`SIGINT` 執行 `PRAGMA wal_checkpoint(TRUNCATE)`，遭 `SIGKILL` 強制終止存在 `.db-wal` 損毀風險。
4. **排程器缺宏觀與滾動備份**：每日排程未涵蓋宏觀指標同步，每週同步後缺乏一致性滾動快照保底。
5. **純 HTTP 安全上下文與單標籤發版風險**：缺乏 HTTPS（Tailscale Serve / QNAP 反向代理）解鎖 `crypto.subtle` 指引與不可變雙標籤推送規範。

---

## 2. 架構決策 (Decision)

1. **單一權威生產伺服器 (SSOT)**：以零外部依賴之 [`scripts/nas-server.cjs`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/scripts/nas-server.cjs) 作為唯一後端入口，補齊全量固定前綴代理與受 8 大官方主機白名單保護之 `/api/proxy`（含 CORS 與 `OPTIONS` 預檢），擴充 `/healthz` 回報 `dbSizeBytes` 與 `latestBackup`；[`docs/deployment/server/prod-server.cjs`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/server/prod-server.cjs) 降級為薄轉發包裝。
2. **POSIX 優雅關機與 WAL 強制落盤**：於 [`sqlite-db-core.cjs`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/scripts/market-sync/sqlite-db-core.cjs) 暴露 `checkpointSqliteWal()`；`createNasServer` 暴露防重入 `gracefulShutdown()`，於直接啟動入口監聽 `SIGTERM`/`SIGINT`，依序停排程器 → 關 HTTP → `PRAGMA wal_checkpoint(TRUNCATE)` → 關 SQLite → 以 Exit Code `0` 退出。
3. **排程器宏觀隔離與每週滾動備份**：於 [`nas-autonomous-scheduler.cjs`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/scripts/market-sync/nas-autonomous-scheduler.cjs) 每日視窗將宏觀同步獨立隔離（支援 `FRED_API_KEY` 選配與免費 CSV 降級）；實作 `createRollingBackup`（WAL Checkpoint + `VACUUM INTO` 產出 `<base>.backup-YYYYMMDD.db` 並精確修剪保留最新 2 份），於每週同步成功後自動觸發。
4. **100% 向後相容 QNAP 既定掛載**：移除根目錄 [`Dockerfile`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/Dockerfile) 硬寫死之 `/data`，預設目錄改對齊 `/app/.scratch/market-cache` 並加上 `STOPSIGNAL SIGTERM`，同步對齊 [`docker-compose.yml`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docker-compose.yml) 與 [`QNAP_NAS_DEPLOYMENT_GUIDE.md`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/manuals/QNAP_NAS_DEPLOYMENT_GUIDE.md)（含 HTTPS 安全上下文指引與雙標籤發版 SOP）。

---

## 3. 驗證與後果 (Consequences & Verification)

- **測試縫隙**：[`src/engine/spec0243NasHardening.test.ts`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/src/engine/spec0243NasHardening.test.ts) 以 6 個垂直切片覆蓋 Seam 1（全代理、SSRF 403、`/healthz`、`gracefulShutdown`）與 Seam 2（每日宏觀錯誤隔離、滾動備份保留 2 份、週更成功/失敗備份閘門）。
- **向後相容**：QNAP 既有 `/share/Container/stock-data:/app/.scratch/market-cache` 掛載免修改即可無縫承接歷史庫，且仍支援透過 `LAKEHOUSE_DB_PATH` 自訂路徑。
