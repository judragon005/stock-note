# PRD #0038: 持股多批次會計明細 Glassmorphism 重構與體驗升級規格書 (Lots Modal Redesign & UX Enhancements)

- **版本**：v5.5
- **日期**：2026-08-28
- **狀態**：`PROPOSED`
- **關聯 ADR**：[docs/adr/0035-lot-based-accounting-and-tax-loss-harvesting.md](../adr/0035-lot-based-accounting-and-tax-loss-harvesting.md)
- **目標組件**：`src/components/LotsBreakdownModal.tsx`

---

## 1. 問題陳述與根本原因 (Problem Statement & Root Cause)

### 1.1 根本原因分析 (Root Cause)
現行 `LotsBreakdownModal.tsx` 組件內部大量採用 Tailwind CSS Utility Classes（如 `className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/40 text-xs"` 等），但本專案採用 **Vanilla CSS + CSS Variables (`var(--bg-card)`, `var(--profit-color)`, `glass-card`)** 架構，並未引入 Tailwind CSS 編譯器。
這導致瀏覽器無法解析該等類別名稱，彈窗完全退化為**無排版的原生 HTML 文本堆疊**，產生以下嚴重體驗缺陷：
1. **排版失真與文字黏連**：買進日期與剩餘股數直接黏在一起（如 `2024-04-24150`），無格線與單元格內距 (padding)。
2. **無結構化資訊層次**：頂部 4 個核心資產指標（總股數、成本基準、參考現價、未實現損益）垂直擠壓，缺乏金融儀表板卡片感。
3. **表格易讀性差**：數值沒有靠右對齊，缺乏等寬字型 (`JetBrains Mono`)，損益無明確背景色塊。
4. **功能互動受限**：缺乏批次動態欄位排序、年份過濾與智慧節稅高亮導引。

---

## 2. 產品規格與介面重構設計 (Design & UX Specification)

### 2.1 視覺設計系統 (Design Tokens & Glassmorphism)
- **彈窗容器**：
  - 遮罩：`rgba(0, 0, 0, 0.75)` 結合 `backdropFilter: blur(6px)`。
  - 本體：`glass-card` 深色毛玻璃背景，最大寬度 `920px`，圓角 `16px`，細緻邊框 `var(--border-color)`。
- **色彩適配**：
  - 損益字體與背景自適應專案紅漲綠跌主題：`var(--gain-color)`, `var(--gain-bg)`, `var(--loss-color)`, `var(--loss-bg)`。
  - 數值一律套用 `var(--font-mono)` 等寬字型與靠右對齊。

### 2.2 頂部 4 格資產指標看板 (4-Metric Summary Grid)
將標的當前部位提煉為頂部 4 個獨立玻璃卡片：
1. **在庫總股數**：顯示格式化股數（如 `26,000 股`），附帶持股佔比或類別標籤。
2. **總成本基準**：顯示幣別與總投入金額（如 `NT$1,268,049`）。
3. **參考現價**：即時報價（如 `NT$46.15`）。
4. **未實現損益**：含正負號損益金額與報酬率百分比膠囊（如 `+NT$1,155 (+20.02%)`），依漲跌著色。

### 2.3 現代化會計切換器與頁籤 (Tabs & Controller)
- **會計方法選擇器**：自訂下拉選單（移動平均 / FIFO / LIFO / HIFO / 指定批次），附帶 Hover 懸停解釋 Tooltip。
- **Segmented Control 頁籤**：
  - `[ 📦 在庫未沖銷批次 (N) ]`
  - `[ 📜 歷史賣出沖銷歸因 (N) ]`
  - `[ 💡 節稅沖銷對照 (Tax Comparison) ]`

### 2.4 批次明細表格升級 (Lots Table Enhancements)
- **表頭互動排序**：支援點擊表頭切換升降冪排序，並顯示動態排序指標（`▲` / `▼`）：
  - 買進日期 (`buyDate`)
  - 剩餘股數 (`remainingShares`)
  - 買入單價 (`buyPrice`)
  - 單股成本含費 (`unitCost`)
  - 未實現損益 (`unrealizedPnL`)
  - 持有天數 (`holdingDays`)
- **長短期稅務持有期標籤**：
  - 💎 **長期持有 (≥365天)**：綠色徽章 `長期 (856天)`，標註享有長期資本利得稅務優惠。
  - ⚡ **短期持有 (<365天)**：藍色徽章 `短期 (21天)`。
- **年份分組/過濾**：在批次眾多時提供快速年份切換按鈕（如 `[全部]`、`[2024]`、`[2026]`）。

### 2.5 💡 節稅沖銷對照 (Tax Comparison) 智慧儀表板
- 橫向網格展示 4 種沖銷法對比卡片：
  - **移動平均法 (Moving Average)**
  - **先進先出法 (FIFO)**
  - **後進先出法 (LIFO)**
  - **最高成本先出法 (HIFO)**
- 呈現各法之「已實現利得/損失」、「未實現利得/損失」、「應繳稅估算」。
- **👑 最佳節稅模式推薦徽章**：自動判定並高亮「稅負最低 / 虧損收割最大化」之方法，並標示相比移動平均「可遞延/省下之已實現利得差額」。

### 2.6 歷史賣出沖銷歸因 (Disposals View)
- 呈現每筆賣出交易（日期、賣出價格、賣出股數、總獲利），下方展開該筆賣出具體沖銷了哪些買進批次（買入日、扣減股數、該批實現損益）。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

- [ ] **AC-1 (樣式與設計相容性)**：徹底移除 `LotsBreakdownModal.tsx` 中所有未生效之 Tailwind CSS 類別，全面採用專案 inline styles 與 CSS 變數，文字與欄位無黏連，具備完整 Glassmorphism 頂級深色金融質感。
- [ ] **AC-2 (頂部指標看板)**：頂部 4 格資產指標看板精確顯示在庫股數、成本基準、參考現價與未實現損益（含正負著色與百分比）。
- [ ] **AC-3 (批次表格排序)**：點擊批次表格任一欄位表頭可即時切換升冪 / 降冪排序，並具備箭頭標示。
- [ ] **AC-4 (長短期持有期標籤)**：買進天數 $\ge 365$ 天自動標示為綠色長期徽章，$< 365$ 天標示為藍色短期徽章。
- [ ] **AC-5 (年份過濾功能)**：提供年份快速過濾晶片，點擊可僅顯示該年度買進之在庫批次。
- [ ] **AC-6 (節稅對照儀表板)**：Tax Comparison 頁籤能清晰呈現 4 種會計方法對比，並標註最佳節稅推薦模式與差額。
- [ ] **AC-7 (快捷操作與無障礙)**：支援 `Escape` 鍵與點擊背景遮罩關閉彈窗。
- [ ] **AC-8 (品質門禁)**：`npm test` 100% 通過（含現有與新增組件測試），`npm run build` 0 TypeScript 錯誤。
