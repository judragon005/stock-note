# Issue 04: 單元測試與 TypeScript 構建驗證 (TDD & Build Verification)

## 狀態與分流

- 狀態：`CLOSED` (單元測試 57 套件 654 測試 100% 通過，npm run build 零錯誤)
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `ci`

## 任務說明

1. 在 `src/engine/muscleBookerEngine.test.ts` 與 `src/components/MuscleBookerWorkspace.test.ts` 編寫測試：
   - 帶寬 $> 8.0\%$ 且突破箱頂時，必須判定為 `HOLD`（觀望），絕不可判定為 `BUY`。
   - 帶寬 $\le 8.0\%$ 且突破箱頂、20MA 翻揚、風益比 $\ge 2.0$ 時，精確判定為 `BUY`。
   - 驗證 `formatCurrencyPrice` 美股輸出 `US$`、台股輸出 `$`。
2. 執行全量 `npx vitest run` 確保 57 個測試套件 100% 綠燈通過。
3. 執行 `npm run build` 確保 0 型別錯誤。
