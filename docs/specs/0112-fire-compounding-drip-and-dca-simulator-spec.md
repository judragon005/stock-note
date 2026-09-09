# 需求規格說明書 #0112：FIRE 財務自由複利滾雪球與定期定額智慧排程系統 (FIRE Compounding DRIP & DCA Simulator System)

- **版本**：v8.31.0
- **狀態**：`READY_FOR_DEV`
- **建立日期**：2026-09-09
- **關聯技術債**：
  - [docs/debts/0029-drip-compounding-engine-and-cash-flow-growth-forecaster.md](../debts/0029-drip-compounding-engine-and-cash-flow-growth-forecaster.md) (`DEBT-0029`, 核心主幹)
  - [docs/debts/0021-smart-dca-simulator-and-cashflow-scheduler.md](../debts/0021-smart-dca-simulator-and-cashflow-scheduler.md) (`DEBT-0021`, 強相關 1: 累積期)
  - [docs/debts/0022-monte-carlo-fire-and-safe-withdrawal-simulator.md](../debts/0022-monte-carlo-fire-and-safe-withdrawal-simulator.md) (`DEBT-0022`, 強相關 2: 提領期)

---

## 1. 執行摘要 (Executive Summary)

本模組旨在為長期存股族、指數化投資人與追求財務自由 (FIRE, Financial Independence, Retire Early) 的用戶打造機構級別的**「終身長期財富飛輪三位一體系統」**。

在歷經多帳戶現金帳本、XIRR 不定期現金流求解器、應收股利平滑機制與量化體檢（夏普值、波動率、MDD）的完備後，系統具備了完整的歷史回顧性帳務。本模組將這三項關鍵技術債進行深度有機整合，解決長期投資的核心痛點：

1. **股利沉澱 vs. DRIP 複利滾雪球量化盲區**：
   - 一般存股人常將股息視為「零用錢直接提領」，無法量化「若每次配息皆全額再投資 (DRIP)，10~30 年後總市值與被動年現金流會比單利提領多出幾倍」。
   - 提供 4 階被動收入自由度里程碑（月領 1萬、3萬、6萬、10萬），以連續線性插值精確計算 DRIP 模式能替投資人「提早幾年實現退休 (`yearsSaved`)」。
2. **定期定額 (DCA) 排程與交割防透支預警**：
   - 解決指數投資人每月多筆約定扣款（如每月 6、16、26 日）逢法定國定假日順延撮合之計算複雜度。
   - 結合即時交割戶餘額與在途結算，精準推演未來 30 天每日現金水位，一旦有透支風險即時亮紅燈並計算資金補足差額。
   - 提供基於真實日 K 線的「定期定額 vs. 期初單筆歐印 (Lump-Sum)」歷史機會成本對照回測。
3. **順序報酬風險 (SRR) 與蒙地卡羅 1,000 次退休存續模擬**：
   - 傳統線性計算（每年固定 7% 報酬）忽略了退休初期遭遇熊市的「順序報酬風險 (Sequence of Returns Risk)」。
   - 採用純原生幾何布朗運動 (GBM) 執行 1,000 次 30 年路徑隨機抽樣，輸出 P10~P90 錐形圖 (Fan Chart)、破產機率與安全提領率 (SWR)。
   - 支援經典 Trinity 4% 通膨調整、Guyton-Klinger 動態護欄與純股息本金保全三種提領策略。

---

## 2. 專業名詞雙語與懸停說明對照表 (Terminology & Tooltips Dictionary)

本系統所有介面元素、報表與圖表必須嚴格遵循以下中英雙語及懸停說明文案規範：

