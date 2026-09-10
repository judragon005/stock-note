# Issue 04: 單元測試與回歸驗證

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `regression`
- 關聯 Issue：#3

## 任務說明
1. 在 `src/engine/priceFetcher.test.ts` 編寫 404 Fast-Fail 測試。
2. 在 `src/engine/historicalOhlcvBackfill.test.ts` 編寫保底合成日 K 回退測試。
3. 在 `src/components/MuscleBookerWorkspace.test.ts` 編寫未受連鎖卡頓影響的就緒度推進與狀態解除測試。
4. 執行 `npm test` 確保 100% 綠燈，執行 `npm run build` 確保 TypeScript 0 錯誤。
