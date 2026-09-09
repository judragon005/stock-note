# Issue 04: 單元測試與 TypeScript 構建驗證 (TDD & Build Verification)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `ci`
- 驗證結果：`npm test` 57 套件 650 個測試 100% 綠燈，`npm run build` 0 型別錯誤。

## 任務說明

1. 在 `src/components/MuscleBookerWorkspace.test.ts` 或 `src/engine/muscleBookerEngine.test.ts` 驗證：
   - `TW50_BLUE_CHIP_SYMBOLS.length === 50`。
   - `US_MEGA_50_CORE_SYMBOLS.length === 50`。
   - `TW_TOP_30_FOCUS_SYMBOLS.length === 30`。
   - `US_TOP_30_FOCUS_SYMBOLS.length === 30`。
   - `getScopedUniverseSymbols` 各情境下的數量與邊界驗證。
2. 執行全量 `npm test` 確保 57 個測試套件 100% 綠燈。
3. 執行 `npm run build` 確保 TypeScript 0 型別錯誤。
