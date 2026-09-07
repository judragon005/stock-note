# Ticket #05: 設定中心 (Settings) 與 全站彈窗精靈 (Modals) UI/UX 升級

## 🎯 目標 (Objective)
升級設定中心（券商費率、API Keys、時光機快照）與所有核心彈窗模態框（TradeModal、EnhancedImportModal、MarginStressModal、XirrDetailModal），打造一致的沉浸式金融操作體驗。

## 📋 任務清單 (Tasks)
- [x] 重構 `src/components/SettingsWorkspace.tsx`：
  - 券商費率管理、外部 API Key 連線狀態指示燈與時光機備份還原面板。
- [x] 重構核心彈窗模態框：
  - `src/components/TradeModal.tsx`（交易錄入與編輯）
  - `src/components/EnhancedImportModal.tsx`（CSV / JSON 智慧匯入精靈）
  - `src/components/MarginStressModal.tsx`（質押維持率極端壓力測試模擬器）
  - `src/components/XirrDetailModal.tsx`（XIRR 現金流明細透視）
  - `src/components/BrokerAccountsModal.tsx` & `src/components/FrictionCenterModal.tsx`

## 🛡️ 驗收標準 (Acceptance Criteria)
- [x] 所有彈窗開啟、表單輸入、快捷操作、匯入解析與備份還原 100% 正常。
- [x] TypeScript 0 錯誤，Vitest 單元測試全部通過 (465/465 綠燈)。
