# Spec 0127: 股票健診系統診斷引擎、穿透報告與專屬工作區規格 (Stock Health Check Diagnosis Engine, Forensic Report & Dedicated Workspace Spec)

## Problem Statement

使用者提出系統需具備對齊業界領先之「**股票健診 (Stock Health Check)**」能力，協助投資人於單一儀表板中秒級鑑定標的之投資價值與潛在財務地雷。

經由與使用者 `/grill-with-docs` 拷問對齊，確立系統需實作四大核心健診幫手、專屬一級工作區 (Dedicated Workspace)、環形評分儀表盤，以及點擊穿透之「完整健診報告 Modal」，並針對數據深度（5 年 / 20 季）與純前端離線計算進行最佳化。

---

## Architecture & System Design

### 1. 核心領域模型與 4 大健診維度 (Domain Contract: `src/types/stockHealth.ts`)

系統架構採用**插槽式擴充設計 (Extensible Slot Architecture)**，本期實作 4 大核心健診（共 21 項細項量化指標），並保留第 5~7 項插槽（安全性、獲利能力、現金流）：

```typescript
export type HealthCheckCategory =
  | 'SAFE_GUARD'       // 排除地雷股健診 (6 項)
  | 'DIVIDEND_VALUE'   // 定存股健診 (5 項)
  | 'GROWTH_MOMENTUM'  // 成長股健診 (4 項)
  | 'CHEAP_VALUATION'  // 便宜股健診 (6 項)
  // 保留未來擴充插槽
  | 'SOLVENCY'         // 安全性健診 (Phase 2)
  | 'PROFITABILITY'    // 獲利能力健診 (Phase 2)
  | 'FREE_CASH_FLOW';  // 現金流健診 (Phase 2)

export interface HealthCheckItemResult {
  id: string;
  name: string;                    // 檢查項目名稱 (e.g. '自由現金流入近五年有三年大於 0')
  passed: boolean;                 // 是否通過
  actualValue?: number | string;   // 實際數值或比率
  thresholdDesc: string;           // 門檻敘述
  detailExplanation?: string;      // 評估說明 (如：5年中有4年為正)
  exempted?: boolean;              // 是否受產業豁免 (如金融股豁免存貨週轉)
}

export interface HealthCheckCategoryResult {
  category: HealthCheckCategory;
  title: string;                   // 模組標題 (如 '排除地雷股健診')
  description: string;             // 模組定位描述
  summaryText: string;             // 綜合評語 (動態組裝)
  totalItems: number;              // 總檢查項目數 (排除豁免項目)
  passedItems: number;             // 通過項目數
  passRatio: number;               // 通過率 (0 ~ 100%)
  items: HealthCheckItemResult[];  // 細部指標檢驗清單
}

export interface StockHealthDiagnosis {
  symbol: string;
  name?: string;
  market: 'TW' | 'US';
  currentPrice: number;
  changeRate: number;
  dataSufficientYears: number;     // 實際可用年限 (至多 5 年)
  isDataSufficient: boolean;       // 是否具備至少 4 季數據
  categories: HealthCheckCategoryResult[];
  overallSummary: string;
  updatedAt: number;
}
```

---

### 2. 四大健診與 21 項細部指標計算公式 (`src/utils/stockHealthDiagnosis.ts`)

診斷引擎為純函式 (Pure Function)，無任何副作用，接收 `QuarterlyFinancialRecord[]`（最多 20 季）、歷史配息與即時收盤價：

#### 模組 A：排除地雷股健診 (6 項指標)
1. **自由現金流入近五年有三年大於 0**：
   - 彙整過去 5 年各年度之 FCF ($\text{CFO} - \text{Capex}$)。五年中至少有 3 年 $\text{FCF} > 0$ 則通過。
2. **自由現金流入近五年平均大於 0**：
   - 過去 5 年累計 FCF 總和 $> 0$ 則通過。
