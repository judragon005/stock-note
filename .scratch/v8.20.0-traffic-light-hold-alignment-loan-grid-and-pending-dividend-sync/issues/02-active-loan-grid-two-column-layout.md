# Issue 02: 進行中股票質押與借款卡片雙欄響應式佈局

## 狀態

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ui`, `ux`, `cash-ledger`, `responsive`

## 需求說明

1. 修改 `CashLedgerWorkspace.tsx` 內「進行中股票質押與借款」卡片容器之 CSS Grid 設定。
2. 在大螢幕或 1080p 桌面環境下，一列最多只顯示 2 個卡片，杜絕 3 個卡片擠壓變形。
3. 在窄螢幕自適應為單欄排列。

## 實作成果

- 已將網格改為 `repeat(auto-fit, minmax(min(100%, max(360px, calc(50% - 16px))), 1fr))`。
- 寬螢幕下精確限制一列最多 2 欄，卡片寬度充裕易讀；小螢幕平滑降級為單欄。
