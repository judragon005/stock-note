# Ticket 04: 全量回歸驗證、文檔同步與技術債閉環 (Full Regression & Debt Resolution)

## 任務描述
執行全專案自動化測試與 TypeScript 編譯校驗，更新技術債看板（將技術債 #0012 標記為 `RESOLVED`），並同步專案上下文與交接文檔。

## 涉及檔案
- `docs/debts/0012-target-allocation-drift-and-rebalancing-optimizer.md` (修改)
- `docs/debts/README.md` (修改)
- `CONTEXT.md` (修改)

## 驗收標準 (Acceptance Criteria)
1. 執行 `npm test`，確保包含既有測試與新增之再平衡單元測試 100% 通過。
2. 執行 `npm run build`，確保 TypeScript 類型檢查與 Vite 打包 0 錯誤。
3. 更新 `docs/debts/0012-target-allocation-drift-and-rebalancing-optimizer.md` 狀態為 `RESOLVED`，記錄解決版本為 `v7.0.0 (PRD #0065)`。
4. 更新 `docs/debts/README.md` 看板狀態為 `RESOLVED`。
5. 同步更新 `CONTEXT.md`，登錄再平衡模組架構。
