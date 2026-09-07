# ADR 0069: 全站 UI/UX 現代金融終端深色玻璃擬態架構決策 (Full Project UI/UX Modern Glassmorphism Architecture)

## 狀態 (Status)
已批准 (Accepted)

## 上下文 (Context)
本專案功能隨著雙市場會計、XIRR、質押風控、公司行動智慧掃描等不斷擴充，既有視覺層次與控制器排版存在視覺雜訊高、數字掃描易讀性不足等問題。需要建立一套輕量、高效能且符合現代深色玻璃擬態（Modern Glassmorphism）與極致金融終端風（HUD Segmented Controls, Pulse Dots, Tabular Numbers）的統一設計系統。

## 決策 (Decision)
1. **設計 Token 集中化**：於 [src/index.css](file:///d:/APP/股票紀錄/src/index.css) 統一維護 CSS 自定義變數（包含雙主題漲跌色、卡片毛玻璃、光暈半徑、等寬字型微調、心跳動畫）。
2. **循序漸進迭代 (Phased Migration)**：
   - 階段 1：[Header.tsx](file:///d:/APP/股票紀錄/src/components/Header.tsx)、[WorkspaceTabs.tsx](file:///d:/APP/股票紀錄/src/components/WorkspaceTabs.tsx) 與 Portfolio 總覽頁面。
   - 階段 2：[PortfolioGrowthChart.tsx](file:///d:/APP/股票紀錄/src/components/PortfolioGrowthChart.tsx) 與 [DividendLogView.tsx](file:///d:/APP/股票紀錄/src/components/DividendLogView.tsx)。
   - 階段 3：[CashLedgerWorkspace.tsx](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx) 與 [TradeHistoryTable.tsx](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx)。
   - 階段 4：[SettingsWorkspace.tsx](file:///d:/APP/股票紀錄/src/components/SettingsWorkspace.tsx)。
   - 階段 5：全站模態框 (Modals)。
3. **零破壞相容性保證**：所有元件 Props、回呼、計算邏輯與狀態 100% 保持相容，以單元測試與 TypeScript 0 錯誤作為守護網。

## 後果 (Consequences)
- **正面影響**：極大提升視覺一致性、資訊層次與專業金融終端使用體驗；大幅降低操作干擾與誤觸機率。
- **維護成本**：所有新增頁面與元件均需遵循本標準之 Pill 膠囊切換與等寬數字樣式。
