# Issue #35: 多批次沖銷會計與稅務最佳化沖銷系統 (Lot-based Accounting & Tax-Loss Harvesting)

## 描述
解決目前系統在 `src/engine/calculator.ts` 一律採用「移動加權平均法」所造成的架構限制，為系統建立標準金融級的多模式批次沖銷會計引擎 (`TaxLot` / `LotEngine`)。
支援五大沖銷會計法則（`MOVING_AVERAGE`, `FIFO`, `LIFO`, `HIFO`, `SPECIFIC_LOT`），完整支援公司行動（股票分割、除權配股、現金減資）對在庫批次之等比分攤與成本稀釋，提供長短期資本利得判定與節稅收割 (Tax-Loss Harvesting) 試算。
在 UI/UX 上落實「所有專業名詞繁體中文對齊 + 滑鼠懸停即刻提示 (Tooltip)」之極致友善體驗。

## 相關規格與技術債
- [docs/specs/0035-lot-based-accounting-and-tax-loss-harvesting.md](../../../docs/specs/0035-lot-based-accounting-and-tax-loss-harvesting.md)
- [docs/debts/0008-lot-based-accounting-and-tax-loss-harvesting.md](../../../docs/debts/0008-lot-based-accounting-and-tax-loss-harvesting.md)

## 分流標籤 (Triage Label)
- `ready-for-agent` (規格完備，已完成調研與邊界對齊，可直接由 Agent 獨立執行)

## 優先級與估計 (Priority & Estimate)
- **優先級**：`P1` (源自技術債 #0008)
- **複雜度**：高 (涉及多批次時序隊列、多會計準則排序、公司行動等比分攤、稅務最佳化歸因、UI 抽屜與 Tooltip)
- **測試策略**：TDD 100% 覆蓋 (紅-綠-重構)

## 子任務 (Subtasks)
- [x] [01-types-and-lot-engine-core.md](01-types-and-lot-engine-core.md) - 核心型別與批次沖銷演算法引擎 (FIFO/LIFO/HIFO/Moving Avg)
- [x] [02-corporate-actions-lot-dilution.md](02-corporate-actions-lot-dilution.md) - 公司行動對在庫批次之等比分攤與成本稀釋演算法
- [x] [03-tax-loss-harvesting-and-optimizer.md](03-tax-loss-harvesting-and-optimizer.md) - 稅務最佳化、長短期持有天數判定與節稅對比試算器
- [x] [04-tooltip-and-ui-lots-drawer.md](04-tooltip-and-ui-lots-drawer.md) - 繁中專業名詞懸停 Tooltip、會計模式切換器與批次抽屜 UI
- [x] [05-adr-and-domain-docs-sync.md](05-adr-and-domain-docs-sync.md) - 領域文檔同步、ADR #0035 建立與技術債看板結案