| 英文術語 | 繁體中文名稱 | 介面顯示格式 | 懸停即時說明浮窗內容 (Tooltip Text) |
| :--- | :--- | :--- | :--- |
| **DRIP (Dividend Reinvestment Plan)** | 股息自動再投資計畫 | `DRIP 股息再投資` | 將收到的現金股息在發放當期全數買進原標的股份（含零股/碎股），讓股子再生股孫，產生幾何級數複利滾雪球效應。 |
| **Cash Out Mode** | 股利單利提領模式 | `股息提領模式 (Cash Out)` | 將每年收到的股息全數提領當作生活費花掉，持股數固定不變，僅享受既有持股的自然股價增長。 |
| **Compounding Multiplier** | 複利增益倍數 | `複利倍數 (Multiplier)` | 計算公式為 `DRIP 總市值 / 單利提領總市值`。衡量股息再投資相較於直接領出花掉，在特定年期內為您額外放大的資產倍數。 |
| **Dividend Growth Rate (DGR)** | 股息年複合成長率 | `股息成長率 (DGR)` | 企業或投資組合每股配息金額的年化成長百分比。反映企業盈餘增長與對抗通膨的被動現金流擴張能力。 |
| **Years Saved to Milestone** | 里程碑提早達成年數 | `提早實現 (Years Saved)` | 透過 DRIP 股息再投資相較於傳統提領花掉模式，讓被動收入達到目標生活費所提前縮短的奮鬥年數。 |
| **Dollar-Cost Averaging (DCA)** | 定期定額分批投入 | `定期定額 (DCA)` | 在固定週期以固定金額買進標的，高價時買少、低價時買多，藉此平滑持股成本與克服市場波動心魔。 |
| **DCA Overdraft Guard** | 交割戶防透支預警 | `交割防透支預警 (Overdraft Guard)` | 依據約定扣款日曆推演未來 30 天扣款金額，若交割戶預估餘額低於 0 元時即時發出紅燈預警，杜絕違約交割。 |
| **Lump-Sum Investment** | 單筆歐印一次投入 | `單筆一次投入 (Lump-Sum)` | 在策略起始日將全部準備金一次全額買進。在長期上升趨勢中通常報酬較高，但承擔較大的回撤與心理壓力。 |
| **Monte Carlo Simulation** | 蒙地卡羅隨機模擬 | `蒙地卡羅模擬 (Monte Carlo)` | 透過 1,000 次隨機擾動路徑，模擬未來市場在各種牛熊情境下的資產走勢，用以量化退休破產機率與極端風險。 |
| **Sequence of Returns Risk (SRR)** | 順序報酬風險 | `順序報酬風險 (SRR)` | 退休提領初期若不幸遭遇熊市大跌，將導致本金過度萎縮而永遠無法復原的重大風險。 |
| **Safe Withdrawal Rate (SWR)** | 安全提領率 | `安全提領率 (SWR)` | 在指定退休年期（如 30 年）內，能維持 95% 以上不破產存續機率的最高初始年提領百分比。經典 Trinity 研究為 4%。 |
| **Guyton-Klinger Guardrails** | 蓋頓-克林格動態護欄 | `動態護欄提領法則 (Guardrails)` | 依據每年資產淨值動態調整生活費：當提領率過高（熊市）時主動縮減 10% 提領，提領率過低（大牛市）時調增 10%。 |
| **Capital Preservation (Dividend-Only)**| 純股息本金保全模式 | `純股息提領 (Dividend-Only)` | 每年僅提領實際配發的股息現金，本金股份一股不賣，資產破產機率理論上為 0%。 |

---

## 3. 系統整體架構與資料流 (System Architecture & Pipeline)

