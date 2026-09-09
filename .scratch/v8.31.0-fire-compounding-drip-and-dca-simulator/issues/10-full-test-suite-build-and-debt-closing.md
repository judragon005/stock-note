# Issue 10: 全量測試回歸、打包驗收、技術債生命週期標記與 ADR 產出

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `testing`, `documentation`, `debt-lifecycle`

## 任務說明
1. 全量測試與構建驗證：
   - 執行 `npm test`，確保包含既有 655 個與本次新增的全部單元測試 100% 綠燈通過。
   - 執行 `npm run build`，確保 TypeScript Strict 模式 0 錯誤、Vite 生產打包 0 警告。
2. 技術債生命週期關閉：
   - 更新 `docs/debts/0029-drip-compounding-engine-and-cash-flow-growth-forecaster.md` 狀態為 `RESOLVED`。
   - 更新 `docs/debts/0021-smart-dca-simulator-and-cashflow-scheduler.md` 狀態為 `RESOLVED`。
   - 更新 `docs/debts/0022-monte-carlo-fire-and-safe-withdrawal-simulator.md` 狀態為 `RESOLVED`。
   - 同步更新 `docs/debts/README.md` 看板表格。
3. 架構決策與領域手冊同步：
   - 產出 `docs/adr/0112-fire-compounding-drip-and-dca-simulator.md`。
   - 同步更新根目錄 `CONTEXT.md` 加入 FIRE、DRIP、DCA 領域詞彙。
   - 更新交接手冊 `docs/handoff/handoff_stock_tracker_final.md`。
