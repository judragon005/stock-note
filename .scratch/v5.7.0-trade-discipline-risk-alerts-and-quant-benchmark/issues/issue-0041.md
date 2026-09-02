# 迭代主票券: v5.7.0 交易計畫紀律檢討、盤中風控觸價警示與大盤量化基準對比 (Trade Discipline, Risk Alerts & Quant Benchmark)

- **關聯 PRD**: [docs/specs/0041-trade-discipline-risk-alerts-and-quant-benchmark.md](../../docs/specs/0041-trade-discipline-risk-alerts-and-quant-benchmark.md)
- **版本**: v5.7.0
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **關聯技術債**:
  - [技術債 #0002: 交易計畫與紀律檢討模組](../../docs/debts/0002-trade-plan-and-discipline-review.md) (`RESOLVED`)
  - [技術債 #0016: 移動停損停利風控線設定與觸價警示標籤](../../docs/debts/0016-stop-loss-take-profit-alerts-and-risk-badges.md) (`RESOLVED`)
  - [技術債 #0010: 大盤基準疊圖 (0050/SPY) 與量化績效指標](../../docs/debts/0010-benchmark-comparison-and-quant-metrics.md) (`RESOLVED`)
- **關聯規格**: [PRD #0041](../../docs/specs/0041-trade-discipline-risk-alerts-and-quant-benchmark.md)
- **架構決策記錄**: [ADR #0041](../../docs/adr/0041-trade-discipline-risk-alerts-and-quant-benchmark.md)
- **分流狀態 (Triage Status)**: `ready-for-agent`

---

## 🎯 迭代目標
將本專案由傳統靜態記帳升級為具備「事前計畫 ➔ 盤中風控 ➔ 賽後覆盤 ➔ 客觀量化」的完整主動交易管理閉環系統。

---

## 📋 細粒度原子任務看板 (Granular Task Breakdown Board)

## 子任務拆解清單 (10 張原子票券)
- [x] [01-core-types-and-schema-extension.md](01-core-types-and-schema-extension.md) - 核心資料模型與型別定義擴充 (`RESOLVED`)
- [x] [02-risk-alert-and-distance-engine-tdd.md](02-risk-alert-and-distance-engine-tdd.md) - 停損停利風控判定與距離試算引擎 TDD (`RESOLVED`)
- [x] [03-benchmark-history-and-imputation-tdd.md](03-benchmark-history-and-imputation-tdd.md) - 本地基準大盤歷史數據模組與補值算法 TDD (`RESOLVED`)
- [x] [04-quant-metrics-and-risk-adjusted-engine-tdd.md](04-quant-metrics-and-risk-adjusted-engine-tdd.md) - 量化統計與風險調整指標計算引擎 TDD (`RESOLVED`)
- [x] [05-trade-modal-plan-ui.md](05-trade-modal-plan-ui.md) - 交易輸入彈窗計畫與風控設定面板 (`RESOLVED`)
- [x] [06-holdings-table-risk-badges-ui.md](06-holdings-table-risk-badges-ui.md) - 持股清單風控狀態標籤與距離 Tooltip (`RESOLVED`)
- [x] [07-closed-discipline-review-card-ui.md](07-closed-discipline-review-card-ui.md) - 平倉標的賽後覆盤檢討卡片 (`RESOLVED`)
- [x] [08-discipline-analytics-dashboard-ui.md](08-discipline-analytics-dashboard-ui.md) - 全局紀律執行率與犯錯排行統計儀表板 (`RESOLVED`)
- [x] [09-portfolio-growth-quant-benchmark-chart-ui.md](09-portfolio-growth-quant-benchmark-chart-ui.md) - 淨值成長大盤疊圖與量化指標看板 (`RESOLVED`)
- [x] [10-full-regression-and-debt-docs-sync.md](10-full-regression-and-debt-docs-sync.md) - 全量回歸測試、ADR 歸檔與技術債看板同步更新 (`RESOLVED`)
