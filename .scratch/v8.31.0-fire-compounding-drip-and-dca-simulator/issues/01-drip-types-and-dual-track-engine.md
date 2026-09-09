# Issue 01: 定義 FIRE 與複利資料型別，實作 DRIP 雙軌推演演算法核心

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `drip`, `types`, `quant`

## 任務說明
1. 建立 `src/types/firePlanning.ts`：
   - 定義 `DRIPSimulationConfig`、`DRIPProjectionYearPoint`、`PassiveIncomeMilestone`。
   - 定義 `DCAPlan`、`DCAScheduledExecution`、`CashflowOverdraftForecast`、`DCABacktestResult`。
   - 定義 `WithdrawalStrategyType`、`MonteCarloSimulationConfig`、`MonteCarloPercentileTrack`、`MonteCarloSimulationResult`。
2. 建立 `src/engine/dripCompoundingEngine.ts`：
   - 實作 `simulateDRIPCompounding(config: DRIPSimulationConfig): DRIPProjectionYearPoint[]`：
     - 情境 A（單利提領 / Cash Out）：股數固定，市值按資本增值率增長，年股息全額提領不滾入，計算累積提領股利。
     - 情境 B（DRIP 股息再投資）：每年稅後淨股息全數以當期預估市價折換碎股，股數幾何放大，次年基數擴大。
     - 計算複利乘數 `compoundingMultiplier` ($V_{\text{DRIP}} / V_{\text{CashOut}}$) 與資產超額增益 `wealthDeltaTwd`。
3. 編寫單元測試 `src/engine/dripCompoundingEngine.test.ts`：
   - 驗證第 0 年到第 30 年兩條曲線數值。
   - 驗證在 0% 殖利率、0% 增值率等極端邊界下的數值穩定性。
   - 確保 100% 綠燈通過。
