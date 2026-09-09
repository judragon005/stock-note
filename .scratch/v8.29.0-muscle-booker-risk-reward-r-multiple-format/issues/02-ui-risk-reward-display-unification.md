# Issue 02: 工作區 UI 風益比標記、文字與卡片全面統一 R 倍數

## 狀態與分流
- 狀態：`CLOSED` (工作區 UI 風益比標記、文字與卡片全面統一 R 倍數)
- 負責人：Agent
- 標籤：`ready-for-agent`, `ui`, `format`

## 任務說明
1. 修改 `src/components/MuscleBookerWorkspace.tsx`：
   - 修正作戰看板說明文字為：「突破箱頂且 20MA 扣低走揚，風益比 ≥ 2.0R 優先置頂，勝率與動能俱佳。」
   - 修正作戰看板右上角 Badge 為：`{top3BuyItems.length} 檔 · 風益比 ≥ 2.0R`。
   - 修正作戰看板卡片中風益比渲染：`🔥 風益比: {item.actionDecision.riskRewardRatio}`（不再重複拼裝 R 或 1:）。
   - 修正三色操盤導航儀中風益比渲染：`{item.actionDecision.riskRewardRatio}`。
   - 修正下方總表展開操盤小抄中風益比渲染：`{item.actionDecision.riskRewardRatio}`。
