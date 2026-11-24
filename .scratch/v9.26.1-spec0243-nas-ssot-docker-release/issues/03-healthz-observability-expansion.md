# 03 — /healthz 長期運行可觀測性擴充

**What to build:** 擴充 `/healthz` 端點回傳實際使用的資料庫路徑、資料庫檔案大小（bytes）、排程器啟用與最近執行狀態，以及最新備份資訊，提供 24/7 無人值守運行時的即時健康度診斷。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `GET /healthz` 回傳 HTTP 200 JSON，包含 `status: "ok"`、`dbPath`、`dbSizeBytes`、`scheduler` 與 `latestBackup`
- [ ] 資料庫檔案尚未建立時不拋錯，`dbSizeBytes` 誠實回傳 `0`
- [ ] 單元測試驗證正常與空檔邊界條件
