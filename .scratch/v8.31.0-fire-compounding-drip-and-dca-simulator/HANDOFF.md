# v8.31.0 FIRE 財務自由複利滾雪球與定期定額智慧排程系統 任務索引

- **對應規格書**：[docs/specs/0112-fire-compounding-drip-and-dca-simulator-spec.md](../../docs/specs/0112-fire-compounding-drip-and-dca-simulator-spec.md)
- **對應技術債**：
  - [DEBT-0029](../../docs/debts/0029-drip-compounding-engine-and-cash-flow-growth-forecaster.md) (核心主幹)
  - [DEBT-0021](../../docs/debts/0021-smart-dca-simulator-and-cashflow-scheduler.md) (強相關 1: 累積期)
  - [DEBT-0022](../../docs/debts/0022-monte-carlo-fire-and-safe-withdrawal-simulator.md) (強相關 2: 提領期)

---

## 🎯 細粒度任務票券清單 (Fine-Grained Tickets)

| 票券編號 | 標題 | 負責模組 | 產出與驗收重點 (100% TDD) |
| :---: | :--- | :--- | :--- |
| [**Ticket 01**](issues/01-drip-types-and-dual-track-engine.md) | 定義 FIRE 與複利資料型別，實作 DRIP 雙軌推演演算法核心 | `src/types/firePlanning.ts`<br/>`src/engine/dripCompoundingEngine.ts` | 雙軌市值、稅後股利、股份放大倍數與複利乘數推演 |
| [**Ticket 02**](issues/02-drip-milestones-and-interpolation.md) | 實作 4 階被動收入自由度里程碑與連續線性插值演算法 | `src/engine/dripCompoundingEngine.ts` | 4 階生活費里程碑、小數年份精確插值、提早達成年數 (`yearsSaved`) |
| [**Ticket 03**](issues/03-dca-plan-types-and-holiday-deferral.md) | 實作定期定額 (DCA) 計畫排程與休市順延撮合演算法 | `src/engine/dcaSchedulerEngine.ts` | 整合休市日曆順延至工作日 ($T$ 日)、$T+2$/$T+1$ 交割結算日 |
| [**Ticket 04**](issues/04-dca-cashflow-forecast-and-overdraft-guard.md) | 實作 DCA 未來 30 天現金防透支推演與資金缺口警示 | `src/engine/dcaSchedulerEngine.ts` | 依交割時序推演餘額、違約透支紅燈標記、精確資金缺口計算 |
| [**Ticket 05**](issues/05-dca-vs-lumpsum-backtest-engine.md) | 實作定期定額 vs. 單筆歐印 (Lump-Sum) 機會成本歷史回測 | `src/engine/dcaSchedulerEngine.ts` | 平均持股成本、期末資產差異比率、MDD 與 XIRR 回測 |
| [**Ticket 06**](issues/06-monte-carlo-box-muller-gbm-engine.md) | 純原生 0 依賴實作 Box-Muller 常態亂數與 GBM 隨機路徑生成器 | `src/engine/monteCarloFireEngine.ts` | Box-Muller 變換、漂移/擾動項、1,000 次路徑迭代與破產判定 |
| [**Ticket 07**](issues/07-monte-carlo-strategies-and-swr-bisection.md) | 實作 3 大提領策略演算法與安全提領率 (SWR) 二分法逆運算 | `src/engine/monteCarloFireEngine.ts` | Trinity 4%、Guyton-Klinger 護欄、純股息模式、SWR 逼近與分位數矩陣 |
| [**Ticket 08**](issues/08-fire-planning-svg-charts-components.md) | 開發原生 SVG 雙軌複利對照圖與蒙地卡羅百分位錐形圖 (Fan Chart) | `src/components/fire/` | 原生 SVG 雙軌曲線對照圖、SVG 蒙地卡羅百分位錐形圖、懸停 Tooltips |
| [**Ticket 09**](issues/09-fire-planning-workspace-and-tabs-integration.md) | 開發 FIRE 退休與複利工作台主面板並整合工作台導航 | `src/components/FirePlanningWorkspace.tsx`<br/>`src/components/WorkspaceTabs.tsx` | 頂部 4 大 KPI 看板、3 大子分頁切換、導航掛載與全站風格對齊 |
| [**Ticket 10**](issues/10-full-test-suite-build-and-debt-closing.md) | 全量測試回歸、打包驗收、技術債生命週期標記與 ADR 產出 | 專案全量品質與文檔 | `npm test` 100% 綠燈、`npm run build` 0 錯誤、關閉技術債 `#0029`, `#0021`, `#0022`、產出 ADR |
