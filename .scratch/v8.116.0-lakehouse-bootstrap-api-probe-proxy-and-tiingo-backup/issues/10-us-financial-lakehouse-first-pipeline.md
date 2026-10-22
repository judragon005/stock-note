# 10 — 美股財報分析管線 Lakehouse-First 重構 (SEC/FMP 回填)

**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** 08 — 標準化 16 核心財務三表 SQLite 湖倉表與查詢路由

**What to build:**
使用者在個股分析工作區檢視美股標的（如 AAPL、NVDA）財報時，第一優先從本地 SQLite 湖倉即時讀取財務三表，徹底避免外部 API 的 429 請求頻率限制或網路中斷問題。本地無數據時自 SEC EDGAR / FMP 抓取並自動回填持久化。

**Acceptance criteria:**
- [ ] 重構 `src/engine/usFinancialPipeline.ts` 為 Lakehouse-First 雙軌架構
- [ ] 第一優先讀取本地 SQLite 湖倉之 16 核心財務數據
- [ ] 外部拉取成功時自動回填至本機 SQLite，實現離線可用性
- [ ] 撰寫單元測試驗證美股財報管線之秒開與降級回填防護
