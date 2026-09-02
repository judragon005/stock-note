# Issue #34: 交易員盤中當日損益 (Today's PnL) 與精確損益平衡保本價 (Breakeven Price) 體系

## 描述
解決投資人盤中看盤缺乏動態盈虧總金額，以及賣出出場時無法精確掌握計入證交稅、券商折讓與低消後的「真實損益平衡保本價」之痛點。擴充會計引擎提供精確保本價求解器與跨市場今日損益彙總，並於首頁頂部總覽與持股清單中呈現專業交易員級別的損益看板。同步修復現金減資超額退款轉列已實現利得與碎股浮點數精度。

## 相關規格
- [docs/specs/0034-todays-pnl-and-breakeven-price-metrics.md](../../../docs/specs/0034-todays-pnl-and-breakeven-price-metrics.md)
- [docs/debts/0015-trader-today-pnl-and-breakeven-price-metrics.md](../../../docs/debts/0015-trader-today-pnl-and-breakeven-price-metrics.md)
- [docs/debts/0013-capital-reduction-excess-cash-accounting-and-precision.md](../../../docs/debts/0013-capital-reduction-excess-cash-accounting-and-precision.md)

## 分流標籤 (Triage Label)
- `ready-for-agent` (規格完備，已完成調研與邊界對齊，可直接由 Agent 獨立執行)

## 優先級與估計 (Priority & Estimate)
- **優先級**：`P1` (源自技術債 #0015 & #0013)
- **複雜度**：中等 (涉及交易員量化逆推、離散整數驗證、會計引擎擴充與 UI 強化)
- **測試策略**：TDD 100% 覆蓋 (紅-綠-重構)

## 子任務
- [x] 01-breakeven-price-and-precision-engine
- [x] 02-today-pnl-metrics-aggregation
- [x] 03-summary-cards-today-pnl-ui
- [x] 04-holdings-table-trader-metrics-ui
- [x] 05-adr-and-domain-docs-sync
