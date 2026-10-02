# Ticket 03: 實裝前端分頁甦醒 (Visibility & Online) 自動重新檢查與靜默重載

## 目標
在前端全域監聽 `online` 與 `visibilitychange` 事件：
1. 當電腦喚醒或重新連線時，呼叫 `/api/market/sync-status`。
2. 若資料庫剛完成追趕同步，通知相關訂閱者（如戰情室）重新整理數據。
