# PRD #0045: 淨槓桿零負債現貨保護機制與被動收入各項利息獨立膠囊展示規格書 (Risk Leverage Zero-Debt Protection & Multi-Interest Badges)

- **版本**：v5.7.4
- **狀態**：`PROPOSED`
- **日期**：2026-08-28
- **關聯 PRD**：
  - [PRD #0020: 股息稅費追蹤與美股預扣稅淨額口徑](0020-dividend-tax-and-withholding-tracking.md)
  - [PRD #0023: 現金流帳本與多幣別借貸槓桿管理系統](0023-cash-ledger-and-loan-leverage-system.md)
  - [PRD #0037: 整戶總曝險與淨槓桿率 (Net Leverage) 計算引擎與極端斷頭壓力測試](0037-portfolio-leverage-exposure-and-margin-stress-testing.md)
- **目標檔案**：
  - `src/engine/riskExposureEngine.ts` (核心槓桿計算引擎：修復無負債現貨之除以零/負 NAV 誤判)
  - `src/engine/riskExposureEngine.test.ts` (單元測試：無負債負現金場景、美股/台股隔離場景)
  - `src/engine/cashLedgerEngine.ts` (擴充：各項利息收入依來源項目與幣別聚合 Helper)
  - `src/engine/cashLedgerEngine.test.ts` (單元測試：利息明細聚合與市場過濾測試)
  - `src/components/SummaryCards.tsx` (UI：被動收入卡片主數字包含利息、各項利息收入以獨立膠囊個別展示)
  - `src/App.tsx` (整合：計算 exposureMetrics 與利息摘要時進行市場範圍過濾與資料注入)

---

## 1. 概述與問題背景 (Executive Summary & Problem Statement)

### 1.1 現行痛點

1. **美股現貨無槓桿卻誤判「99.99x 極度危險」**：
   - 使用者在系統中記錄美股現貨交易（如買進 VT），且未進行任何融資借貸（`loans` 為空且無槓桿負債）。
   - 因尚未在「現金帳本」中手動補登等額入金（Deposit），導致現金帳本呈現負餘額；切換至「美股」視圖時，由於全戶台股負現金或美股已平倉累計流出，使得計算得出的淨資產 $\text{NAV} \le 0$。
   - `riskExposureEngine.ts` 將 $\text{NAV} \le 0$ 一律直接視為「資不抵債」並硬編碼輸出 `netLeverage = 99.99x`、風險等級為 `HIGH_RISK`（極度危險），造成現貨投資者極大困惑與系統警示失真。
   - 此外，槓桿計算在切換市場分頁（TW/US/ALL）時，未依當前市場隔離現金餘額與持倉。

2. **「累計股息收益」卡片缺乏各項利息收入之獨立膠囊**：
   - 目前右上角第 4 張卡片僅統計股票之現金股利（`totalDividends`），未納入現金帳本中記錄的各項利息收入（如活存利息、借券收益、美債利息等）。
   - 使用者明確要求：主數字應反映完整的被動收入（股息 + 利息），且各項利息收入必須仿照「美股預扣 30%」之膠囊樣式，**個別獨立顯示**（依項目/備註分開），絕不能全部混在一起。

---

## 2. 核心架構與計算模型 (Architecture & Calculation Engine)

### 2.1 淨槓桿零負債現貨保護引擎 (Zero-Debt Spot Protection)

在 `src/engine/riskExposureEngine.ts` 中調整計算式：

1. **總借款負債判定 (`totalDebtTWD`)**：
   - 遍歷所屬市場之 `loans`，若 $\sum \text{Principal} = 0$，表示帳戶**完全無外部借款與融資負債**。

2. **零負債現貨保護邏輯**：
   - **當 `totalDebtTWD === 0`**：
     - 若現金餘額大於 0：$\text{NAV} = \text{總股票市值} + \text{可用現金}$，$\text{Net Leverage} = \frac{\text{總股票市值} - \text{可用現金}}{\text{NAV}} \le 1.00x$。
     - 若現金餘額小於等於 0（純粹因未手動補錄入金流水，而非真實欠券商款項）：將其判定為自有資金足額現貨持有，$\text{NAV} = \text{總股票市值}$，$\text{Gross Leverage} = 1.00x$、$\text{Net Leverage} = 1.00x$。
     - 風險等級判定為 `CONSERVATIVE` (穩健無槓桿 $\le 1.0x$)。
   - **當 `totalDebtTWD > 0` (存在實質借貸/質押負債)**：
     - 若 $\text{NAV} > 0$：依標準金融公式計算 $\text{Net Leverage} = \max\left(0, \frac{\text{總股票市值} - \max(0, \text{可用現金})}{\text{NAV}}\right)$。
     - 若 $\text{NAV} \le 0$：此時確實屬於資不抵債之高風險狀態，設定為 `99.99x` 與 `HIGH_RISK`。

3. **市場視圖隔離連動 (`App.tsx`)**：
   - 當 `currentMarket === 'US'`：僅傳入美股持倉 `holdings`、美元可用現金 `cashBalances.USD`、美元借貸。
   - 當 `currentMarket === 'TW'`：僅傳入台股持倉 `holdings`、台幣可用現金 `cashBalances.TWD`、台幣借貸。
   - 當 `currentMarket === 'ALL'`：傳入全戶持倉與全戶現金（折合 TWD）。

---

### 2.2 各項利息收入聚合引擎 (Interest Income Aggregator)

在 `src/engine/cashLedgerEngine.ts` 中新增/擴充輔助函式 `aggregateInterestIncomeDetails`：

```typescript
export interface InterestIncomeItem {
  id: string;
  name: string;        // 項目名稱 (例如：活存利息、借券收益、美債息，若備註為空則為「利息收入」)
  amount: number;      // 該項目累計金額 (原生幣別)
  amountInTWD: number; // 折算台幣金額
  currency: Currency;  // TWD | USD
}

export interface PassiveIncomeBreakdown {
  totalDividendAmount: number;   // 股息金額 (當前市場幣別或折算 TWD)
  totalInterestAmount: number;   // 各項利息合計 (當前市場幣別或折算 TWD)
  totalPassiveIncome: number;    // 總被動收益 (股息 + 利息)
  interestItems: InterestIncomeItem[]; // 各項利息明細獨立清單 (供膠囊渲染)
}
```

#### 聚合規則：
1. 過濾 `cashTransactions` 中類別為 `INTEREST_INCOME` 或 `INTEREST` 且已交割/生效之紀錄。
2. 依當前市場過濾：美股僅取 `USD`、台股僅取 `TWD`、全部則取全量。
3. 依 `tx.note?.trim() || '利息收入'` 與 `tx.currency` 分組累加金額。

---

## 3. UI/UX 與視覺展示規範 (Visual Design & Component Spec)

### 3.1 累計被動收益卡片 (`src/components/SummaryCards.tsx`)

1. **卡片標題**：
   - 標題由「累計股息收益 (被動收入)」調整或保持「累計股息與利息收益 (被動收入)」。
2. **主數字 (Hero Value)**：
   - 顯示：`{currencySymbol} {formatNumber(totalPassiveIncome)}`
   - 美股模式顯示 `$ {formatNumber(totalDividends + totalUSDInterest)}`
   - 台股模式顯示 `NT$ {formatNumber(totalDividends + totalTWDInterest)}`
   - 全部模式顯示 `NT$ {formatNumber(totalDividendsInTWD + totalInterestInTWD)}`
3. **副標題說明**：
   - 顯示「累積已領取現金配息與利息收入」。
4. **獨立膠囊 (Badges / Pills) 呈現層次**：
   在卡片底部以 `flex-wrap` 排列獨立膠囊，彼此分開：
   - **利息收入膠囊 (Cyan / Emerald 風格)**：
     - 樣式：`background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3);`
     - 內容：`💵 {item.name} +{currencySymbol}{formatNumber(item.amount)} {item.currency}`（例如：`💵 活存利息 +$15.20 USD`、`💵 借券利息 +$8.50 USD`）。
   - **減資退款膠囊 (Orange 風格)**：
     - 內容：`減資退款 +{currencySymbol}{formatNumber(totalCapitalReturned)}`
   - **美股預扣稅膠囊 (Rose 風格)**：
     - 內容：`美股預扣 30% -${totalUSDividendTax} USD`
   - **二代健保補充保費膠囊 (Purple 風格)**：
     - 內容：`健保 -NT${totalTWDividendTax}`

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] **AC-1 (美股無槓桿修復)**：在僅有美股現貨持倉、無任何借貸紀錄時，不論現金帳本是否為負餘額，淨槓桿率必須精確顯示為 `1.00x`，徽章顯示 `穩健無槓桿`，嚴禁出現 `99.99x 極度危險`。
- [ ] **AC-2 (市場視圖隔離)**：切換「台股」、「美股」、「全部」時，淨槓桿與被動收入卡片均嚴格對齊該市場的資產、現金與利息收入。
- [ ] **AC-3 (被動收入主金額)**：卡片主數字符合「累計已領股息 + 當前市場各項利息收入」之加總。
- [ ] **AC-4 (各項利息獨立膠囊)**：在卡片下方，各筆不同備註或項目的利息收入分別以個別膠囊獨立呈現，格式清晰、文字與幣別精準，不混雜為單一項目。
- [ ] **AC-5 (既有稅費與減資相容)**：既有美股 30% 預扣稅、二代健保、減資退款膠囊維持正常顯示，色彩層次分明。
- [ ] **AC-6 (測試與型別安全)**：`npm test` 100% 通過（含新增之 TDD 測試），`npm run build` TypeScript 0 錯誤。

---

## 5. 防禦性開發與向後相容評估 (Defensive Development Checklist)

1. **破壞性變更防範**：
   - 既有呼叫 `calculatePortfolioExposure` 的地方若未帶入新欄位，必須維持向下相容預設值。
   - 保留現有 `MarketSummarySlice` 的欄位相容性，不更動既有欄位命名，僅做功能擴充。
2. **極值與邊界防禦**：
   - 利息備註為空白、特殊字元或超長字串時，進行適度截斷（如超過 12 字元時做省略號處理）與 fallback。
   - 若使用者有真實融資貸款（`totalDebt > 0`），其維持率與斷頭壓力測試功能不受任何影響。
