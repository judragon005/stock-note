# v9.04.0: 資產成長全歷史管線修復、券商隔離與量化複利指標 (Spec 0207)

## 概述

本迭代依據 [`docs/specs/0207-portfolio-nav-pipeline-repair-and-cagr-alignment-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0207-portfolio-nav-pipeline-repair-and-cagr-alignment-spec.md) 與 [`docs/adr/0207-portfolio-nav-pipeline-repair-and-cagr-alignment.md`](file:///d:/APP/股票紀錄/docs/adr/0207-portfolio-nav-pipeline-repair-and-cagr-alignment.md)，徹底修復資產成長全歷史資料管線漏接、券商過濾器失效、無風險利率硬編碼失真，並補齊實戰維度的出入金跳空打點、年化複合成長率 (CAGR) 與歷史最長水下天數。

本需求劃分為 **4 個單一職責、單一上下文視窗可收斂之垂直切片票券**，嚴格落實 TDD 紅-綠-重構循環。

---

## 細粒度票券索引 (Granular Tickets Index)

| 票券編號 | 檔案 | 模組 | 核心職責 | 依賴 | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ticket 01** | [`01-pipeline-gap-and-account-scoping.md`](issues/01-pipeline-gap-and-account-scoping.md) | `App.tsx` | 補通 `receivableDividends` 平滑參數、券商篩選穿透與現金流隔離 | 無 | `DONE` |
| **Ticket 02** | [`02-dynamic-rf-and-cagr-metric.md`](issues/02-dynamic-rf-and-cagr-metric.md) | `quantMetrics.ts`, `PortfolioGrowthChart.tsx` | 動態無風險利率接軌 (USD 4.5% / TWD 1.8%) 與新增 CAGR 複利指標 | 無 | `DONE` |
| **Ticket 03** | [`03-benchmark-async-lakehouse-hydration.md`](issues/03-benchmark-async-lakehouse-hydration.md) | `PortfolioGrowthChart.tsx` | 大盤基準非同步請求本機 SQLite 湖倉日 K 並自適應重繪 | 無 | `DONE` |
| **Ticket 04** | [`04-capital-flow-badges-and-longest-drawdown.md`](issues/04-capital-flow-badges-and-longest-drawdown.md) | `PortfolioGrowthChart.tsx` | Hover Crosshair 出入金事件標籤打點與歷史最長水下天數 | Ticket 01 | `DONE` |
