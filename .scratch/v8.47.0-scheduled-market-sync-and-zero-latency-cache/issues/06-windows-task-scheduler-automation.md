# 06 — Windows 工作排程器一鍵安裝腳本 (Windows Task Scheduler Automation)

**What to build:**
提供 Windows 使用者一鍵設定定時排程的腳本工具。透過批次檔或 PowerShell 腳本，自動在 Windows 工作排程器 (Task Scheduler) 中註冊兩項每日定時任務：每日 16:00 執行台股同步腳本、每日 08:00 執行美股同步腳本。腳本執行採靜默背景模式，並將輸出導向日誌檔，使用者無需人工手動打開終端機。

**Blocked by:** Ticket 01, 02, 03

**Status:** ready-for-agent

- [x] 實作 `scripts/market-sync/setup-windows-task.bat` 一鍵安裝腳本（使用 `schtasks` 指令）
- [x] 建立 `scripts/market-sync/run-sync-silent.vbs` 或隱藏視窗執行包裝，避免排程觸發時彈出黑視窗干擾
- [x] 支援每日 16:00 (台股) 與 08:00 (美股) 自動排程註冊
- [x] 提供一鍵移除或重新設定指令，確保具備冪等性 (Idempotent) 與完全可維護性
