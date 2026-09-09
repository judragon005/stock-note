# Issue 02: 全目標池受控並行回補隊列 (Controlled Concurrency Backfill Queue)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `component`, `concurrency`

## 任務說明

1. 修復 `src/components/MuscleBookerWorkspace.tsx` 中的回補漏失 Bug：
   - 移除 `if (missing.length > 0 && selectedPool === 'CUSTOM_WATCHLIST')` 的 `selectedPool` 限制。
   - 讓「台股市值 50」、「美股 50」、「在籍持股」與「自訂觀察」缺損標的皆可自動觸發回補。
2. 實作受控並行回補隊列（Concurrency = 3，間隔 60ms）：
   - 避免同時發送 50 個請求導致瀏覽器卡頓或遭受 Yahoo Finance 429 阻擋。
   - 每一檔標的回補成功後，立即更新 `cachedCandlesMap`，畫面即時解鎖該檔指標與決策。
   - 提供回補進度回呼（當前檔數、總檔數、當前回補代碼）。
