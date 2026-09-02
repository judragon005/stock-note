# 迭代主票券: v5.7.2 機構級量化風控指標卡片懸浮雙層診斷與即時解讀系統

- **關聯 PRD**: [docs/specs/0043-quant-metrics-interactive-diagnosis-and-tooltips.md](../../docs/specs/0043-quant-metrics-interactive-diagnosis-and-tooltips.md)
- **版本**: v5.7.2
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **分流狀態 (Triage Status)**: `ready-for-agent`

---

## 🎯 迭代目標

1. **量化指標動態診斷引擎**：在 `src/engine/quantMetrics.ts` 中新增 `getQuantMetricDiagnosis()`，依據當前 5 大指標（Alpha, Beta, Sharpe, MDD, Volatility）數值與大盤基準狀態，產出對應之健康度評級 Badge、專業機構診斷語句與操作策略建議。
2. **雙層懸浮 Tooltip 互動設計**：在 `PortfolioGrowthChart.tsx` 實現 Hover/Tap 浮現的雙層 Tooltip（上層：指標原理/公式/基準；下層：當前數值動態診斷與策略建議），具備智慧防邊界溢出 (Auto-placement)。
3. **無損回歸與 TDD 驗證**：撰寫完整的臨界值單元測試，確保 `npm test` 100% 通過與 `npm run build` 0 錯誤。

---

## 📋 細粒度原子任務看板 (Granular Task Breakdown Board)

| 票券編號 | 任務名稱 | 預估工時 | 目標檔案與交付重點 | 狀態 | 分流標籤 |
| :---: | :--- | :---: | :--- | :---: | :---: |
| [**#01**](01-quant-metrics-diagnosis-engine-tdd.md) | 量化指標動態診斷引擎與型別 TDD | 0.5h | `src/types/stock.ts`, `src/engine/quantMetrics.ts` & `test.ts` (動態評級、診斷與建議矩陣) | `RESOLVED` | `ready-for-agent` |
| [**#02**](02-portfolio-growth-chart-interactive-tooltip-ui.md) | 成長圖表量化卡片雙層 Tooltip UI 與防溢出互動 | 0.8h | `src/components/PortfolioGrowthChart.tsx` (Hover/Tap 雙層 Tooltip、Glassmorphism 風格、防邊界溢出) | `RESOLVED` | `ready-for-agent` |
| [**#03**](03-full-regression-and-adr-sync.md) | 全量回歸測試、ADR 架構決策與領域文檔同步 | 0.3h | `npm test`, `npm run build`, `docs/adr/0043-*.md` | `RESOLVED` | `ready-for-agent` |

---

## 子任務拆解清單 (3 張原子票券)
- [x] [01-quant-metrics-diagnosis-engine-tdd.md](01-quant-metrics-diagnosis-engine-tdd.md) - 量化指標動態診斷引擎與型別 TDD (`RESOLVED`)
- [x] [02-portfolio-growth-chart-interactive-tooltip-ui.md](02-portfolio-growth-chart-interactive-tooltip-ui.md) - 成長圖表量化卡片雙層 Tooltip UI 與防溢出互動 (`RESOLVED`)
- [x] [03-full-regression-and-adr-sync.md](03-full-regression-and-adr-sync.md) - 全量回歸測試、ADR 架構決策與領域文檔同步 (`RESOLVED`)