```mermaid
flowchart TD
    subgraph Inputs [專案底層現有資料來源 SSOT]
        Holdings[持倉與殖利率庫存<br/>HoldingPositions]
        CashLedger[多券商交割戶餘額<br/>calculateAccountBalances]
        HolidayEngine[國定休市日曆引擎<br/>settlementEngine.ts]
        QuantStats[組合年化報酬與波動率<br/>quantMetrics.ts]
    end

    subgraph DCA_Module [模組一：定期定額累積期 dcaSchedulerEngine.ts]
        DCAPlanDef[定投計畫參數<br/>代碼 / 金額 / 扣款日]
        HolidayDefer[休市順延撮合計算<br/>$T$ 日與 $T+2$ 交割]
        CashForecast[未來 30 天每日現金推演<br/>防透支水位與缺口警示]
        OpportunityBacktest[DCA vs Lump-Sum<br/>歷史機會成本與回撤回測]
    end

    subgraph DRIP_Module [模組二：股利複利加速期 dripCompoundingEngine.ts (核心)]
        WeightedYield[持倉加權殖利率 $y_w$<br/>與加權股息成長率 DGR]
        DualTrackSim[雙軌模擬推演 1~30 年<br/>Cash Out vs DRIP 滾雪球]
        CompoundingRatio[複利放大倍數曲線<br/>Multiplier = DRIP / CashOut]
        MilestoneInterpolation[4 階被動收入自由度里程碑<br/>連續線性插值求精確年數]
    end

    subgraph FIRE_Module [模組三：蒙地卡羅退休提領期 monteCarloFireEngine.ts]
        GBMGenerator[幾何布朗運動 GBM 1,000次<br/>Box-Muller 標準常態隨機路徑]
        Strategies[3 大提領策略演算法<br/>Trinity 4% / 護欄 / 純股息]
        Percentiles[百分位數排序分位矩陣<br/>P10, P25, P50, P75, P90]
        SWRBisection[95% 存活率安全提領率<br/>二分逼近求最佳 SWR]
    end

    subgraph UI_Workspace [前端視覺化工作台 FirePlanningWorkspace.tsx]
        KPICards[頂部 4 大核心指標看板<br/>自由達成年 / 複利倍數 / 存活率 / DCA 水位]
        DualTrackChart[原生 SVG 雙軌資產面積對比圖]
        FanChartSVG[原生 SVG 蒙地卡羅百分位錐形圖]
        DCATimelinePanel[DCA 30 天扣款時序與紅燈面板]
    end

    Holdings --> WeightedYield
    CashLedger & HolidayEngine --> HolidayDefer --> CashForecast
    DCAPlanDef --> HolidayDefer
    WeightedYield --> DualTrackSim --> CompoundingRatio & MilestoneInterpolation
    DualTrackSim --> GBMGenerator
    QuantStats --> GBMGenerator
    GBMGenerator --> Strategies --> Percentiles & SWRBisection

    KPICards --- UI_Workspace
    DualTrackChart --- UI_Workspace
    FanChartSVG --- UI_Workspace
    DCATimelinePanel --- UI_Workspace
```

---

## 4. 模組詳細規格與數學模型 (Detailed Module Specs & Math Models)

### 4.1 核心模組：DRIP 股利再投資與被動現金流複利滾雪球預測器 (`dripCompoundingEngine.ts`)

#### 4.1.1 核心輸入參數與資料型別
```typescript
export interface DRIPSimulationConfig {
  initialPortfolioValue: number;         // 初始總投資組合現值 (TWD, 預設由系統自動帶入)
  weightedDividendYield: number;        // 持倉加權股息殖利率 (例如 0.045 代表 4.5%)
  expectedCapitalGrowthRate: number;    // 預期年化股價增值率 (例如 0.05 代表 5%)
  dividendGrowthRate: number;           // 預期股息年成長率 DGR (例如 0.03 代表 3%)
  monthlyContributionTwd: number;       // 每月額外自主定投加碼金額 (例如 10,000)
  reinvestTaxRate: number;              // 股息再投資稅費損耗 (預設 0.0211 代表二代健保，美股可設 0.3)
  yearsToProject: number;               // 預測年期 (預設 30 年)
  customMonthlyExpenseTarget?: number;  // 自訂月生活費目標 (例如 50,000)
}

export interface DRIPProjectionYearPoint {
  year: number;                         // 第 t 年 (1..N)
  // 情境 A: 股息提領 (Cash Out)
  cashOutPortfolioValue: number;        // 市值
  cashOutAnnualDividendGross: number;   // 稅前年股息
  cashOutAnnualDividendNet: number;     // 稅後年股息
  cashOutMonthlyIncomeNet: number;      // 稅後折合月被動收入
  cashOutCumulativeDividend: number;    // 累積提領花掉之股利
  // 情境 B: DRIP 股息再投資 (Compounding)
  dripPortfolioValue: number;           // 市值
  dripAnnualDividendGross: number;      // 稅前年股息
  dripAnnualDividendNet: number;        // 稅後年股息
  dripMonthlyIncomeNet: number;         // 稅後折合月被動收入
  dripSharesMultiplier: number;         // 相較第 0 年之持股總數放大倍數
  // 兩者效益對照
  compoundingMultiplier: number;        // dripPortfolioValue / cashOutPortfolioValue
  wealthDeltaTwd: number;               // DRIP 額外為投資人多賺之總資產
}

export interface PassiveIncomeMilestone {
  tierId: 'TIER_1_UTILITY' | 'TIER_2_BASIC' | 'TIER_3_COMFORT' | 'TIER_4_FIRE' | 'TIER_CUSTOM';
  tierName: string;                     // 里程碑名稱
  monthlyTargetTwd: number;             // 月目標金額
  annualTargetTwd: number;              // 年目標金額
  achievedYearCashOut: number | null;   // 提領模式達成年 (帶有小數點精度，如 8.4 年)
  achievedYearDRIP: number | null;      // DRIP 模式達成年 (如 5.1 年)
  yearsSaved: number | null;            // DRIP 提早達成年數 (如 3.3 年)
  isCurrentlyAchieved: boolean;         // 當前是否已達標
}
```

