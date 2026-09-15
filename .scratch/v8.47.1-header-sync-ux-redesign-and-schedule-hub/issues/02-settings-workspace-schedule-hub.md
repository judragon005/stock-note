# 02 — 設定中心盤後自動化與 Windows 排程管理面板 (Settings Workspace Schedule Hub)

**What to build:**
落實使用者要求「可以在專案內自由管理、增加與卸載 Windows 排程」。在 `SettingsWorkspace.tsx` 內建專屬的【盤後自動化與 Windows 工作排程管理 (Market Sync Hub)】卡片，清晰展示台股 (16:00) 與美股 (08:00) 排程最新執行狀態，並提供一鍵複製「安裝/啟用指令」與「一鍵卸載/移除指令」，以及路徑重綁定說明，讓使用者在專案內即可自由完全掌控排程生命週期。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

- [ ] 在 `SettingsWorkspace.tsx` 新增獨立卡片【盤後數據與 Windows 自動化排程管理】
- [ ] 視覺化展示台美股排程時間點、今日同步狀態、涵蓋檔數與數據庫新鮮度
- [ ] 實作「一鍵複製安裝指令」按鈕（提供複製 PowerShell / CMD 指令）
- [ ] 實作「一鍵複製卸載指令」按鈕（提供複製移除 `StockTracker_TW_Sync` 與 `StockTracker_US_Sync` 的 `schtasks /delete` 指令）
- [ ] 提供「搬遷資料夾重新綁定路徑」指南與「手動立即補跑」測試指令
