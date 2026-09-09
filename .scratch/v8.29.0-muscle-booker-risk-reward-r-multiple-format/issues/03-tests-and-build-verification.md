# Issue 03: 單元測試與 TypeScript 構建驗證 (TDD & Build Verification)

## 狀態與分流
- 狀態：`CLOSED` (單元測試 57 套件 654 測試 100% 通過，npm run build 0 錯誤)
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `ci`

## 任務說明
1. 修改 `src/engine/muscleBookerEngine.test.ts` 與 `src/components/MuscleBookerWorkspace.test.ts`：
   - 斷言 `riskRewardRatio` 為 `${rrRatio}R` 格式，且不包含 `1 :`。
   - 斷言 `BEGINNER_TOOLTIPS.riskReward` 包含 `R 倍數` 與 `2.0R`。
2. 執行全量 `npx vitest run` 確保 57 個測試套件 100% 綠燈。
3. 執行 `npm run build` 確保 0 型別錯誤。
