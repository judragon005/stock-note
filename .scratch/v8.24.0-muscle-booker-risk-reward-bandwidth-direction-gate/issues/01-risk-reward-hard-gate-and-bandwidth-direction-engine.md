# Issue 01: 風益比及格門禁 (R:R >= 2.0) 與帶寬方向實質確立引擎

## 狀態與分流

- 狀態：`CLOSED` (已實作 R:R >= 2.0 門禁、帶寬極致壓縮方向前置審查與數值型欄位)
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `discipline`

## 任務說明

1. 在 `src/engine/muscleBookerEngine.ts` 中的 `evaluateMuscleBookerAction`：
   - 在突破（`BREAKOUT_UP`）與破底翻買點中，計算出之風益比數值若 $< 2.0$（如 1599 的 0.1R）：
     - 嚴格禁止判定為 `BUY`。
     - 動作降級為 `HOLD`（三色矩陣中歸入黃燈觀望待變）。
     - 徽章為 `🟡 觀望 (風益比不足)`。
     - 理由標註為「已逼近箱頂壓力，向上空間不足 (風益比 ${rrRatio}R < 2.0R)，切忌追高」。
   - 帶寬審查：若 `bbands.isSqueeze`（帶寬 $\le 8\%$），一律歸為 `AVOID`（壓縮待變，方向未明）。
   - 方向判定：收盤價必須站上 20MA 且 `ma20Slope === 'UP'`。
2. 在 `MuscleBookerActionDecision` 增加數值型欄位 `riskRewardRatioValue?: number`，以利排序。