3. **營業現金流入對淨利比近五年有三年大於 100%**：
   - 各年度比率 $\frac{\text{CFO}}{\text{NetIncome}} \times 100\%$。五年中至少有 3 年 $> 100\%$ 則通過（淨利為負時若 CFO 為正亦通過，若兩者皆負視為未過）。
4. **營業現金流入對淨利比近五年平均大於 100%**：
   - 5 年累計 CFO 總和 / 5 年累計 NetIncome 總和 $> 100\%$ 則通過。
5. **應收帳款週轉天數小於等於去年同期**：
   - $\text{DSO} = \frac{\text{AccountsReceivable}}{\text{Revenue}} \times 90$。最新季度之 DSO $\le$ 去年同期季度 DSO 則通過（金融股自動豁免）。
6. **存貨週轉天數小於等於去年同期**：
   - $\text{DIO} = \frac{\text{Inventory}}{\text{Revenue} - \text{GrossProfit}} \times 90$。最新季度之 DIO $\le$ 去年同期季度 DIO 則通過（金融股自動豁免）。

#### 模組 B：定存股健診 (5 項指標)
1. **近一年股息殖利率大於 6%**：
   - 最近 4 季累計配息 / 當前股價 $> 6\%$ 則通過。
2. **近五年平均股息殖利率大於 6%**：
   - 過去 5 年平均每年度殖利率 $> 6\%$ 則通過。
3. **連續五年都有發股息**：
   - 過去 5 年每一年均有至少一筆大於 0 之配息紀錄則通過。
4. **股息發放率五年內有三年大於 50%**：
   - 各年配息發放率 $\frac{\text{Dividend}}{\text{EPS}} \times 100\%$。5 年內至少 3 年 $> 50\%$ 且 $\le 120\%$ 則通過。
5. **股息發放率五年平均大於 50%**：
   - 5 年平均發放率 $> 50\%$ 且 $\le 120\%$ 則通過。

#### 模組 C：成長股健診 (4 項指標)
1. **近一季毛利年增率大於 0**：
   - $\frac{\text{GrossProfit}_{\text{latest}} - \text{GrossProfit}_{\text{YoY}}}{\text{GrossProfit}_{\text{YoY}}} > 0$。
2. **近一季營業利益年增率大於 0**：
   - $\frac{\text{OperatingIncome}_{\text{latest}} - \text{OperatingIncome}_{\text{YoY}}}{\text{OperatingIncome}_{\text{YoY}}} > 0$。
3. **近一季稅前淨利年增率大於 0**：
   - 損益表稅前盈餘（若未單列以營業利益與淨利代理估算）之年增率 $> 0$。
4. **近一季稅後淨利年增率大於 0**：
   - $\frac{\text{NetIncome}_{\text{latest}} - \text{NetIncome}_{\text{YoY}}}{\text{NetIncome}_{\text{YoY}}} > 0$。

#### 模組 D：便宜股健診 (6 項指標)
1. **本益比在 5 年內區間最低 20%**：
   - 計算過去 20 季末之歷史 PE（季末收盤價 / 近4季滾動EPS）。最新 PE 處於該歷史區間之低點 20% 分位數以下則通過。
2. **本益比低於自身 5 年歷史中位數 (50%)**：
   - 最新 PE $\le$ 過去 5 年歷史 PE 中位數則通過。
3. **股價淨值比在 5 年內區間最低 20%**：
   - 計算過去 20 季末之歷史 PB（季末收盤價 / 每股淨值）。最新 PB 處於該歷史區間之低點 20% 分位數以下則通過。
4. **股價淨值比低於自身 5 年歷史中位數 (50%)**：
   - 最新 PB $\le$ 過去 5 年歷史 PB 中位數則通過。
5. **近一年股息殖利率大於 6%**：
   - 與定存股指標 1 對齊。
6. **近五年平均股息殖利率大於 6%**：
   - 與定存股指標 2 對齊。

