# 01 — 現金流水與多帳戶餘額試算引擎 (Types & Cash Ledger Engine)

**What to build:**
定義現金交易 (`CashTransaction`) 與借貸質押 (`LoanRecord`) 的完整領域模型，並實作 `cashLedgerEngine.ts` 核心試算模組，負責各帳戶餘額、累計出入金、淨投入本金、利息支出及多幣別 (TWD/USD) 匯總計算。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 在 `src/types/stock.ts` 擴充 `CashFlowCategory`、`CashTransaction` 與 `LoanRecord` 型別定義。
- [x] 實作 `calculateAccountBalances(accounts, transactions, fxRate)` 函式，精確統計各券商交割戶餘額與折算台幣總額。
- [x] 實作 `calculateNetInvestedCapital(transactions)` 函式，精確計算外部入金減出金之淨本金。
- [x] 撰寫 `src/engine/cashLedgerEngine.test.ts`，100% 覆蓋所有邊界條件與計算邏輯。
