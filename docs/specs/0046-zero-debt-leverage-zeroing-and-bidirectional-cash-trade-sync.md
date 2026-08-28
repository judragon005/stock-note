# PRD #0046: 零負債槓桿歸零、利息膠囊券商帳戶聚合與預扣稅分離、流水帳股息雙向同步全域連動規格書 (Zero-Debt Leverage Zeroing, Broker Interest Aggregation & Bidirectional Cash-Trade Sync)

- **版本**：v5.8.0
- **狀態**：`PROPOSED`
- **日期**：2026-08-28
- **關聯 PRD**：
  - [PRD #0023: 現金流帳本與多幣別借貸槓桿管理系統](0023-cash-ledger-and-loan-leverage-system.md)
  - [PRD #0037: 整戶總曝險與淨槓桿率 (Net Leverage) 計算引擎與極端斷頭壓力測試](0037-portfolio-leverage-exposure-and-margin-stress-testing.md)
  - [PRD #0045: 淨槓桿零負債現貨保護機制與被動收入各項利息獨立膠囊展示規格書](0045-risk-leverage-zero-debt-fix-and-passive-income-badges.md)
- **目標檔案**：
  - `src/engine/riskExposureEngine.ts` (無借貸零負債時淨槓桿率一律歸零 `0.00x`，符合現貨投資人直覺)
  - `src/engine/riskExposureEngine.test.ts` (測試驗證無借貸時淨槓桿為 0.00x，有借貸時精確計算)
  - `src/engine/cashLedgerEngine.ts` (利息依券商帳戶/幣別聚合為單一膠囊；分離利息預扣稅統計)
  - `src/engine/cashLedgerEngine.test.ts` (利息聚合與稅額分拆單元測試)
  - `src/components/SummaryCards.tsx` (被動收益卡片：合併利息膠囊、分離「美股股息預扣」與「現金利息預扣」)
  - `src/components/CashLedgerWorkspace.tsx` (現金流水帳編輯彈窗：支援編輯自動連動之股息紀錄)
  - `src/components/CashTransactionModal.tsx` (支援編輯股息實收金額與稅額，並支援雙向連動回寫 Trade)
  - `src/App.tsx` (處理流水帳編輯時之 Trade 雙向同步回寫與全域 state 重算)

---

## 1. 概述與問題背景 (Executive Summary & Problem Statement)

在 PRD #0045 落地後，針對實際現貨投資者之使用反饋，存在三大核心體驗問題需要精準修正與完善：

### 1.1 現行三大痛點

1. **零借貸無融資時，淨槓桿顯示 `0.97x` 造成嚴重誤解**：
   - 投資者持有現貨股票（例如 $12,980 USD）與部分閒置現金（例如 $224.79 USD），完全未進行任何質押借款。
   - 系統依公式 $(12,980 - 224.79) / 13,204.79$ 算出 `0.97x`。現貨投資人看到 `0.97x` 會誤以為自己開了 0.97 倍借貸槓桿。
   - **改善目標**：在零借貸（無融資、無質押負債）時，淨槓桿率一律顯示為 **`0.00x`**（標籤保持「穩健無槓桿」），只有在存在實質借貸負債時才計算槓桿比率。

2. **被動收益卡片利息膠囊因月份備註過度分裂，且預扣稅未區分來源**：
   - 每次利息入帳若備註包含日期區間（例如 `9/29-10/29`、`8/29-9/28`），舊聚合邏輯將每筆視為獨立項目，導致卡片底部塞滿 4~5 個長條膠囊。
   - 預扣稅膠囊僅顯示 `美股預扣 30%`，利息預扣稅混雜其中或未被明確呈現。
   - **改善目標**：
     - 現金利息依「券商帳戶名稱 + 幣別」聚合為單一簡潔膠囊（例如 `💵 嘉信理財-現金利息 +$1.00 USD`）。
     - 預扣稅明確拆分為兩顆獨立膠囊：`美股股息預扣 -$26.16 USD` 與 `現金利息預扣 -$0.04 USD`（若有）。

3. **美股現金流水帳「股息入帳」金額與實際券商交割不符時無法修改與全域連動**：
   - 自動連動之股息紀錄（`tx-auto-*`）若因零碎股或調整項與券商實際交割不符，使用者在流水帳中無法直接修改；即便修改若無回寫 Trade，下一次同步或計算損益會脫鉤。
   - **改善目標**：在現金流水帳點擊 ✏️ 編輯股息項目時，支援修改實收金額與稅額，並**自動雙向回寫**至對應的 `Trade` 原始紀錄，自動觸發 React 全域資料流即時重算總淨值 (NAV)、現金水位與未實現損益。

---

## 2. 核心架構與計算模型 (Architecture & Calculation Engine)

### 2.1 零負債槓桿歸零引擎 (`src/engine/riskExposureEngine.ts`)

```typescript
// 槓桿計算核心調整：
if (isZeroDebt) {
  // 零借貸負債：無論現金大於或小於 0，淨槓桿率與總槓桿率一律歸零 (0.00x)
  // 淨資產 NAV 依實況計算 (現金 <= 0 時視為足額現貨持有)
  if (totalAvailableCashTWD <= 0) {
    effectiveNavTWD = totalStockValueTWD;
  } else {
    effectiveNavTWD = totalStockValueTWD + totalAvailableCashTWD;
  }
  grossLeverage = 0;
  netLeverage = 0;
} else {
  // 存在實質借款負債時，正常計算金融槓桿
  grossLeverage = effectiveNavTWD > 0 ? totalStockValueTWD / effectiveNavTWD : 99.99;
  const netDebt = Math.max(0, totalDebtTWD - totalAvailableCashTWD);
  const netExposure = totalStockValueTWD + netDebt;
  netLeverage = effectiveNavTWD > 0 ? Math.max(0, netExposure / effectiveNavTWD) : 99.99;
}
```

### 2.2 利息依券商帳戶聚合與預扣稅拆分引擎 (`src/engine/cashLedgerEngine.ts`)

1. **券商帳戶利息聚合 (`aggregateInterestIncomeDetails`)**：
   - 輸入包含 `accounts: BrokerAccount[]` 映射。
   - 提取項目名稱前綴或帳戶名稱（例如將 `Schwab 嘉信理財-現金利息 (9/29-10/29)...` 歸一化為 `嘉信理財-現金利息` 或依 `accountId` 分組）。
   - 同一券商帳戶之多筆利息合併為一筆累計總額。

2. **預扣稅分離匯總 (`aggregateWithholdingTaxDetails`)**：
   - 股息預扣稅 (`totalStockDividendTaxUSD` / `totalStockDividendTaxTWD`)：來自 `trades` 記錄之股息稅費。
   - 利息預扣稅 (`totalInterestTaxUSD` / `totalInterestTaxTWD`)：來自 `cashTransactions` 中類別為 `TAX` 且備註為利息預扣之紀錄。

### 2.3 現金流水帳 ➔ Trade 雙向同步機制 (`CashTransactionModal.tsx` & `App.tsx`)

1. 當使用者在流水帳列表點擊 `tx-auto-${tradeId}` 進行編輯時：
   - 彈出編輯視窗，顯示原始股息資訊、實收金額、預扣稅額、所屬券商帳戶。
   - 使用者調整金額或稅額後點擊「確認儲存」。
2. `App.tsx` 接收 `onUpdateCashTransaction(updatedTx)`：
   - 若該流水包含 `relatedTradeId`，同步在 `trades` 中尋找對應的 Trade 物件，更新其 `totalAmount = updatedTx.amount`，並同步更新 `cashTransactions`。
   - 觸發 state 更新 ➔ React 自動重算 `holdings`、`cashBalances`、`summaryCards`、`exposureMetrics`，達成 100% 全域連動！

---

## 3. 驗收標準 (Acceptance Criteria)

### 3.1 淨槓桿率
- [ ] **AC 1.1**：在無任何借貸/質押負債的情境下，頂部資訊卡的淨槓桿率固定顯示為 `0.00x`，徽章顯示「穩健無槓桿 (≤1.0x)」。
- [ ] **AC 1.2**：當新增質押或融資負債時，淨槓桿率依金融公式精確計算並動態更新。

### 3.2 被動收益卡片與利息膠囊
- [ ] **AC 2.1**：同一券商的多筆現金利息記錄合併為單一膠囊，不再按月份拆分成多筆。
- [ ] **AC 2.2**：卡片底部清晰區分「美股股息預扣」與「現金利息預扣」膠囊，數據精確無誤。

### 3.3 流水帳股息手動修改與全域連動
- [ ] **AC 3.1**：點擊自動連動之股息流水帳 ✏️ 編輯按鈕，能成功修改金額與備註並儲存。
- [ ] **AC 3.2**：儲存後，對應的 `Trade` 紀錄同步更新，總淨值 NAV、現金水位、被動收益卡片主數字即時重算連動。
- [ ] **AC 3.3**：重新整理頁面後，修改後之數據能由 LocalStorage 正確載入，不被自動連動覆蓋。
- [ ] **AC 3.4**：全專案單元測試 `npm test` 100% 通過，TypeScript 編譯 0 錯誤。
