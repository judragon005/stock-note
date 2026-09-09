# Issue 03: 頂部日 K 快取狀態列與動態進度條 UI (Cache Sync Toolbar UI)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `ui`, `ux`

## 任務說明

1. 在 `src/components/MuscleBookerWorkspace.tsx` 頂部新增「日 K 本地快取狀態與同步列」：
   - 顯示當前目標池的快取就緒度（如：`📊 本地日 K 就緒：45/50 檔 (90%)`）。
   - 當回補進行中時：
     - 展示平滑的進度條（Progress Bar）。
     - 顯示「⏳ 正在增量同步：2330 台積電 (12/50)...」。
   - 當全數完成時：
     - 顯示「🟢 本地日 K 均已就緒 (離線即時計算)」。
   - 提供「🔄 增量更新」按鈕，讓使用者盤後可手動一鍵抓取當日收盤補齊。
