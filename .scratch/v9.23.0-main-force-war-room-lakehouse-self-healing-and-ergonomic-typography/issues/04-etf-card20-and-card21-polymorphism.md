# 04 — Card 20 & 21 ETF 資產多型合流（規模 AUM、費用率與反推殖利率）

**Parent:** #590 (Spec 0238)
**What to build:** 在 `aiForceDashboardEngine` 與 `MonthlyRevenueCard` / `ValuationMetricsCard` 建立 ETF 資產型態多型合流：打通 ETF 資產規模 (`aumBillion`) 與總費用率 (`etfExpenseRatio`)；當 `tw_valuation_daily` 無 ETF 殖利率時，以近 12 個月（或近 4 季）現金股利總和 ÷ 現價動態推算年化殖利率；解除 `0050` 在 Card 21 的假空狀態並修正 Card 20 無配息紀錄時的誠實空狀態提示。
**Blocked by:** 01 — ETF 全分組淨值入庫解析器修復與實庫補齊, 03 — TDCC 集保 10 週、月營收 12 月與歷史配息按需序列補齊
**Status:** ready-for-agent

- [ ] `0050` 等主流 ETF 在 Card 20 產出非空 `aumBillion`、動態推算之 `dividendYield` 與近四季 `quarterlyDividends`（無配息時顯示誠實提示而非整塊黑底空白）。
- [ ] Card 21 (`valuationMetrics`) 在 ETF 模式下只要 `etfNav`、`etfExpenseRatio` 或 `dividendYield` 任一存在即為 `isEmpty: false`，正確顯示折溢價率、總費用率與年化配息率。
- [ ] 新增 `0050` ETF 雙卡合流單元測試並 100% 通過。
