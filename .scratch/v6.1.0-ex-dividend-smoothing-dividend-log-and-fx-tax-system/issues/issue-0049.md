# Epic #0049: 除息應收股息平滑補償、專屬股息日誌日曆視圖與外匯損益拆解/稅階預警系統

- **規格來源**：[PRD #0049](file:///d:/APP/股票紀錄/docs/specs/0049-ex-dividend-smoothing-dividend-log-and-fx-tax-system.md)
- **技術債關聯**：[#0014](file:///d:/APP/股票紀錄/docs/debts/0014-ex-dividend-receivable-smoothing-and-drop-compensation.md), [#0004](file:///d:/APP/股票紀錄/docs/debts/0004-dedicated-dividend-log-view.md), [#0011](file:///d:/APP/股票紀錄/docs/debts/0011-fx-gain-loss-breakdown-and-tax-bracket-alert.md)
- **目標版本**：`v6.1.0`

---

## 🎯 模組任務清單 (Child Tickets)

| Ticket | 標題 | 涉及模組 | 核心技術債 |
| :---: | :--- | :--- | :---: |
| [**#01**](01-receivable-dividend-and-ex-date-smoothing-engine.md) | 應收股利與除息日至發放日平滑補償引擎 (TDD) | `src/engine/receivableDividendEngine.ts`, `src/types/dividend.ts` | **#0014** |
| [**#02**](02-fx-breakdown-and-tax-compliance-engine.md) | 外匯損益獨立拆解與二代健保/海外所得稅階預警引擎 (TDD) | `src/engine/fxBreakdown.ts`, `src/engine/taxComplianceEngine.ts` | **#0011** |
| [**#03**](03-dedicated-dividend-log-workspace-and-analytics-view.md) | 專屬股息日誌活頁籤、月度現金流柱狀圖與股息行事曆視圖 | `src/components/DividendLogView.tsx`, `src/components/WorkspaceTabs.tsx` | **#0004** |
| [**#04**](04-holdings-table-friction-modal-integration-and-regression.md) | 持倉表平滑切換、摩擦中心稅階進度整合與全量回歸測試 | `src/components/HoldingsTable.tsx`, `src/components/FrictionCenterModal.tsx` | 全域整合 |

---

## 🧪 全域驗收條件 (Global Definition of Done)
1. 所有核心演算法 100% 覆蓋單元測試。
2. `npm test` 100% 通過。
3. `npm run build` TypeScript 0 錯誤。
4. 技術債看板與 `CONTEXT.md` 同步更新。
