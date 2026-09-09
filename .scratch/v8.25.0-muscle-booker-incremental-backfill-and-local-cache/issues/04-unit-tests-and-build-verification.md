# Issue 04: 單元測試與 TypeScript 構建驗證 (TDD & Build Verification)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `ci`
- 驗證結果：`npm test` 57 套件 649 單元測試 100% 綠燈，`npm run build` 0 型別錯誤。

## 任務說明

1. 在單元測試中驗證：
   - 增量計算區間：本地已有資料時採用最後一筆日期推算，未有時採用最近 180 天。
   - 驗證缺損標的在非 CUSTOM_WATCHLIST 目標池時亦能觸發回補。
2. 執行全量 `npm test` 確保測試 100% 通過。
3. 執行 `npm run build` 確保 TypeScript 0 型別錯誤。
