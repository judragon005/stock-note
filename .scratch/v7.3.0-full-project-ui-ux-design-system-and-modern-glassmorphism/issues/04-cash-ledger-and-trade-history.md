# Ticket #04: 現金借貸管理 (Cash Ledger) 與 歷史交易帳本 (Trade History) UI/UX 升級

## 🎯 目標 (Objective)
升級現金水位、借貸質押管理中心與歷史交易明細帳本，強化購買力 HUD、質押維持率安全儀表與明細表格篩選。

## 📋 任務清單 (Tasks)
- [x] 重構 `src/components/CashLedgerWorkspace.tsx`：
  - 4 大資金可用性指標卡片（可用現金、在途應收、在途應付、購買力 Buying Power）等寬大字排版。
  - 全域 NAV 與槓桿負債比 LTV 卡片。
  - 在途交割時序排程看板 (Settlement Timeline) 抽屜化與小計膠囊。
  - 各券商交割戶卡片排版、真實現金餘額校正彈窗與借貸一鍵結清彈窗。
  - 全量現金流水帳本三態篩選膠囊 (`全部` / `✅ 已交割` / `⏳ 在途待交割`) 與操作微按鈕。
- [x] 重構 `src/components/TradeHistoryTable.tsx`：
  - 稅費未拆分智慧修復橫幅升級。
  - 搜尋與交易型態 (`全部` / `買進` / `賣出` / `股息` / `🏢 公司行動`) 膠囊切換列。
  - 表格等寬金融金額排版 (Tabular Numbers)、行高光與編輯刪除按鈕。

## 🛡️ 驗收標準 (Acceptance Criteria)
- [x] 現金流水同步、質押維持率與交易修改刪除完全正確。
- [x] TypeScript 0 錯誤，Vitest 465 項單元測試 100% 通過。
