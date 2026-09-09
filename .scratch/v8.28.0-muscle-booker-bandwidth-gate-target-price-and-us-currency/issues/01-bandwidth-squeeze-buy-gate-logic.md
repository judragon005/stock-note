# Issue 01: 買進決策加入布林帶寬審查硬門檻 (Bandwidth <= 8%) 邏輯

## 狀態與分流

- 狀態：`CLOSED` (已實作並通過單元測試)
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `logic`

## 任務說明

1. 修改 `src/engine/muscleBookerEngine.ts` 中 `evaluateMuscleBookerAction`：
   - 在判定情境 A（突破箱頂）與情境 B（破底翻）時，強制審查 `bbands.bandwidth`（帶寬）。
   - 若 `bbands.bandwidth > 8.0`，即使突破箱頂，亦必須安全降級為 `HOLD`（提示「帶寬未極致收斂 (X%)，非壓縮爆發起點，切忌追高」）。
   - 僅當 `bbands.bandwidth <= 8.0`（極致收斂蓄勢），且帶量站上箱頂、20MA 翻揚助漲、風益比 $\ge 2.0$ 時，方可給出 `BUY` 決策。
