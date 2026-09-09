# Issue 05: 全量測試與打包驗收、技術債生命週期標記與 ADR 文檔同步

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `testing`, `documentation`, `debt-lifecycle`

## 任務說明
1. 全量回歸驗證：
   - 執行 `npm test`，確保所有既有與新增測試套件 100% 綠燈通過。
   - 執行 `npm run build`，確保 TypeScript 嚴格型別 0 錯誤、Vite 打包 0 警告。
2. 技術債閉環更新：
   - 將 `docs/debts/0029-drip-compounding-engine-and-cash-flow-growth-forecaster.md` 狀態更新為 `RESOLVED`。
   - 將 `docs/debts/0021-smart-dca-simulator-and-cashflow-scheduler.md` 狀態更新為 `RESOLVED`。
   - 將 `docs/debts/0022-monte-carlo-fire-and-safe-withdrawal-simulator.md` 狀態更新為 `RESOLVED`。
   - 同步更新 `docs/debts/README.md` 看板表格。
3. 架構決策紀錄 (ADR) 與交接手冊產出：
   - 建立 `docs/adr/0112-fire-compounding-drip-and-dca-simulator.md`。
   - 同步更新 `CONTEXT.md` 與專案交接手冊。
