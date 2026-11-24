# 02 — POSIX SIGTERM/SIGINT 優雅關機與 SQLite WAL 強制落盤

**What to build:** 讓 NAS 生產伺服器在接獲容器停止或主機重開機訊號（`SIGTERM` / `SIGINT`）時，以確定性順序停止排程器、關閉 HTTP 伺服器、對 SQLite 湖倉執行 `PRAGMA wal_checkpoint(TRUNCATE)` 刷回主檔並安全關閉資料庫連線，杜絕 ZFS 磁碟上遭 `SIGKILL` 強殺造成資料庫損毀。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] SQLite 核心連線層暴露可呼叫的 WAL Checkpoint 落盤輔助函式
- [ ] 生產伺服器暴露可測試且防重入的 `gracefulShutdown` 方法，並於執行入口註冊 `SIGTERM` 與 `SIGINT` 監聽
- [ ] 停機流程具備強制逾時保護（小於 Docker 10 秒寬限期），確保乾淨退出
- [ ] 單元測試驗證停機順序與 WAL Checkpoint 執行
