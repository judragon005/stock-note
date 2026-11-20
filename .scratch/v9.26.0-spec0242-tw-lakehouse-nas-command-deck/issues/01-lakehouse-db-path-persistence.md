# 01 — LAKEHOUSE_DB_PATH 環境變數持久化契約

**What to build:** 讓 SQLite 連線層優先讀取 LAKEHOUSE_DB_PATH，確保 Docker Volume 掛載持久化。

**Blocked by:** None — can start immediately

**Status:** done

- [x] getDbPath() 依序支援 customPath > LAKEHOUSE_DB_PATH > 預設路徑
- [x] 單元測試驗證通過
