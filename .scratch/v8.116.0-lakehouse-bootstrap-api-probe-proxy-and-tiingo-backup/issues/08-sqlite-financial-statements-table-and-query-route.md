# 08 — 標準化 16 核心財務三表 SQLite 湖倉表與查詢路由

**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** None — can start immediately

**What to build:**
為本機 SQLite 數據湖倉打造輕量、高維度的財務三表基礎設施。建立 `financial_statements_quarterly` 資料表，標準化 16 核心會計科目（營收、毛利、營業利益、母公司淨利、EPS、總資產、總負債、權益、現金流等），並在本地中介層建立 `GET /api/market/financials/:symbol` 高速查詢路由。

**Acceptance criteria:**
- [ ] 於 `scripts/market-sync/sqlite-db-core.cjs` 初始化 `financial_statements_quarterly` 表與 `(symbol, year, quarter)` 複合主鍵
- [ ] 欄位嚴格對齊 16 項標準化科目，杜絕全量龐雜科目膨脹
- [ ] 於 `scripts/market-sync/vite-market-middleware.cjs` 實作 `GET /api/market/financials/:symbol` 端點
- [ ] 撰寫中介層路由與資料表讀寫測試，驗證毫秒級查詢效能
