# 11 — 架構適應度守門測試 (Fitness Guard) 與文檔閉環

**What to build:** 植入常駐測試管線之自動化架構適應度靜態守門測試，永久攔截同類技術債復發；同步更新技術債 0060/0061/0062 狀態、`docs/debts/README.md` 與 `CONTEXT.md`，完成全量回歸與建置驗證。

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10

**Status:** ready-for-agent

- [ ] 新增架構適應度測試驗證 4 大不變量（單一門檻定義、單一 calendar DDL、戰情卡片零裸寫漲跌色票、轉接器零 `as unknown as`）
- [ ] 更新 Debt 0060 & 0062 為 `RESOLVED`，更新 Debt 0061 記錄核心 3 項已解決與剩餘 ETF 爬蟲延後邊界，並同步更新 `docs/debts/README.md` 與 `CONTEXT.md`
- [ ] 本地 `npm test` 100% 通過且 `npm run build` 0 錯誤
