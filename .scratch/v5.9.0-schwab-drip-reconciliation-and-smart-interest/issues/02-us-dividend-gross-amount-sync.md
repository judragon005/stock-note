# 任務票券 02：美股股息流水統一毛額入帳與券商 DOI/JRN 雙筆記帳架構

- **狀態**：✅ DONE
- **優先級**：P0
- **關聯 PRD**：[PRD #0047](../../../docs/specs/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend-spec.md)
- **關聯 ADR**：[ADR 0047](../../../docs/adr/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend.md)

## 任務背景與描述
將美股股息自動連動流水金額從「扣稅後淨額」改為「稅前毛額（Gross）」，以完美還原券商 DOI（毛額）+ JRN（預扣稅）的雙筆對帳模式，徹底消除重複扣稅問題。

## 驗收條件 (Acceptance Criteria)
1. `syncTradesWithCashTransactions` 美股 `DIVIDEND` 流水金額為 `trade.shares * trade.price`。
2. 2026-06-23 股息入帳顯示 `+$45.09`，2026-03-24 股息入帳顯示 `+$26.18`。
3. 單元測試通過美股毛額入帳驗證。