#### 4.1.2 雙軌數學推演模型 (Dual-Track Mathematical Model)

設初始資產為 $V_0$，有效殖利率為 $y$，年化資本利得率為 $g$，股息年成長率為 $d$，每月定投本金為 $M$（年化投入 $C = 12 \times M$），稅率摩擦為 $\tau$：

1. **情境 A（單利提領 / Cash Out）**：
   - 股數不變，$S_t = S_0$。
   - 每年底資產市值：
     $$V_{t, \text{CashOut}} = V_{t-1, \text{CashOut}} \times (1 + g) + C$$
   - 第 $t$ 年配發之稅後股息：
     $$D_{t, \text{CashOut}} = \left(V_{t-1, \text{CashOut}} \times y \times (1 + d)^t\right) \times (1 - \tau)$$
   - 累積領取股利：
     $$\text{CumDiv}_{t} = \text{CumDiv}_{t-1} + D_{t, \text{CashOut}}$$

2. **情境 B（DRIP 股息再投資）**：
   - 每年產生的稅後股息全數以當期市價買進增量股份：
     $$D_{t, \text{DRIP}} = \left(V_{t-1, \text{DRIP}} \times y \times (1 + d)^t\right) \times (1 - \tau)$$
   - 當期新增投入本金與股息一併滾入次年基數：
     $$V_{t, \text{DRIP}} = V_{t-1, \text{DRIP}} \times (1 + g) + D_{t, \text{DRIP}} + C$$
   - 股份放大倍數：
     $$\text{SharesMultiplier}_t = \text{SharesMultiplier}_{t-1} \times \left(1 + \frac{y \times (1 + d)^t \times (1 - \tau)}{1 + g}\right)$$

3. **複利增益倍數 (Compounding Multiplier)**：
   $$\text{Multiplier}_t = \frac{V_{t, \text{DRIP}}}{V_{t, \text{CashOut}}}$$

#### 4.1.3 里程碑連續線性插值演算法 (Continuous Interpolation)
為求出精準達標年份（避免整數年跳躍階梯），若在第 $t-1$ 年與第 $t$ 年之間月被動收入跨越目標 $T_{\text{target}}$：
$$\text{AchievedYear} = (t - 1) + \frac{T_{\text{target}} - \text{Income}_{t-1}}{\text{Income}_t - \text{Income}_{t-1}}$$
若至模擬上限（如 30 年）仍未達標，則回傳 `null`。
若兩種模式皆達標，則：
$$\text{YearsSaved} = \text{AchievedYear}_{\text{CashOut}} - \text{AchievedYear}_{\text{DRIP}}$$

---

### 4.2 強相關模組 1：定期定額 (DCA) 智慧排程與現金防透支引擎 (`dcaSchedulerEngine.ts`)

#### 4.2.1 定投計畫資料結構 (DCA Plan Schema)
```typescript
export interface DCAPlan {
  id: string;
  symbol: string;                       // 標的代碼 (如 0050, 006208, VT, AAPL)
  market: 'TW' | 'US';                  // 市場類別
  accountId: string;                    // 指定扣款券商帳戶 ID
  targetAmountTwd: number;              // 每期扣款台幣金額 (美股依當期匯率折算)
  executionDays: number[];              // 每月約定扣款日 (例如 [6, 16, 26])
  isActive: boolean;                    // 是否啟用
  reinvestDividends: boolean;           // 是否加入 DRIP 聯動
  createdAt: number;
}

export interface DCAScheduledExecution {
  date: string;                         // 實際撮合交易日 YYYY-MM-DD (已處理假日順延)
  scheduledDay: number;                 // 原約定扣款日 (如 6)
  settlementDate: string;               // 預計交割扣款日 YYYY-MM-DD (台股 T+2 / 美股 T+1)
  planId: string;
  symbol: string;
  accountId: string;
  amountTwd: number;
  isHolidayDeferred: boolean;           // 是否因逢假日休市順延
}

export interface CashflowOverdraftForecast {
  date: string;                         // 預計扣款日
  accountId: string;
  accountName: string;
  currentAvailableCashTwd: number;      // 當前扣除在途款後之淨可用餘額
  totalDeductionsUntilDate: number;     // 截至該日累計需扣除之 DCA 金額
  projectedCashTwd: number;             // 預估扣款後剩餘現金水位
  isOverdraftRisk: boolean;             // 是否透支 (projectedCashTwd < 0)
  shortfallAmountTwd: number;           // 資金缺口金額 (若透支則為差額，否則為 0)
}
```

