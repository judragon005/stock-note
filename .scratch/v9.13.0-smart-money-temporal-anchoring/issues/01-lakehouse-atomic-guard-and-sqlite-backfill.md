# 01 — 湖倉籌碼雙邊原子性守衛與本機 SQLite 缺口實庫回補

**Parent:** #433 (Spec 0218)
**GitHub Issue:** #434 (CLOSED)

**What to build:**
1. 在 `scripts/market-sync/sync-tw-market.cjs` 與 `backfill-tw-history-web.cjs` 實作三大法人雙邊完整性守衛（TWSE 與 TPEx 筆數均需 > 500 筆）。
2. 更新定時同步排程為 16:45 (`setup-windows-task.bat`)。
3. 本機 SQLite 湖倉回補 10/27~11/04 上市三大法人籌碼至 COUNT >= 2300 筆。

**Acceptance Criteria:**
- [x] 單邊殘缺日（如上市為 0）拒絕寫入 SQLite 且不覆蓋快取。
- [x] 雙邊完整結算日正常入庫。
- [x] 單元測試 100% 通過。
