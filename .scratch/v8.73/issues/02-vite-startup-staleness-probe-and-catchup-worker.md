# 02 — Vite 服務啟動時之過期巡檢與背景追趕端點

**What to build:** 實作 `/api/market/sync-status` 端點與 Vite 開發伺服器啟動巡檢；若因關機錯過台股 (16:00) 或美股 (08:00) 排程，系統開機後自動在背景執行追趕補齊，不阻塞操作。

**Blocked by:** 01 — 執行全市場歷史 CSV 全量回補至 SQLite 本機湖倉

**Status:** done

- [x] Vite 中介層新增 `/api/market/sync-status` 檢查湖倉與排程狀態
- [x] 伺服器啟動時非同步觸發追趕檢查，若陳舊則自動喚醒 Worker 補齊
- [x] 測試環境下跳過非同步背景同步，避免影響單元測試執行速度
