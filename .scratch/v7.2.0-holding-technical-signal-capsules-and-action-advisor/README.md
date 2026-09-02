# v7.2.0: 持股技術指標警示膠囊與智慧操作建議引擎 (Holding Technical Signal Capsules & Action Advisor)

本版本專案旨在為使用者持股清單導入券商級「技術與籌碼多維警示膠囊（Badges/Pills）」與「智慧操作建議引擎（Action Directive Advisor）」，實現純前端離線量化運算、多色視覺分層與紀律性操作方針。

## 關聯文檔
- **規格說明書**：[docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md](../../docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md)
- **架構決策紀錄**：[docs/adr/0067-holding-technical-signal-capsules-and-action-advisor.md](../../docs/adr/0067-holding-technical-signal-capsules-and-action-advisor.md)

---

## 任務清單 (Issue Tickets)

| 編號 | 任務標題 | 優先級 | 狀態 | 核心模組 |
| :--- | :--- | :--- | :--- | :--- |
| **01** | [型別定義與純前端技術指標運算引擎](issues/01-types-and-technical-indicator-engine.md) | `P1` | `COMPLETED` | `src/engine/technicalIndicatorEngine.ts` |
| **02** | [持股操作建議專家矩陣與建議文字生成引擎](issues/02-holding-advisor-directive-engine.md) | `P1` | `COMPLETED` | `src/engine/holdingAdvisorEngine.ts` |
| **03** | [多維色彩膠囊標籤與互動 Tooltip 元件](issues/03-holding-signal-capsules-ui-component.md) | `P1` | `COMPLETED` | `src/components/common/HoldingSignalCapsules.tsx` |
| **04** | [持股清單整合、歷史行情資料流串接與端到端驗收](issues/04-holdings-table-integration-and-e2e.md) | `P1` | `COMPLETED` | `src/components/HoldingsTable.tsx` |

---

## 執行流程指引

1. 依照紅-綠-重構 (Red-Green-Refactor) 循環，依序執行 Issue 01 $\rightarrow$ Issue 02 $\rightarrow$ Issue 03 $\rightarrow$ Issue 04。
2. 每次完成子任務時，確保本地 `npm test` 綠燈與 `npm run build` 0 錯誤。
