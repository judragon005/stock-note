# 04 — NAS 自治排程器每日宏觀同步與每週滾動快照備份

**What to build:** 強化 24/7 無頭排程器：每日盤後同步除台美股外一併執行宏觀指標更新（支援自環境變數讀取 `FRED_API_KEY` 等選配金鑰，未提供則優雅降級免費源）；每週全市場湖倉同步完成後，自動於持久化目錄產出一致性 SQLite 快照備份並僅保留最新 2 份。

**Blocked by:** 02 — POSIX SIGTERM/SIGINT 優雅關機與 SQLite WAL 強制落盤

**Status:** ready-for-agent

- [ ] 每日盤後增量任務納入宏觀數據同步，且單一子任務異常不中斷其他任務
- [ ] 實作滾動備份純函式：先執行 WAL Checkpoint，再產出 `market_history.backup-YYYYMMDD.db` 並修剪保留最新 2 份
- [ ] 每週同步成功後自動觸發滾動備份並記錄最新備份狀態
- [ ] 以確定性時間與暫存目錄完成離線單元測試
