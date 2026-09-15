# ADR 0133: 頂部 Header 盤後快取狀態膠囊視覺重構與設定中心 Windows 排程管理中樞

## 狀態
已通過 (Accepted)

## 上下文 (Context)
在 Spec 0132 中導入了 Windows 每日定時盤後同步腳本與本地快取徽章（`MarketSyncStatusBadge`），但面臨兩大使用者痛點：
1. **Header 視覺失衡與樣式突兀**：
   原 `MarketSyncStatusBadge` 採用 Tailwind 預設類別，帶有淺白底色與生硬邊框，緊貼左側按鈕區（`⚡ 更新市價`），嚴重破壞頂部導航列的黑金毛玻璃對稱感與呼吸感。
2. **Windows 背景排程管理痛點與沙盒安全邊界**：
   使用者詢問排程日後要如何移除，是否能直接在前端網頁內增加與卸載排程。然而前端 SPA 運行於瀏覽器沙盒中，無法越權直接呼叫系統底層命令（如 `schtasks`）；若為此引入常駐本地後端微服務，會違反 KISS 原則與無伺服器架構。

## 決策 (Decisions)

1. **Header 狀態膠囊極簡深色重構 (Zero Tailwind & Glassmorphism)**：
   - 全面移除 Tailwind CSS，改用專案原生 Design Tokens 與深色半透明毛玻璃 (`rgba(19, 29, 49, 0.7)`)。
   - 文字精簡為膠囊格式 (`🇹🇼 16:00 · 🇺🇸 08:00`)，並將該元件由左側按鈕列移至右側狀態晶片組（與「台股盤中」狀態並列），左側按鈕區還原乾淨留白。
   - 彈窗介面全面採用統一的深色毛玻璃卡片（`linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(10, 16, 30, 0.95))`），提供「前往設定中心」跳轉按鈕。
2. **設定中心 Windows 排程管理面板 (`MarketScheduleHubSection`)**：
   - 在「設定中心 (SettingsWorkspace)」第四區塊下方建立「全市場每日盤後自動化與 Windows 排程管理」專區。
   - **水線展示**：清晰列出台股（16:00）與美股（08:00）任務名稱、最新快取日期、總標的數與執行耗時。
   - **一鍵卸載**：提供一鍵複製 CMD / PowerShell 強制刪除指令：
     `schtasks /delete /tn "StockTracker_TW_Sync" /f & schtasks /delete /tn "StockTracker_US_Sync" /f`
     以及雙擊批次檔選單 `[2]` 的極簡說明。
   - **一鍵安裝與搬遷指引**：提供批次檔路徑與工作排程器絕對路徑重綁定說明。

## 後果與影響 (Consequences)
- **正面**：
  - Header 視覺恢復一致的高質感黑金毛玻璃風格，無白邊突兀感。
  - 使用者對 Windows 工作排程器的管理與卸載具備完全的透明度與可控性，無需摸索 Windows 排程器 UI。
  - 符合瀏覽器沙盒安全規範與 KISS 原則，維持 0 本地額外常駐服務開銷。
- **負面/代價**：
  - 卸載與初次安裝仍需使用者在終端機貼上指令或雙擊批次檔，但已降至最低摩擦阻力（一鍵複製）。
