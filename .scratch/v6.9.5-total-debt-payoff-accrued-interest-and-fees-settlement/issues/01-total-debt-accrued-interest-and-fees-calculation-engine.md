# 01 — 全域借款負債公式升級 (納入應計利息與規費) 與全域 NAV 引擎對齊

**What to build:** 
升級 `cashLedgerEngine.ts` 與 `riskExposureEngine.ts` 的總負債與淨資產 (NAV) 計算邏輯：
1. **負債口徑升級為本利和加規費**：在 `calculateOverallLeverageMetrics` 與 `calculatePortfolioExposure` 中，每筆借款之負債金額統一以 `principal + accruedInterest + pledgeFees`（本金 + 應計未付利息 + 設質三大規費）計算折合台幣總額。
2. **全域 NAV 看板與槓桿率對齊**：確保全域淨資產 $\text{NAV} = \text{總持股市值} + \text{可用現金(含在途)} - \text{總借款負債}$ 精確扣除利息與規費，且維持零負債保護與資不抵債之極值保護。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] 在 `cashLedgerEngine.ts` 中重構 `calculateOverallLeverageMetrics` 整合 `calculateLoanInterestAndPayoff`
- [x] 在 `riskExposureEngine.ts` 中更新 `calculatePortfolioExposure` 計算總借款負債邏輯
- [x] 驗證跨幣別（USD / TWD）借款之本利和匯率折算正確性
