# 0127. 股票健診系統純運算診斷引擎、穿透報告與專屬工作區架構 (Stock Health Check Diagnosis Engine, Forensic Report & Dedicated Workspace Architecture)

- **狀態**：Accepted
- **日期**：2026-09-14
- **關聯規格**：[docs/specs/0127-stock-health-check-diagnosis-engine-and-workspace-spec.md](../specs/0127-stock-health-check-diagnosis-engine-and-workspace-spec.md)
- **關聯 Issue**：[#55](https://github.com/judragon005/stock-note/issues/55)
- **關聯 PR**：[#56](https://github.com/judragon005/stock-note/pull/56)

---

## 背景與脈絡 (Context)

使用者希望專案具備對齊領先金融分析平台（如財報狗風格）之「**股票健診 (Stock Health Check)**」能力，以便在單一視覺化介面中，迅速鑑定公司是否值得投資，並排查潛在的假帳灌水與財務地雷。

經過 `/grill-with-docs` 拷問對齊，確定：
1. **4 大核心健診模組**（排除地雷股健診、定存股健診、成長股健診、便宜股健診），共 21 項量化指標。
2. **專屬一級工作區 (Dedicated Workspace)**：整合頂部說明橫幅 Banner、標的切換 Header、雙欄佈局卡片流、右側「深入了解」Q&A 導航側邊欄。
3. **離線純前端運算 (Client-Side Pure Function)**：複用 IndexedDB 20 季財報、歷史配息與即時報價，100% 本地即時計算，無需額外後端伺服器算力。
4. **金融股自動豁免**：金融控股業無存貨與製造業帳款週轉，系統自動豁免存貨週轉天數與應收帳款週轉天數，動態重算分母，確保公正客觀。

---

## 架構決策 (Decision)

1. **領域模型與插槽式架構 (`src/types/stockHealth.ts`)**：
   - 定義 `HealthCheckCategory`，包含當前 4 大核心類別及 3 大未來擴充插槽 (`SOLVENCY`, `PROFITABILITY`, `FREE_CASH_FLOW`)。
   - 定義細項指標檢驗結果 `HealthCheckItemResult`（含 `passed`, `actualValue`, `thresholdDesc`, `exempted`），以及個股全量診斷契約 `StockHealthDiagnosis`。
2. **純函式診斷引擎 (`src/utils/stockHealthDiagnosis.ts`)**：
   - **排除地雷股**：檢驗 5 年 FCF 是否有 3 年 $>0$、5 年平均 $>0$、CFO/淨利比 3 年 $>100\%$、5 年平均 $>100\%$，以及最新一季 DSO/DIO 與去年同期相比。
   - **定存股**：近 1 年殖利率 $>6\%$、近 5 年平均殖利率 $>6\%$、連續 5 年發放股息、配息發放率 3 年 $>50\%$、5 年平均發放率 $>50\%$。
   - **成長股**：近一季毛利、營業利益、稅前淨利、稅後淨利之 YoY 年增率 $>0\%$。
   - **便宜股**：本益比 5 年區間最低 20%、低於自身 5 年歷史中位數、PB 5 年最低 20%、低於自身 5 年中位數、高殖利率連動。
3. **高還原度 UI 元件層**：
   - `HealthScoreGauge.tsx`：精緻雙層 SVG 圓環比例進度條，中央大字展示通過分數（如 $4/6$）與百分比。
   - `HealthCard.tsx`：健診卡片，包含維度標題、智能評語、進度圓環與查看細節入口。
   - `HealthReportModal.tsx`：完整穿透報告彈窗，綠勾「✔ 通過」與紅叉「✖ 沒過」清單，支援 ESC 鍵與點擊遮罩關閉。
   - `StockHealthWorkspace.tsx`：一級工作區主頁，支援折疊頂部橫幅、標的切換與右側常見 QA 深入了解。

---

## 影響與驗證 (Consequences & Verification)

- **正面影響**：
  - 秒級為投資人揭示標的健康度，將複雜的 20 季三張財務報表提煉為直觀的 4 大圓環分數與 21 項檢驗指標。
  - 完全相容於深淺色主題模式與行動端響應式排版。
  - 金融股豁免機制避免了將銀行/金控股票誤判為地雷股。
- **測試與建置保證**：
  - 專屬單元測試套件 `stockHealthDiagnosis.test.ts`（9 個測試）100% 綠燈通過。
  - 全專案 89 個測試檔案、888 個單元測試 100% 通過。
  - `npm run build` TypeScript 0 錯誤。
