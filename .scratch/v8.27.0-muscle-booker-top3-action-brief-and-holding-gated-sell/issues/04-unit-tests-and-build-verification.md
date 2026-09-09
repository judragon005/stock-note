# Issue 04: 單元測試與 TypeScript 構建驗證 (TDD & Build Verification)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `ci`

## 任務說明

1. 在 `src/components/MuscleBookerWorkspace.test.ts` 驗證：
   - 買進前 3 檔依風益比降序篩選。
   - 賣出建議嚴格限定為在籍持股（未持有之跌破標的被過濾阻擋）。
   - 在庫持股均安全時，賣出欄顯示 0 檔與安全提示。
2. 執行全量 `npm test` 確保 57 個測試套件 100% 通過。
3. 執行 `npm run build` 確保 TypeScript 0 型別錯誤。
