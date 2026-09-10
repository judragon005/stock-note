# Issue 04: 輕量 Toast 提示、狀態列與雷達整合 (Toast Notifications & Workspace Integration)

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `ui-ux`, `integration`
- 關聯 Issue：#5

## 任務說明
1. 在 `src/components/MuscleBookerWorkspace.tsx` 整合：
   - 掛載時背景啟動 `checkAndSyncUniverseDaily`。
   - 若 `syncResult.hasChanges === true`，於介面彈出輕量 Toast 提示（如「🔔 已自動完成成分股校準：剔除下市標的 [SQ]，自動遞補 [PYPL]」）。
   - 頂部工具列標註成分股狀態（如 `🟢 官方成分股 (今日已校準)`）並提供手動「🔄 檢查官方成分股」按鈕。
2. 執行 `npm test` 與 `npm run build` 進行 100% 全量回歸驗證。
