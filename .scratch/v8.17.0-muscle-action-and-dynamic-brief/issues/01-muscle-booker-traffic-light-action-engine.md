# Issue 01: 肌肉書僮三色操作決策引擎與點位計算

## 狀態
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`engine`, `algo`

## 需求
1. 在 `muscleBookerEngine.ts` 實作 `evaluateMuscleBookerAction`：
   - 輸入：`currentPrice`, `box`, `deduction`, `bbands`
   - 輸出：`action: 'BUY' | 'AVOID' | 'SELL' | 'HOLD'`, `actionBadge: string`, `actionReason: string`, `stopLossPrice?: number`, `targetPrice?: number`, `riskRewardRatio?: string`
2. 覆蓋判斷規則：
   - `BUY`：箱頂突破 或 底穿上破底翻反轉
   - `AVOID`：布林極致壓縮（等待表態不碰）或 均線下彎反壓（不接刀）
   - `SELL`：跌破箱底防守線
   - `HOLD`：箱內常態整理
3. 單元測試完整覆蓋上述 4 種情境。
