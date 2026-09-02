# 技術債 #0022: 蒙地卡羅退休提領 (FIRE) 與安全提領率 (SWR) 模擬器 (Monte Carlo FIRE & Safe Withdrawal Simulator)

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：/grill-with-docs 退休財務自由與長期資產存續模擬需求調研
- **建立日期**：2026-09-02
- **標籤**：`Architecture` · `Quant` · `FIRE` · `Simulation` · `Retirement` · `Risk`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備完整的資產成長折線圖（[src/engine/historicalNavEngine.ts](file:///d:/APP/股票紀錄/src/engine/historicalNavEngine.ts)）、XIRR 內部報酬率（[src/engine/xirrEngine.ts](file:///d:/APP/股票紀錄/src/engine/xirrEngine.ts)）與股息日誌（[src/engine/dividendCalendarEngine.ts](file:///d:/APP/股票紀錄/src/engine/dividendCalendarEngine.ts)）：
1. **回顧性指標完備，前瞻性模擬缺失**：
   - 現有系統能精確呈現「過去到現在」賺了多少錢、累積多少股息與資產淨值。
   - 但無法回答長期投資人與退休族最關心的核心命題：「**以我目前的投資組合規模與波動度，未來 20~40 年每年提領生活費，資產耗盡（破產）的機率是多少？**」。
2. **缺乏順序報酬風險 (Sequence of Returns Risk, SRR) 的量化評估**：
   - 傳統線性試算（如固定每年 7% 成長、提領 4%）忽略了市場的真實波動。若在退休最初 3~5 年遭遇熊市（如 2000 年網路泡沫或 2008 年金融海嘯），資產本金將提早萎縮而無法翻身。
3. **缺乏多種動態提領規則與股息安全護欄**：
   - 尚未提供 Trinity Study 經典 4% 提領法則、Guyton-Klinger 動態護欄策略 (Guardrails) 或「純股息生活 (Dividend-Only)」等情境模擬。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **純前端蒙地卡羅千次隨機抽樣效能 (Monte Carlo Web Worker)**：
   - 需執行 1,000 ~ 10,000 次隨機路徑模擬（含幾何布朗運動 GBM 或歷史區塊 Bootstrap 重採樣）。
   - 必須透過 Web Worker 或受控非同步切片執行，保證主執行緒 UI 完全流暢不卡頓。
2. **多資產相關性與通膨率動態模型**：
   - 投資組合包含股票 (TW/US)、債券與現金，不同資產類別的回報率與波動度不同。需結合消費者物價指數 (CPI) 通膨率逐年調整實質購買力。
3. **視覺化輸出與破產機率錐形圖 (Fan Chart / Cone of Uncertainty)**：
   - 需繪製 10th、25th、50th (中位數)、75th、90th 百分位數資產存續路徑區間帶與破產機率儀表盤。

### 暫緩理由 (Deferral Rationale)
1. 本功能為進階個人財務規劃 (Financial Planning) 與 FIRE 決策模組，不影響核心持倉損益結算。
2. 先收錄為架構技術債，完成數學模型與演算法定義，待規劃「財務自由與退休模擬工作台」時集中實作。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. 蒙地卡羅模擬器參數模型 (Simulation Parameters)

```typescript
export type WithdrawalStrategy = 
  | 'FIXED_PERCENT_INFLATION_ADJUSTED' // 經典 4% 規則 (Bengen Rule)
  | 'VARIABLE_PERCENTAGE'               // 固定比例提領 (隨市值浮動)
  | 'GUYTON_KLINGER_GUARDRAILS'         // 動態護欄法則 (遇大跌調降提領，大漲調升)
  | 'DIVIDEND_ONLY_PRESERVATION';       // 只領股息，保全股票本金

export interface MonteCarloConfig {
  initialPortfolioValue: number;        // 當前 NAV 總淨資產 (預設由系統自動帶入)
  annualWithdrawalAmount: number;       // 預計年支出生活費 (TWD)
  yearsToSimulate: number;              // 模擬年期 (如 30 年)
  inflationRate: number;                // 預估年通膨率 (如 2.5%)
  expectedAnnualReturn: number;         // 預期年化報酬率 (如 7.5%)
  annualVolatility: number;             // 年化波動率 / 標準差 (如 16.0%)
  dividendYield: number;                // 組合股息率 (如 3.8%)
  strategy: WithdrawalStrategy;
  simulationRuns: number;               // 模擬次數 (預設 1,000 次)
}
```

### B. 模擬輸出指標 (Simulation Output Metrics)

```typescript
export interface MonteCarloResult {
  successRate: number;                  // 退休成功率 % (如 94.2%)
  ruinProbability: number;              // 破產機率 % (如 5.8%)
  medianFinalNetWorth: number;          // 模擬終期資產中位數
  worstCaseFinalNetWorth: number;       // 第 5 百分位最悲觀資產
  bestCaseFinalNetWorth: number;        // 第 95 百分位最樂觀資產
  percentileBands: {
    year: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  }[];
  safeWithdrawalRateMax: number;        // 達到 95% 成功率下的最大安全提領率 %
}
```

### C. 演算法核心 (Geometric Brownian Motion + Dynamic Withdrawal)

每一年 $t$ 的資產淨值推進公式：
$$NAV_{t} = \max\left(0, \left(NAV_{t-1} \cdot e^{\left(\mu - \frac{\sigma^2}{2}\right) + \sigma \cdot Z}\right) - W_t\right)$$
其中 $Z \sim \mathcal{N}(0, 1)$ 為標準常態分佈亂數，$W_t$ 為當期通膨調整後提領金額。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 規劃「🏖️ 退休與財務自由 (FIRE) 模擬工作台」時。
2. 使用者需要評估現有股息被動收入與資產規模能否完全覆蓋退休生活支出時。
3. 整合量化風控與長期資產存續度分析時。
