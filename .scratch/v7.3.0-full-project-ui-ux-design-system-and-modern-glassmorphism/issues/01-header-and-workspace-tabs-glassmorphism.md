# Ticket #01: 導覽列 (Header) 與 工作區標籤 (WorkspaceTabs) 現代金融 HUD 升級

## 🎯 目標 (Objective)
建立現代深色玻璃擬態 (Modern Glassmorphism) 核心 Design Tokens，重構頂部 Header 控制列與 Workspace 標籤導覽，消除視覺雜訊並強化狀態回饋。

## 📋 任務清單 (Tasks)
- [x] 在 `src/index.css` 建立 CSS 變數系統（深色背景、卡片毛玻璃、光暈、等寬字型微調、心跳動畫）。
- [x] 重構 `src/components/Header.tsx`：
  - 微光 Logo + 呼吸動態光點 (Pulse Dot) + PRO 徽章。
  - 市場 (ALL/TW/US)、帳戶 (多券商)、會計口徑 (券商核帳/總報酬) 膠囊切換器 (Pills)。
  - 即時匯率與盤中狀態 HUD 晶片。
  - 操作按鈕群組化（突出 ✨智慧掃描 與 ➕新增交易）。
- [x] 重構 `src/components/WorkspaceTabs.tsx`：
  - 深藍發光選中底座、微光邊框與 Badge 徽章對比強化。

## 🛡️ 驗收標準 (Acceptance Criteria)
- [x] 原有市場、帳戶、會計口徑切換與匯出入功能 100% 正常。
- [x] TypeScript 編譯 0 錯誤。
- [x] 單元測試全量通過。