#### 4.2.2 國定假日撮合順延與交割日演算規則
1. **撮合日順延**：
   - 遍歷未來 30 個日曆天。當日期為計畫約定之 `executionDays` 時，調用 `settlementEngine.ts` 中的 `isMarketHoliday(date, market)` 與週末判定：
     - 若為週末（週六、日）或國定假日，將實際撮合日期順延至下一個工作日 ($T$ 日)。
2. **交割結算日演算**：
   - 台股 ($TW$)：依據台灣國定假日日曆順延 $2$ 個營業日 ($T+2$)。
   - 美股 ($US$)：依據美國法定休市日曆順延 $1$ 個營業日 ($T+1$)。
3. **現金帳本防透支推演**：
   - 依帳戶維度，提取即時 `calculateAccountBalances` 得到的 `netAvailableCashTwd`。
   - 按交割時序累計扣款金額：
     $$\text{ProjectedCash}_k = \text{NetAvailableCash} - \sum_{i=1}^k \text{Amount}_i$$
   - 當 $\text{ProjectedCash}_k < 0$，立即標記 `isOverdraftRisk = true`，資金缺口為 $|\text{ProjectedCash}_k|$。

#### 4.2.3 定期定額 vs. 單筆歐印 (Lump-Sum) 機會成本回測指標
利用現有 IndexedDB 中的歷史日 K 線庫，給定回測區間（如過去 1 年、2 年、3 年）與總本金 $W$：
- **DCA 策略**：每月指定扣款日以 $\frac{W}{N}$ 金額按收盤價買進零股，累計總股數 $S_{\text{DCA}}$，平均成本 $\bar{P}_{\text{DCA}} = \frac{W}{S_{\text{DCA}}}$。
- **Lump-Sum 策略**：第 0 天以當日收盤價全額買進，總股數 $S_{\text{LS}} = \frac{W}{P_0}$。
- **比較指標**：
  - 終期總資產差異百分比：$\frac{NAV_{\text{DCA}} - NAV_{\text{LS}}}{NAV_{\text{LS}}} \times 100\%$
  - 歷程最大回撤 (Max Drawdown, MDD) 對比
  - XIRR 內部報酬率對比

---

### 4.3 強相關模組 2：蒙地卡羅退休提領 (FIRE) 與安全提領率模擬器 (`monteCarloFireEngine.ts`)

#### 4.3.1 核心資料模型
```typescript
export type WithdrawalStrategyType =
  | 'FIXED_PERCENT_INFLATION_ADJUSTED'  // 經典 Trinity 4% 通膨調整法
  | 'GUYTON_KLINGER_GUARDRAILS'          // Guyton-Klinger 動態護欄法
  | 'DIVIDEND_ONLY_PRESERVATION';        // 純股息本金保全模式

export interface MonteCarloSimulationConfig {
  initialPortfolioValue: number;         // 初始退休資產規模 (預設由系統 NAV 帶入)
  annualExpenditureTargetTwd: number;   // 預期年支出生活費 (如 600,000)
  yearsToSimulate: number;               // 模擬年期 (如 30 年)
  expectedAnnualReturn: number;          // 期望年化報酬率 (如 0.075)
  annualVolatility: number;              // 組合年化波動度 (如 0.16)
  annualInflationRate: number;           // 年通膨率 (如 0.025)
  dividendYield: number;                 // 股息殖利率 (純股息策略用)
  strategy: WithdrawalStrategyType;      // 提領策略
  simulationRuns?: number;               // 模擬路徑次數 (預設 1,000 次)
}

export interface MonteCarloPercentileTrack {
  year: number;
  p10: number;                           // 第 10 百分位 (極度悲觀)
  p25: number;                           // 第 25 百分位
  p50: number;                           // 第 50 百分位 (中位數路徑)
  p75: number;                           // 第 75 百分位
  p90: number;                           // 第 90 百分位 (樂觀繁榮)
}

export interface MonteCarloSimulationResult {
  simulationRuns: number;
  successRate: number;                   // 成功率 % (0..100)
  ruinProbability: number;               // 破產機率 % (100 - successRate)
  medianFinalNetWorthTwd: number;        // 期末中位數淨資產
  safeWithdrawalRateMax: number;         // 達到 95% 存活率的最大初始提領率 %
  percentileTracks: MonteCarloPercentileTrack[];
  runsExhaustedBeforeYear10: number;     // 前 10 年破產之路徑數 (順序報酬嚴重受創)
}
```

