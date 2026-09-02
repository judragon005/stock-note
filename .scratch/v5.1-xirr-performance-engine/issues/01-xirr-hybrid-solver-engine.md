# Ticket 01: XIRR 混合數值求解核心引擎 (Hybrid Newton-Raphson & Bisection Solver)

## 需求說明
- 建立 `src/engine/xirrCalculator.ts`，定義 `CashFlowEvent` 與 `XirrResult` 介面。
- 實作淨現值公式 $\text{NPV}(r) = \sum_{i=0}^N \frac{C_i}{(1+r)^{\frac{d_i - d_0}{365}}} = 0$ 及其一階導數 $\text{NPV}'(r)$。
- 實作 Newton-Raphson 迭代求解器（上限 50 次，殘差 $\le 10^{-7}$）。
- 實作 Bisection 二分逼近法降級防禦（遇導數趨近於 0、震盪、極端邊界 $r \le -0.999$ 時無縫切換至 `[-0.9999, 10.0]`）。
- 實作「30 天智能自適應門檻」：持有週期 $< 30$ 天時，不執行年化次方放大，直接回傳累積絕對報酬率並標記 `isAnnualized = false`。
- 撰寫 `src/engine/xirrCalculator.test.ts` 達成 100% 測試覆蓋（包含對標 Excel/Google Sheets XIRR 測試、極端虧損、斷頭、密集出入金與短週期案例）。

**Status:** todo

- [ ] 定義 `CashFlowEvent`、`XirrResult` 型別。
- [ ] 實作 Newton-Raphson + Bisection 混合求解器與 30 天防護邏輯。
- [ ] 完成 `src/engine/xirrCalculator.test.ts` 100% 單元測試覆蓋。
