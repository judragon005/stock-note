# 03 — 前端在線與分頁甦醒 (Visibility & Online) 自動檢查 Hook

**What to build:** 使用者休眠喚醒筆電或切回瀏覽器分頁時，自動向端點發送過期檢查；若發現過期或同步完畢，自動靜默更新最新報價與頂部同步徽章。

**Blocked by:** 02 — Vite 服務啟動時之過期巡檢與背景追趕端點

**Status:** done

- [x] 建立 `useMarketCatchupSync` 自訂 Hook
- [x] 掛載 `visibilitychange` 與 `online` 事件監聽
- [x] 整合至 `AiForceDashboardView.tsx`，達成喚醒無感重新整理
