# Issue 01: 引擎層風益比字串格式統一為 R 倍數 (${rrRatio}R)

## 狀態與分流
- 狀態：`CLOSED` (已將 riskRewardRatio 改為 ${rrRatio}R 並更新 Tooltip)
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `format`

## 任務說明
1. 修改 `src/engine/muscleBookerEngine.ts`：
   - 將 `riskRewardRatio` 輸出格式從 ``1 : ${rrRatio}`` 改為 ``${rrRatio}R``。
   - 更新 `BEGINNER_TOOLTIPS.riskReward` 百科字典解說，對齊 R 倍數概念與 2.0R 門檻。