---

### 3. UI/UX 體系與元件結構

1. **一級工作區入口 (`StockHealthWorkspace.tsx`)**：
   - 頂部藍色導航 Banner：「歡迎使用股票健診幫手...」，可點擊「關閉說明」進行折疊隱藏。
   - 標的 Header：代碼、名稱、收盤價、漲跌幅、+ 追蹤按鈕、快速搜尋/切換輸入框。
   - 主版面採響應式雙欄佈局：
     - **左側主要區域**：4 大健診卡片流（垂直陳列）。
     - **右側側邊欄**：「深入了解」常見指引（公司整體體質如何？健診指標有變化嗎？長期持有要注意什麼？）。
2. **精準圓環進度條 (`HealthScoreGauge.tsx`)**：
   - 現代 SVG 雙層圓環（底環灰色，外環依通過比例塗滿動態顏色：綠/藍/橘/紅）。
   - 圓環中心清晰標註分數：大字 $\mathbf{4 / 6}$，下方小字標註「通過 67% 條件」。
3. **健診卡片元件 (`HealthCard.tsx`)**：
   - 標題與維度名稱（如「排除地雷股健診」）。
   - 動態組裝之智能評語（如「通過 67% 排除地雷股檢查項目，代表公司是地雷股的風險低...」）。
   - 右側展示 `HealthScoreGauge`。
   - 底部提供點擊連結：「查看完整健診細節 ➔」。
4. **完整健診報告彈窗 (`HealthReportModal.tsx`)**：
   - 標題：「[健診名稱] 完整報告」與右上角關閉按鈕。
   - 頂部導言：闡述該模組診斷原理與標的綜合結果。
   - 檢驗項目列表：
     - 每一項指標皆有獨立列，左側標籤為綠色勾勾「✔ 通過」或紅色叉叉「✖ 沒過」。
     - 右側顯示指標名稱與檢驗門檻敘述。
   - 底部提供「關閉」按鈕。

---

## Acceptance Criteria (驗收標準)

1. **診斷引擎純運算與單元測試 (Diagnosis Engine & TDD)**：
   - `stockHealthDiagnosis.test.ts` 涵蓋完整 21 項指標，測試 FCF 正負、DSO/DIO 同期比對、YoY 增長、PE/PB 百分位計算。
   - 單元測試 100% 綠燈通過，除以零與缺漏值自動防禦。
2. **產業屬性自動豁免 (Industry Exemption)**：
   - 金融控股/銀行業（`industryAttribute === 'FINANCIALS'`）自動豁免存貨週轉與應收帳款週轉，總項目自動調整為 4 項，不產生誤判。
3. **工作區整合與切換流暢 (Workspace Navigation)**：
   - 系統導航列新增「股票健診」一級工作區入口。
   - 支援切換台股與美股持倉標的或任意搜尋標的，秒級動態重算診斷結果。
4. **UI 視覺還原與主題相容 (Design Alignment & Theming)**：
   - 圓環進度條、卡片流、右側欄深入了解、完整報告 Modal 完全忠實還原截圖佈局。
   - 支援深色模式與淺色模式，高對比無破版。
5. **程式碼品質與構建 (Build & Lints)**：
   - `npm test` 100% 通過。
   - `npm run build` TypeScript 0 錯誤。

---

## Verification Plan

1. **自動化測試驗證**：
   - `npm test -- src/utils/stockHealthDiagnosis.test.ts`
   - `npm test` (全量回歸)
2. **瀏覽器端端驗收**：
   - 進入「股票健診」工作區，測試輸入 `IBM`、`2330`、`AAPL`。
   - 檢查 4 大卡片之通過數量與環形進度條。
   - 點擊「查看完整健診細節」，檢查 Modal 彈窗之 21 項紅叉/綠勾狀態與文字說明。
   - 測試金融股（如 `2881` 富邦金），驗證存貨與週轉天數豁免標記。
