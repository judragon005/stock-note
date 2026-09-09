# Issue 03: 實作蒙地卡羅退休提領 (FIRE) 1000次路徑模擬與動態護欄引擎 (monteCarloFireEngine)

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `quant`, `fire`, `simulation`

## 任務說明
1. 建立 `src/engine/monteCarloFireEngine.ts`：
   - 定義 `MonteCarloConfig`、`MonteCarloResult`、`WithdrawalStrategy` 型別。
   - 純原生 0 依賴實作幾何布朗運動 (Geometric Brownian Motion, GBM) 數值隨機抽樣：
     - Box-Muller 變換生成標準常態分佈亂數。
     - 支援自訂模擬次數（預設 1,000 次），模擬 20~40 年資產演進路徑。
   - 支援 3 種提領策略：
     - 經典 Trinity 4% 通膨調整法。
     - Guyton-Klinger 動態護欄法（上下限自動增減 10% 提領額）。
     - 純股息生活模式（本金永不提領）。
   - 輸出統計指標：
     - 30 年退休成功率 (`successRate`) 與破產機率 (`ruinProbability`)。
     - 安全提領率 (達到 95% 存活率的最大初始提領率 `safeWithdrawalRateMax`)。
     - 歷年資產百分位數走勢（P10、P25、P50、P75、P90）。
2. 編寫完整單元測試 `src/engine/monteCarloFireEngine.test.ts`：
   - 驗證常態亂數均值與標準差。
   - 驗證百分位數單調遞增（$P10 \le P25 \le P50 \le P75 \le P90$）。
   - 驗證極端熊市下的破產偵測與護欄防護效益。
