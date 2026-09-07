# 專案交接手冊：全站 UI/UX 現代金融終端深色玻璃擬態設計系統 (Handover Document)

- **版本編號**：`v7.3.0`
- **迭代週期**：2026-09-02
- **對應規格**：[docs/specs/0069-full-project-ui-ux-design-system-and-modern-glassmorphism-spec.md](file:///d:/APP/股票紀錄/docs/specs/0069-full-project-ui-ux-design-system-and-modern-glassmorphism-spec.md)
- **架構決策 (ADR)**：[docs/adr/0069-full-project-ui-ux-design-system-and-modern-glassmorphism.md](file:///d:/APP/股票紀錄/docs/adr/0069-full-project-ui-ux-design-system-and-modern-glassmorphism.md)
- **本地工單鏡像**：[`.scratch/v7.3.0-full-project-ui-ux-design-system-and-modern-glassmorphism/issues/`](file:///d:/APP/股票紀錄/.scratch/v7.3.0-full-project-ui-ux-design-system-and-modern-glassmorphism/issues/)

---

## 1. 執行背景與交付目標 (Executive Summary)

本迭代針對全系統所有的頁面與彈窗進行使用者介面 (UI) 與使用者體驗 (UX) 的全面進化，建立**現代深色玻璃擬態 (Modern Glassmorphism) + 極致金融終端風**之設計語言。以一個頁面一個頁面推進、TDD 紅綠重構與代碼審查雙軸把關，確保既有會計恆等式、損益、現金流、質押維持率與除息功能零破壞。

---

## 2. 改造範圍與檔案清單 (Modified Files & Artifacts)

### 2.1 設計系統與樣式層 (Design Tokens & Global CSS)
- `src/index.css`：引入 Glassmorphism Tokens、微光漸變、脈衝光點 (Pulse Dot) 與等寬數字規範。

### 2.2 頁面與核心元件層 (Pages & Core Components)
1. **頂部 HUD 導覽列與標籤**：
   - `src/components/Header.tsx`：微光 Logo、盤中脈衝圓點、市場/帳戶/會計模式切換器。
   - `src/components/WorkspaceTabs.tsx`：膠囊化標籤導航、深藍發光選中底座、微光邊框與 Badge 徽章。
2. **投資組合總覽 (Portfolio Overview)**：
   - `src/components/SummaryCards.tsx`：金融大字等寬排版 (Tabular Numbers)、柔和損益邊框。
   - `src/components/AllocationChart.tsx`：三段式微漸變進度條與視圖膠囊。
   - `src/components/HoldingsTable.tsx`：持倉/平倉/全部三態篩選膠囊、行懸停高亮。
3. **資產成長折線圖與股利日誌**：
   - `src/components/PortfolioGrowthChart.tsx`：時間範圍 Pill Switcher、折線顯示開關、量化風控指標 (Alpha/Beta/Sharpe/Vol/MDD) 與 Tooltip 診斷卡片。
   - `src/components/DividendLogView.tsx`：Hero Header Banner 深色玻璃漸變、4-Pillars 發光 KPI 卡片、1~12 月立體柱狀圖、Top 5 標的貢獻榜、除息待入帳與即將除息雙看板。
4. **現金借貸管理與歷史交易帳本**：
   - `src/components/CashLedgerWorkspace.tsx`：4 大資金可用性指標看板 (Buying Power)、時序排程抽屜 (Timeline)、質押三大規費與一鍵結清。
   - `src/components/TradeHistoryTable.tsx`：智慧稅費拆分橫幅、搜尋與型態膠囊切換列、等寬金額排版。
5. **設定中心與核心彈窗模態框**：
   - `src/components/SettingsWorkspace.tsx`：5 大摩擦成本指標發光卡片、券商帳戶卡片、API Key 狀態指示燈、時光機快照管理。
   - `src/components/TradeModal.tsx`：市場與買賣型態漸變膠囊按鈕、毛玻璃遮罩。
   - `src/components/EnhancedImportModal.tsx`、`src/components/MarginStressModal.tsx`、`src/components/XirrDetailModal.tsx` 等。

---

## 3. 測試與品質狀態 (Test & Quality Verification)

- **TypeScript 靜態型別編譯**：`npx tsc --noEmit` ➔ **0 錯誤**。
- **單元測試全量套件**：42 個測試檔案、**465 個單元測試 100% 綠燈通過**。
- **本地伺服器**：`npm run dev` 正常運作中。

---

## 4. 未來演進與後續建議 (Next Iteration Backlog)

1. **宏觀流動性與 AI 戰情室整合**：參見 [docs/debts/0020-market-war-room-macro-liquidity-and-ai-advisor.md](file:///d:/APP/股票紀錄/docs/debts/0020-market-war-room-macro-liquidity-and-ai-advisor.md)。
2. **多語系與主題自訂微調**：支援未來主題色調客製化。
