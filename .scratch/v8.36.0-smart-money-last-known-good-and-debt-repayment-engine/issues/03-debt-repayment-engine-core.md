# 03 — 金融級「費用➔利息➔本金」法定清償核心演算法 (Debt Repayment Engine Core)

**What to build:**
於 `src/engine/cashLedgerEngine.ts` 實作金融清償核心純函數 `applyDebtRepayment`。嚴格遵照臺灣《民法》第 323 條與美股保證金融資結算規範，落實法定清償順序：
1. 第一順位（規費）：優先抵扣借貸合約中尚未結清之設質三大規費（如集保解質撥券費、設質登記費等）。
2. 第二順位（利息）：沖銷借款期間所產生之應計利息。
3. 第三順位（本金）：剩餘金額沖償未還借款本金。
4. 繳息日保護法則：僅當還款金額「足額結清當期利息」時，方允許推進 `lastInterestPaymentDate = repaymentDate`；若使用者指定純還本金或利息未結清，嚴禁篡改繳息日，徹底根除前段利息蒸發 Bug。美股市場（USD）預設零規費並依「利息 ➔ 本金」沖償。

**Blocked by:** None — can start immediately

**Status:** complete

- [x] 定義 `DebtRepaymentInput` 與 `DebtRepaymentResult` 介面
- [x] 實作純函數 `applyDebtRepayment`，嚴格執行三段式沖償計算（費用 ➔ 利息 ➔ 本金）
- [x] 實作規費與本金之剩餘更新，並依利息清償狀態決定是否推進 `lastInterestPaymentDate`
- [x] 適配美股（USD）零規費與日計息清償邏輯
- [x] 於 `src/engine/cashLedgerEngine.test.ts` 新增測試驗證：還款 1,012,120 精準拆分（規費 60 + 利息 224 + 本金 1,011,836）、純還本不推進繳息日、以及利息與剩餘本金次日計息之正確性
