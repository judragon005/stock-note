# Issue 02: 今日買進先鋒卡片目標價補齊與風益比格式修復

## 狀態與分流

- 狀態：`CLOSED` (已補齊目標價並修復風益比格式)
- 負責人：Agent
- 標籤：`ready-for-agent`, `ui`, `format`

## 任務說明

1. 修改 `src/components/MuscleBookerWorkspace.tsx` 中的「今日買進先鋒 (Top 3 BUY)」卡片：
   - 補齊目標價渲染：展示 `目標: {currency} {item.actionDecision.targetPrice}`。
   - 修復風益比重複 `1:` 格式：統一輸出 `🔥 風益比: 1 : {rrValue}R` 或使用 `item.actionDecision.riskRewardRatio`（杜絕 `1:1:6.0R`）。
   - 與下方總表操盤指引保持完全一致。
