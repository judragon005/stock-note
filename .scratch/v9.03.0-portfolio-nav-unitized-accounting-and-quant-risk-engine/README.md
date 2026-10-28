# v9.03.0: 資產成長與單位淨值會計及量化風控引擎重構 (Spec 0206)

## 概述

本迭代依據 [`docs/specs/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine-spec.md) 與 [`docs/adr/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine.md`](file:///d:/APP/股票紀錄/docs/adr/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine.md)，徹底解決現行資產成長模組之金融工程失真、出入金污染、大盤斷頭假數字與實戰水下回撤工具缺失。

重構嚴格劃分為 **11 個單一職責、單一上下文視窗可收斂之細粒度票券**，確保 TDD 紅-綠-重構循環嚴謹落實。

---

## 細粒度票券索引 (Granular Tickets Index)

| 票券編號 | 檔案 | 模組 | 核心職責 | 依賴 | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ticket 01** | [`01-quant-calendar-days-and-sortino-ratio.md`](issues/01-quant-calendar-days-and-sortino-ratio.md) | `quantMetrics.ts` | 時間除數校準 (`days/365.25`)、下行波動度與 Sortino 比率純函式 | 無 | `DONE` |
| **Ticket 02** | [`02-unit-nav-state-machine-and-capital-flow-decoupling.md`](issues/02-unit-nav-state-machine-and-capital-flow-decoupling.md) | `historicalNav.ts` | 單位淨值法 (Unit NAV / TWR) 狀態機，隔離外部出入金干擾 | 無 | `ready-for-agent` |
| **Ticket 03** | [`03-receivable-dividends-ex-dividend-smoothing.md`](issues/03-receivable-dividends-ex-dividend-smoothing.md) | `historicalNav.ts` | 應收股利 (`receivableDividends`) 平滑補償，撫平除息旺季假跳水 | Ticket 02 | `ready-for-agent` |
| **Ticket 04** | [`04-margin-interest-deduction-and-ath-drawdown-series.md`](issues/04-margin-interest-deduction-and-ath-drawdown-series.md) | `historicalNav.ts` | 融資賣出利息精確扣除，快照新增 `underwaterDrawdownPercent` 數列 | Ticket 02 | `ready-for-agent` |
| **Ticket 05** | [`05-lakehouse-sqlite-benchmark-api-and-cache.md`](issues/05-lakehouse-sqlite-benchmark-api-and-cache.md) | `benchmarkData.ts` | 大盤基準直連本機 SQLite 湖倉 API (`/api/market/history/`) 與記憶體快取 | 無 | `ready-for-agent` |
| **Ticket 06** | [`06-purge-fake-spy-constants-and-dynamic-rf.md`](issues/06-purge-fake-spy-constants-and-dynamic-rf.md) | `benchmarkConstants.ts` | 清除捏造 SPY 常數，補全 0050/TAIEX 斷頭，依計價幣別注入動態無風險利率 | Ticket 05 | `ready-for-agent` |
| **Ticket 07** | [`07-dual-mode-aum-and-normalized-unit-nav-chart.md`](issues/07-dual-mode-aum-and-normalized-unit-nav-chart.md) | `PortfolioGrowthChart.tsx` | 走勢圖 AUM 金額與 Unit NAV % (起點 100 歸一化) 雙模切換視圖 | Ticket 01, 02, 06 | `ready-for-agent` |
| **Ticket 08** | [`08-negative-nav-canvas-defense-and-bankruptcy-line.md`](issues/08-negative-nav-canvas-defense-and-bankruptcy-line.md) | `PortfolioGrowthChart.tsx` | 移除 `Math.max(0, ...)` 負淨值截斷，繪製破產警示紅線與穿倉座標防禦 | Ticket 07 | `ready-for-agent` |
| **Ticket 09** | [`09-native-svg-underwater-drawdown-chart.md`](issues/09-native-svg-underwater-drawdown-chart.md) | `PortfolioGrowthChart.tsx` | 原生向量 SVG 實戰水下回撤圖、最大回撤點與落水修復天數指標 | Ticket 04, 07 | `ready-for-agent` |
| **Ticket 10** | [`10-quant-dashboard-sortino-and-current-drawdown.md`](issues/10-quant-dashboard-sortino-and-current-drawdown.md) | `PortfolioGrowthChart.tsx` | 看板新增索提諾比率 (Sortino) 與當前距 ATH 水下深度 (Current Drawdown) | Ticket 01, 04, 07 | `ready-for-agent` |
| **Ticket 11** | [`11-xirr-cashflow-relocation-account-filter-incognito-mask.md`](issues/11-xirr-cashflow-relocation-account-filter-incognito-mask.md) | `PortfolioGrowthChart.tsx` | 透視金流移至本金卡片並連動週期、打通券商篩選器連動、一鍵隱私遮罩 | Ticket 07, 10 | `ready-for-agent` |