#### 4.3.2 幾何布朗運動 (GBM) 與隨機變數生成
1. **Box-Muller 變換**：
   使用標準均勻亂數 $U_1, U_2 \in (0, 1)$ 生成標準常態隨機數 $Z \sim \mathcal{N}(0, 1)$：
   $$Z = \sqrt{-2 \ln U_1} \cdot \cos(2\pi U_2)$$
2. **路徑迭代公式**：
   對於路徑 $k$ 在第 $t$ 年：
   $$\text{GrossNAV}_{t} = NAV_{t-1} \cdot \exp\left(\left(\mu - \frac{\sigma^2}{2}\right) + \sigma Z_{t, k}\right)$$
   $$NAV_{t} = \max(0, \text{GrossNAV}_{t} - W_t)$$
   若在任一年份 $NAV_t \le 0$，則該路徑判定為「破產 (Ruin)」，後續年份資產保持為 0。

#### 4.3.3 提領規則 (Withdrawal Rules)
1. **Trinity 4% 規則**：
   第 1 年提領 $W_1 = \text{TargetExpenditure}$；
   第 $t$ 年隨通膨調整：$W_t = W_{t-1} \times (1 + \pi)$。
2. **Guyton-Klinger 動態護欄**：
   計算當期名目提領率 $r_t = \frac{W_t}{\text{GrossNAV}_t}$：
   - **資本保全護欄 (Capital Preservation Rule)**：若 $r_t > 1.2 \times r_0$（熊市縮水提領率飆高），強制將當期提領額調降 10%：$W_t = W_t \times 0.9$。
   - **繁榮上調護欄 (Prosperity Rule)**：若 $r_t < 0.8 \times r_0$（牛市大賺提領率偏低），將當期提領額調升 10%：$W_t = W_t \times 1.1$。
3. **純股息模式**：
   $W_t = \min(\text{TargetExpenditure}, \text{GrossNAV}_t \times \text{Yield})$，永遠不動用股票母體本金。

#### 4.3.4 最大安全提領率 (SWR) 二分法逆運算
以二分逼近法（區間 $1.0\% \sim 10.0\%$，容差 $0.05\%$）反覆試算不同的初始提領率，找出使 1,000 次模擬在第 $N$ 年存活率恰好 $\ge 95\%$ 的臨界最大初始提領率。

---

## 5. 前端視覺化工作台設計 (`FirePlanningWorkspace.tsx`)

### 5.1 佈局架構與核心模組
採用與專案一致的高級深色 Glassmorphism 風格（`background: rgba(15, 23, 42, 0.65)`, `backdrop-filter: blur(16px)`）：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏖️ 退休財務自由與複利飛輪工作台 (FIRE & Compounding Hub)                                   │
├───────────────────┬───────────────────┬───────────────────┬────────────────────────────┤
│ 🎯 預估自由達成年 │ ⚡ 股息複利增益倍數│ 🛡️ 30年退休存活率 │ ⚠️ 30天 DCA 交割防透支     │
│ 8.2 年 (提早 4.1年)│ 2.68x (多賺 820萬) │ 96.4% (安全提領4.2%)│ 🟢 水位充裕 (最少餘額 52,400)│
├───────────────────┴───────────────────┴───────────────────┴────────────────────────────┤
│ [子分頁切換]  [📈 DRIP 複利滾雪球與里程碑]  [🎲 蒙地卡羅 FIRE 模擬]  [📅 定期定額 DCA 排程]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [核心視圖區塊]                                                                          │
│  - 視圖 1: 原生 SVG 雙軌資產面積圖 (Cash Out vs DRIP 雙曲線、4 階里程碑旗標、差距填色)     │
│  - 視圖 2: 原生 SVG 蒙地卡羅資產錐形圖 (Fan Chart, P10~P90 半透明漸層帶、中位數走勢線)    │
│  - 視圖 3: DCA 未來 30 天日曆扣款時序條、帳戶扣款明細、資金缺口警示與歷史機會成本回測     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [參數調節控制抽屜 / 控制台]                                                             │
│  每月定投金額 | 預期增值率 (5%) | 股息殖利率 (4.5%) | DGR (3%) | 預期通膨 (2.5%) | 目標生活費│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 原生 SVG 圖表設計規範 (0 外部依賴)
1. **DRIP 雙軌曲線對照圖 (`DRIPCompoundingChart.tsx`)**：
   - 橫軸：年份（第 0 年 ~ 第 30 年）。
   - 縱軸：總資產 (TWD)，動態自適應刻度。
   - 提領線：灰色虛線 `#94a3b8`；DRIP 曲線：發光翡翠綠實線 `#10b981`。
   - 兩線之間的超額複利增益區域填入透明漸層色彩（`rgba(16, 185, 129, 0.15)`）。
   - 在交會達標點標記里程碑水平虛線與徽章標籤。
