# Issue 02: 建議買進標的按風益比 (R:R) 優先排序與視覺化

## 狀態與分流

- 狀態：`CLOSED` (已實作 buyItems 按風益比數值由大到小降序排列與高光呈現)
- 負責人：Agent
- 標籤：`ready-for-agent`, `component`, `sorting`, `ux`

## 任務說明

1. 在 `src/components/MuscleBookerWorkspace.tsx` 中：
   - 將 `buyItems` 列表按 `actionDecision.riskRewardRatioValue` 由大到小（降序）排序，讓風益比最佳之標的置頂呈現。
   - 在「🟢 建議買進·主升發動」卡片中，當風益比 $\ge 2.0R$ 時標註高光色彩或金色火焰圖示。
   - 在綜合監控總表中，買進標的之風益比數值清晰可見。
