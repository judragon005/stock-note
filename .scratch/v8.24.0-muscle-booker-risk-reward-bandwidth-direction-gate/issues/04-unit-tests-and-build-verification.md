# Issue 04: 單元測試與 TypeScript 構建驗證 (TDD & Build Verification)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `ci`
- 驗證結果：`npm test` 57 個測試套件、646 個單元測試 100% 通過；`npm run build` 0 型別錯誤。

## 任務說明

1. 在 `src/engine/muscleBookerEngine.test.ts` 或 `src/components/MuscleBookerWorkspace.test.ts`：
   - 驗證風益比 $< 2.0$ 時自動退回 `HOLD`（觀望待變），不判定為 `BUY`。
   - 驗證風益比 $\ge 2.0$ 且帶寬方向確立時判定為 `BUY`。
   - 驗證 `buyItems` 按風益比降序排序。
2. 執行全量 `npm test` 確保 57 個測試套件 100% 通過。
3. 執行 `npm run build` 確保 TypeScript 0 型別錯誤。