2. **蒙地卡羅百分位錐形圖 (`MonteCarloFanChart.tsx`)**：
   - 使用多層 SVG `<polygon>` 繪製：
     - P10 ~ P90 區間：淺藍紫色漸層半透明陰影（`rgba(99, 102, 241, 0.1)`）。
     - P25 ~ P75 區間：深一度藍紫色半透明陰影（`rgba(99, 102, 241, 0.25)`）。
     - P50 中位數線：亮紫色實線 `#818cf8`，加寬線條並附帶資料點懸停 Tooltip。
     - $NAV = 0$ 警戒破產基線標記鮮紅色。

---

## 6. 邊界條件與防禦性設計矩陣 (Edge Cases & Defensive Matrix)

| 邊界情境 | 潛在錯誤或風險 | 防禦性處理方案 | 預期結果 |
| :--- | :--- | :--- | :--- |
| **持倉為空或股息殖利率為 0** | 除以 0 或複利乘數為 NaN | 預設最低基礎模型殖利率（如 4.0%）或提示使用者輸入自訂參數 | 保持模擬器可用，不報錯崩潰 |
| **初期生活費大於初始總資產** | 第 1 年立即破產，$NAV \le 0$ | 捕捉 $NAV \le 0$ 邊界，立即標記破產，不產生負數資產路徑 | 成功率為 0%，SWR 提示調整目標 |
| **DCA 扣款日逢連續連假跨月** | 順延到次月造成單月多次扣款 | 依循真實交易日，計算 $T$ 日撮合與 $T+2$ 交割扣款 | 現金推演真實反映帳戶扣款時序 |
| **交割戶剩餘現金為負** | 違約交割紅燈 | 即時亮紅燈並給出精確補足現金金額 (`shortfallAmountTwd`) | 提示需在 $T+2$ 前存入指定金額 |
| **通膨率 $\ge$ 投資報酬率** | 實質報酬率為負，破產率劇增 | 算法正常計算實質購買力衰退，在 UI 給予「通膨侵蝕」警告 | 誠實揭露購買力縮水風險 |
| **自訂生活費至 30 年皆未達標** | 里程碑年份為無窮大或溢出 | 回傳 `achievedYear: null`，UI 顯示「尚未達標」灰色徽章 | 保持介面整潔，不出現奇怪數值 |

---

## 7. 驗收標準 (Acceptance Criteria)

1. **單元測試全覆蓋 (TDD 100% 綠燈)**：
   - 覆蓋核心三大模組：`dripCompoundingEngine`、`dcaSchedulerEngine`、`monteCarloFireEngine`。
   - 所有測試套件均達 100% 通過，無跳過或警告。
2. **生產環境打包與型別安全**：
   - `npm run build` 耗時正常，TypeScript Strict 模式 **0 Errors / 0 Warnings**。
3. **技術債生命週期閉環**：
   - `DEBT-0029`、`DEBT-0021`、`DEBT-0022` 標記為 `RESOLVED`，更新 `docs/debts/README.md`。
4. **領域文檔同步**：
   - 建立 `docs/adr/0112-fire-compounding-drip-and-dca-simulator.md`。
   - 更新 `CONTEXT.md` 加入雙語術語與領域模型。
