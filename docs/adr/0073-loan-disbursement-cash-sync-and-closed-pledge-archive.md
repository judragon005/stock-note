# ADR-0073: 股票質押借款撥款金流同步、零本金斷頭誤判防禦與已結清歷史歸檔架構

- **狀態**：ACCEPTED
- **日期**：2026-09-03
- **相關 PRD**：[PRD-0073](file:///d:/APP/股票紀錄/docs/specs/0073-loan-disbursement-cash-sync-and-closed-pledge-archive-spec.md)

---

## 背景與問題脈絡 (Context)

在既有架構中，質押借款存在兩大痛點：
1. **借款入帳金流缺失**：建立借款項目時僅有規費扣款選項，未自動產生 `LOAN_DISBURSEMENT` 現金入帳流水；但後續還款時卻有記錄 `LOAN_REPAYMENT` 現金支出，導致可用現金餘額單向虛減。
2. **已結清借貸佔用看板且誤判斷頭**：借款清償歸零後，看板仍以卡片形式展示，且維持率計算引擎在 `principal <= 0` 時計算為 0%，觸發追繳斷頭紅燈警報，並持續顯示設質規費欠款。

---

## 決策內容 (Decisions)

1. **計算引擎零本金防禦**：
   - 在 `calculatePledgeMaintenanceRatio` 中，若 `loan.principal <= 0`，判定為無負債安全狀態（`status: 'SAFE'`、`isMarginCall: false`、`maintenanceRatio: Infinity`），介面顯示為「無負債 (安全)」。
   - 在 `calculateLoanInterestAndPayoff` 中，若 `loan.principal <= 0`，利息與應付規費全數歸零。
2. **自動借貸撥款入帳流水 (`LOAN_DISBURSEMENT`)**：
   - 抽出純函數 `createLoanDisbursementTransaction`，依借貸起日與本金生成標準正數現金流入。
   - `LoanModal` 新增「建立時自動於關聯帳戶記錄借款撥款入帳」勾選框（預設 true）。
3. **進行中與已結清看板分流**：
   - 頂部風控看板僅渲染進行中借貸（`activeLoans: principal > 0`）。若無進行中借貸，展示無負債綠色安全看板。
   - 已結清之借貸自動歸入「📜 歷史借貸與質押已結清紀錄」可折疊面板，完整保留歷史初借額、起日、利率與擔保品明細。
4. **歷史借貸平帳修復機制**：
   - 在 `CashLedgerWorkspace` 中加入缺漏撥款入帳偵測，若發現借貸有還款卻從未有撥款入帳，提供一鍵自動補登平帳功能。

---

## 影響評估與驗證 (Consequences & Verification)

- **優點**：
  - 徹底杜絕現金帳借貸不平的問題。
  - 風控看板聚焦於真實負債風險，消除已結清借貸的噪音與誤判紅燈。
- **驗證**：
  - 45 個測試套件、486 個測試案例全數 100% 通過。
  - TypeScript 編譯 0 錯誤。
