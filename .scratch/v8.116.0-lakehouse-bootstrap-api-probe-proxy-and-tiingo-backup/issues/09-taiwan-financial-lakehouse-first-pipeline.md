# 09 — 台股財報分析管線 Lakehouse-First 重構 (秒開與回填)

**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** 08 — 標準化 16 核心財務三表 SQLite 湖倉表與查詢路由

**What to build:**
使用者在個股分析工作區檢視台股財報時，系統第一優先在數毫秒內從本地 SQLite 湖倉載入歷史財務三表數列，實現無延遲秒開。若本地未有數據，才自 FinMind 外部 API 獲取並自動回填持久化至本地 SQLite，終結頻率限制與重複請求。

**Acceptance criteria:**
- [ ] 重構 `src/engine/taiwanFinancialPipeline.ts` 為 Lakehouse-First 雙軌架構
- [ ] 第一優先調用 `/api/market/financials/:symbol`，命中時秒級回傳
- [ ] 本地缺失時調用外部 API，並自動觸發中介層回填入庫 SQLite
- [ ] 撰寫單元測試驗證本地命中、降級抓取與回填自癒邏輯
