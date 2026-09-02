# 原子票券 #02: 各項利息收入聚合 Helper 與單元測試

- **父層主票券**: [issue-0045.md](issue-0045.md)
- **狀態**: `RESOLVED`
- **分流狀態 (Triage Status)**: `ready-for-agent`
- **負責目標**: `src/engine/cashLedgerEngine.ts`, `src/engine/cashLedgerEngine.test.ts`


---

## 🎯 任務內容與驗收縫隙 (Test Seam)

1. **資料結構與聚合邏輯**：
   - 在 `src/engine/cashLedgerEngine.ts` 中新增 `aggregateInterestIncomeDetails(transactions: CashTransaction[], market: MarketType | 'ALL', fxRate: number)` 函式。
   - 篩選條件：`category === 'INTEREST_INCOME' || type === 'INTEREST'` 且為已交割/生效之紀錄。
   - 市場過濾：
     - `market === 'US'`：僅保留 `currency === 'USD'`
     - `market === 'TW'`：僅保留 `currency === 'TWD'`
     - `market === 'ALL'`：包含全部幣別，金額折算 TWD。
   - 分組鍵：以 `tx.note?.trim() || '利息收入'` 與 `currency` 為單位聚合。
   - 回傳 `InterestIncomeItem[]` 清單與 `totalInterestAmount` / `totalInterestInTWD`。
2. **單元測試 (TDD)**：
   - 測試多筆利息（如「嘉信活存利息」、「借券收益」、無備註利息）在 US / TW / ALL 模式下的正確聚合與過濾。
