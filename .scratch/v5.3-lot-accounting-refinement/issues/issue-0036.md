# Issue #0036: 多批次沖銷會計精煉、邊界浮點防禦與無障礙強化 (Lot Accounting Refinement & Edge Case Hardening)

- **狀態**：`RESOLVED`
- **分流標籤**：`ready-for-agent`
- **優先級**：`P1`
- **所屬版本**：`v5.3.1` (或 v5.3 收尾補強)
- **關聯 PRD**：[docs/specs/0036-lot-accounting-refinement-and-edge-case-fixes.md](../../docs/specs/0036-lot-accounting-refinement-and-edge-case-fixes.md)
- **測試策略**：TDD 100% 覆蓋 (紅-綠-重構)

## 子任務 (Subtasks)
- [x] [01-moving-avg-weighted-days-and-residual-deduction.md](01-moving-avg-weighted-days-and-residual-deduction.md) - P1-01 加權平均持股天數與 P1-02 浮點剩餘差額扣除法
- [x] [02-tax-comparison-semantics-and-memoization.md](02-tax-comparison-semantics-and-memoization.md) - P2-01/02 TaxComparison 語義修正與 P2-03 Modal useMemo 效能快取
- [x] [03-tooltip-vanilla-css-and-modal-a11y.md](03-tooltip-vanilla-css-and-modal-a11y.md) - P2-04 Tooltip 原生 Vanilla CSS/A11y 與 Modal Escape/遮罩點擊關閉
- [x] [04-test-coverage-expansion.md](04-test-coverage-expansion.md) - P2-05 跨 Lot 沖銷、手續費分攤、MOVING_AVG 歸因與 TaxOptimizer 測試全量補齊
- [x] [05-adr-and-docs-sync.md](05-adr-and-docs-sync.md) - ADR #0036 建立、CONTEXT.md 與交接手冊同步
