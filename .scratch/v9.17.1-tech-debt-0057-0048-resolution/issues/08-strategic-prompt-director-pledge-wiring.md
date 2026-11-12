# 08 — 智策適配器董監質押比率安全讀取與事實清單注入

**What to build:** 在 `src/engine/aiForcePromptAdapter.ts` 補齊董監質押比率安全讀取邏輯（從健康評估或報表元數據提取），使 AI 智策事實清單中的基本面指標更完整。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 在 `aiForcePromptAdapter.ts` 內，從 `report.directorPledge`、`report.healthDiagnosis` 或關聯數據源提取董監質押比率
- [x] 若無資料則安全維持 `undefined`，遵循 Zero-Mock 原則
- [x] 注入 `fundamental.directorPledgeRatioPct`，格式化為精確數值

