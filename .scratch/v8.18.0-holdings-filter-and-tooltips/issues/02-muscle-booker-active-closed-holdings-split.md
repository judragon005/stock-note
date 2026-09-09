# Issue 02: 肌肉書僮動能雷達「在倉持股」與「歷史閉倉」雙分流

## 狀態

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`muscle-booker`, `ui`

## 需求

1. 在 `MuscleBookerWorkspace.tsx` 將持倉池細分為：
   - `HOLDINGS_ACTIVE`：在倉持股 (`shares > 0`)，按鈕顯示 `台股在倉 (${activeCount})`，作為預設選項。
   - `HOLDINGS_CLOSED`：已閉倉 (`shares === 0`)，按鈕顯示 `歷史平倉 (${closedCount})`。
2. 避免將歷史平倉標的混入當前在倉操盤雷達。

