# 迭代主票券: v5.7.1 成長圖表佈局重構——當日異動事件置頂常駐與量化指標混合智能常駐

- **關聯 PRD**: [docs/specs/0042-quant-dashboard-and-events-permanent-layout.md](../../docs/specs/0042-quant-dashboard-and-events-permanent-layout.md)
- **架構決策記錄**: [docs/adr/0042-permanent-quant-dashboard-and-event-layout.md](../../docs/adr/0042-permanent-quant-dashboard-and-event-layout.md)
- **版本**: v5.7.1
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **分流狀態 (Triage Status)**: `ready-for-agent`

---

## 🎯 迭代目標

1. **區塊排序互換**：折線圖下方依序排列「📅 當日異動事件」與「🏆 機構級量化風控看板」。
2. **當日異動事件常駐**：預設取最新一日、Hover 即時切換，有事件顯示標籤，無事件顯示「無」，徹底消除 Layout Shift。
3. **量化指標看板常駐與混合智能模式**：
   - 無基準時：Alpha / Beta 顯示「無對應」，Sharpe Ratio / 自身 MDD / 波動度實時計算自身表現。
   - 有基準時：5 大指標全量聯動對照。

---

## 📋 細粒度原子任務看板 (Granular Task Breakdown Board)

| 票券編號 | 任務名稱 | 預估工時 | 目標檔案與交付重點 | 狀態 |
| :---: | :--- | :---: | :--- | :---: |
| [**#01**](01-quant-metrics-standalone-calculation-tdd.md) | 量化指標引擎支援純自身數列計算 TDD | 0.5h | `src/engine/quantMetrics.ts` & `test.ts` (無基準時計算自身 Sharpe, MDD, Volatility) | `RESOLVED` |
| [**#02**](02-portfolio-growth-chart-permanent-layout-ui.md) | 成長圖表區塊互換、事件常駐與量化看板混合智能 UI | 0.8h | `src/components/PortfolioGrowthChart.tsx` (佈局置頂互換、無事件「無」標籤、無基準「無對應」) | `RESOLVED` |
| [**#03**](03-full-regression-and-adr-sync.md) | 全量回歸測試與 ADR 架構決策同步 | 0.3h | `npm test`, `npm run build`, `docs/adr/0042-*.md` | `RESOLVED` |

---

## 子任務拆解清單 (3 張原子票券)
- [x] [01-quant-metrics-standalone-calculation-tdd.md](01-quant-metrics-standalone-calculation-tdd.md) - 量化指標引擎支援純自身數列計算 TDD (`RESOLVED`)
- [x] [02-portfolio-growth-chart-permanent-layout-ui.md](02-portfolio-growth-chart-permanent-layout-ui.md) - 成長圖表區塊互換、事件常駐與量化看板混合智能 UI (`RESOLVED`)
- [x] [03-full-regression-and-adr-sync.md](03-full-regression-and-adr-sync.md) - 全量回歸測試與 ADR 架構決策同步 (`RESOLVED`)
