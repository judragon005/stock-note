# 05 — 同步狀態指示徽章與稽核彈窗 (Market Sync Status Badge & Audit Modal)

**What to build:**
提供直觀、現代化的 UI 指示器，讓使用者隨時掌握今日盤後資料的同步狀態與新鮮度。在主畫面上方或功能列新增 `MarketSyncStatusBadge`，顯示綠色勾號與更新時間（例：「台股已同步 16:01 | 美股已同步 08:02」），點擊可開啟彈窗查看完整的 `sync_audit_report.json` 稽核細節（涵蓋標的數、成功率、耗時等），並提供手動「立即補跑更新」按鈕。

**Blocked by:** Ticket 03, 04

**Status:** ready-for-agent

- [x] 實作 `src/components/MarketSyncStatusBadge.tsx` 狀態指示徽章元件
- [x] 整合毛玻璃風格彈窗，展示每日同步稽核詳情（更新時間、覆蓋率、耗時、死信重試紀錄）
- [x] 支援手動觸發按鈕或複製執行指令提示
- [x] 遵循專案全域現代 UI/UX 與暗黑/明亮主題色彩變數規範
