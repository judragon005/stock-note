# 專案交接手冊：歷史交易帳本欄位佈局權重優化與分頁控制系統 (Handover Document)

- **版本編號**：`v7.3.1`
- **迭代週期**：2026-09-02
- **對應規格**：[docs/specs/0070-trade-history-table-layout-and-pagination-spec.md](file:///d:/APP/股票紀錄/docs/specs/0070-trade-history-table-layout-and-pagination-spec.md)
- **架構決策 (ADR)**：[docs/adr/0070-trade-history-table-layout-and-pagination.md](file:///d:/APP/股票紀錄/docs/adr/0070-trade-history-table-layout-and-pagination.md)
- **本地工單鏡像**：[`.scratch/v7.3.1-trade-history-table-layout-and-pagination/issues/`](file:///d:/APP/股票紀錄/.scratch/v7.3.1-trade-history-table-layout-and-pagination/issues/)

---

## 1. 執行背景與交付目標 (Executive Summary)

本迭代針對歷史交易帳本 (`TradeHistoryTable.tsx`) 在特定解析度下欄位擠壓、日期折行（如 `2026-10-01` 斷裂成兩行）、類別徽章折行、表頭文字折行以及缺乏分頁控制的體驗痛點進行專案重構。達成 100% 零折行防護，重整欄位寬度權重比例，並實裝現代深色毛玻璃分頁控制器（每頁 25 / 50 / 100 / 全量）。

---

## 2. 改造範圍與檔案清單 (Modified Files & Artifacts)

### 2.1 頁面與核心元件 (Component Layer)
- [src/components/TradeHistoryTable.tsx](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx)：
  - **Zero-Wrap 零折行防禦**：日期 (`105px`)、類別 (`85px`)、數值金額 (`65~130px`) 與表頭全面套用 `whiteSpace: 'nowrap'`。
  - **欄位空間權重再分配**：釋放多餘數值留白給「標的代碼/名稱」與「策略標籤/備註」(`minWidth: 160px`)。
  - **分頁控制器**：支援每頁筆數切換膠囊 (`25`, `50`, `100`, `全部`)、快速跳頁 (`第一頁`, `上一頁`, `下一頁`, `最後一頁`)，篩選與搜尋時自動重置回第 1 頁。

### 2.2 文檔與規格同步 (Docs & Specs)
- 需求規格：[docs/specs/0070-trade-history-table-layout-and-pagination-spec.md](file:///d:/APP/股票紀錄/docs/specs/0070-trade-history-table-layout-and-pagination-spec.md)
- 架構決策：[docs/adr/0070-trade-history-table-layout-and-pagination.md](file:///d:/APP/股票紀錄/docs/adr/0070-trade-history-table-layout-and-pagination.md)
- 工單鏡像：[`.scratch/v7.3.1-trade-history-table-layout-and-pagination/issues/`](file:///d:/APP/股票紀錄/.scratch/v7.3.1-trade-history-table-layout-and-pagination/issues/)

---

## 3. 測試與品質狀態 (Test & Quality Verification)

- **TypeScript 靜態型別編譯**：`npx tsc --noEmit` ➔ **0 錯誤**。
- **單元測試全量套件**：42 個測試檔案、**465 個單元測試 100% 綠燈通過**。
- **本地伺服器**：`npm run dev` 持續運行中。

---

## 4. 未來演進建議 (Backlog)
- 支援使用者自訂預設每頁筆數並持久化至 LocalStorage。
