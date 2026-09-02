# 04 — 股票質押借款與即時擔保維持率風控引擎 (Loan & Pledge Collateral Engine)

**What to build:**
實作股票質押借款、融資借款、信貸等借貸管理與風控計算引擎。支援借款撥款、還本、利息扣繳，並依據最新股票市價即時試算各筆質押擔保維持率、安全/警戒/追繳燈號與整體 LTV 負債比。

**Blocked by:** 01 — 現金流水與多帳戶餘額試算引擎 (Types & Cash Ledger Engine)

**Status:** ready-for-agent

- [x] 實作 `calculatePledgeMaintenanceRatio(loan, currentPrices)` 函式，計算質押維持率。
- [x] 實作 `calculateOverallLeverageMetrics(loans, holdings, cashBalances, fxRate)` 函式，計算整體淨負債比 (LTV) 與年化利息支出預估。
- [x] 支援借款撥款入帳 (`LOAN_DISBURSEMENT`) 與還本扣款 (`LOAN_REPAYMENT`) 連動現金流水。
- [x] 撰寫完整的單元測試覆蓋多檔質押標的、部分還款與價格波動下的維持率計算。
