# 產品需求文件 (PRD) - 歷史已結清借貸明細成本透視與結清還款日追蹤規格

- **文件編號**：PRD-0074
- **功能名稱**：已結清借貸利息與官方規費明細拆解、借款天數與結清還款日追蹤
- **版本**：v7.5.1
- **狀態**：ready-for-agent

---

## Problem Statement

在先前的已結清歷史紀錄中，使用者仍看到「未還本金: NT$ 0」，且缺乏關鍵的財務與合約生命週期資訊：
1. **缺乏結清還款日與實際借款天數**：使用者只能看到借款起日，無法得知該筆借款於何時全額清償終止，亦無法得知實際借款計息歷時多少天，無法與券商每期對帳單精準對齊。
2. **已付成本黑盒子**：結清借貸最核心的財務資訊是「這筆借貸總共付了多少利息與費用」。目前畫面未呈現已付利息、設質費（設定費）、撥券費與手續費等各項費用明細，使用者無法進行借貸融資效益覆盤。
3. **券商官方名詞未標準化**：各項費用的呈現缺乏與台灣券商（如永豐金、元大、國泰）及美股券商官方一致之標準術語，不易與官方收據與存摺扣款比對。

---

## Solution

1. **生命週期時態補完（結清還款日與借款天數）**：
   - 擴充 `LoanRecord` 支援 `closedDate`（結清還款日 / 終止日）。當使用者執行全額還本或一鍵結清時自動寫入當日日期；若歷史紀錄查無該欄位，自動從關聯流水帳中回推最後還款日。
   - 計算自 `startDate` 至 `closedDate` 之實際借款天數（例如：`借款共 31 天`）。
2. **已付借貸成本結構化透視（利息與三大規費）**：
   - 將「未還本金: NT$ 0」替換為 **「總借貸支出成本」**，並展開四大明細：
     - 💰 **已付利息** (Loan Interest)
     - 🏛️ **已付設質登記費** (Pledge Registry Fee / 設質費)
     - 📄 **已付集保撥券費** (Securities Transfer Fee / 撥券費)
     - 🏷️ **已付開辦手續費** (Processing Fee / 手續費)
3. **標準券商官方術語對齊**：
   - 台股質押借款全面使用台灣證券集保結算所與主要券商之法定名詞；美股融資借貸採用標準 `Margin Interest` 與 `Processing Fee`。
4. **雙軌聚合計算引擎 (`calculateLoanSettledSummary`)**：
   - 純函數設計：優先從現金帳本流水（`transactions`）精準統計實際扣繳利息與規費，若帳本查無流水則以借貸登錄資料與推算利息作為平滑備援。

---

## User Stories

1. As an investor reviewing settled pledge loans, I want to see the exact repayment/payoff date alongside the start date, so that I know precisely when the loan lifecycle ended.
2. As an investor auditing loan expenses, I want to see the total number of borrowing days (from start to payoff), so that I can verify whether the interest charged by the broker matches the calendar days elapsed.
3. As an investor who has fully settled a stock pledge, I want the history card to show "Total Borrowing Cost" instead of a redundant "Outstanding Principal: NT$ 0", so that I immediately understand my all-in financial expense.
4. As a stock pledge user in Taiwan, I want the fees explicitly broken down into official terms ("設質登記費", "集保撥券費", "開辦手續費", "已付借款利息"), so that I can easily reconcile them against Taiwan Depository & Clearing Corporation (TDCC) and broker bank receipts.
5. As a US margin loan user, I want the fees presented with official US broker terminology ("Margin Interest", "Payoff Date"), so that the interface feels natural across dual markets.
6. As a ledger user, I want the system to dynamically aggregate actual cash transactions tagged with the loan ID to display exact paid interest and fee amounts, so that my historical report is backed by real bank transaction records.
7. As a user with historical loans that might lack granular cash transactions, I want the engine to gracefully fall back to the loan's registered fee properties and interest calculation, so that the summary cards never break or show empty values.
8. As an investor managing leverage discipline, I want each fee item displayed as a discrete, color-coded capsule, so that I can scan the breakdown at a glance.
9. As a mobile or desktop user, I want the settled loans list layout to remain responsive and clean when displaying these detailed financial capsules.
10. As a software auditor, I want all calculation and date resolution logic covered by automated unit tests with 100% pass rate.

---

## Implementation Decisions

### 1. 資料模型擴充 (`src/types/stock.ts`)
- 在 `LoanRecord` 中新增選填欄位：
  ```typescript
  closedDate?: string; // 結清還款日 / 借款終止日 (YYYY-MM-DD)
  ```

### 2. 核心計算引擎 (`src/engine/cashLedgerEngine.ts`)
- 實作純函數 `calculateLoanSettledSummary(loan: LoanRecord, transactions: CashTransaction[]): SettledLoanSummary`：
  - **結清還款日解析**：優先使用 `loan.closedDate`，若無則尋找 `relatedLoanId === loan.id` 且為 `LOAN_REPAYMENT` 的最新日期；若仍無則回退至今日或 `loan.startDate`。
  - **天數推算**：`borrowDays = Math.max(1, diffDays(startDate, payoffDate))`。
  - **利息聚合**：加總關聯之 `FINANCING_FEE`；若為 0 則依本金、年利率與天數回推推算利息。
  - **規費聚合**：依備註或類別加總關聯之 `WIRE_FEE`；若無則採用 `loan.transferFee`、`loan.pledgeRegistryFee`、`loan.handlingFee`。
  - **總支出計算**：`totalBorrowingCost = paidInterest + paidTransferFee + paidPledgeRegistryFee + paidHandlingFee`。

### 3. 使用者介面升級 (`src/components/CashLedgerWorkspace.tsx`)
- 在「📜 歷史借貸與質押已結清紀錄」卡片中：
  - 呈現：`借款起日: YYYY-MM-DD · 結清還款日: YYYY-MM-DD (借款共 XX 天)`。
  - 呈現：`初始借款: NT$ 495,000` · `年利率: 4.0%` · `總借貸支出成本: NT$ X,XXX`。
  - 呈現膠囊群組：
    - 💰 **已付利息**: `NT$ X,XXX`
    - 🏛️ **已付設質費**: `NT$ XXX` (設質登記費)
    - 📄 **已付撥券費**: `NT$ XXX` (集保撥券費)
    - 🏷️ **已付手續費**: `NT$ XXX` (開辦手續費)

---

## Testing Decisions

- **測試原則**：TDD 測試驅動，於公開介面縫隙 `calculateLoanSettledSummary` 撰寫完整測試。
- **測試驗證重點**：
  1. 驗證給定具備真實現金帳還款與繳息流水的借貸，能正確解析出最後還款日、借款天數與各項已付費用。
  2. 驗證當缺乏流水時，能自動平滑回退使用借貸本身屬性與日期推算。
  3. 驗證總借貸支出成本等於已付利息與各項規費之總和。

---

## Out of Scope

- 匯出 PDF 格式之官方質押清償證明書。
- 自動從各家券商網銀爬取即時設質費用異動。

---

## Further Notes

- 符合 KISS 原則與金字塔原理，零外部依賴。
