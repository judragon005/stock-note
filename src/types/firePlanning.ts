/**
 * FIRE 財務自由、DRIP 複利滾雪球與定期定額智慧排程系統資料型別定義
 * SPEC-0112 / DEBT-0029, DEBT-0021, DEBT-0022
 */

// ==========================================
// 1. DRIP 股利再投資與被動收入里程碑型別
// ==========================================

export interface DRIPSimulationConfig {
  initialPortfolioValue: number;         // 初始總投資組合現值 (TWD)
  weightedDividendYield: number;        // 持倉加權股息殖利率 (例如 0.045 代表 4.5%)
  expectedCapitalGrowthRate: number;    // 預期年化股價增值率 (例如 0.05 代表 5%)
  dividendGrowthRate: number;           // 預期股息年成長率 DGR (例如 0.03 代表 3%)
  monthlyContributionTwd: number;       // 每月額外自主定投加碼金額 (例如 10,000)
  reinvestTaxRate: number;              // 股息再投資稅費損耗 (預設 0.0211 代表二代健保)
  yearsToProject: number;               // 預測年期 (預設 30 年)
  customMonthlyExpenseTarget?: number;  // 自訂月生活費目標 (例如 50,000)
}

export interface DRIPProjectionYearPoint {
  year: number;                         // 第 t 年 (0..N)
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

export type MilestoneTierId =
  | 'TIER_1_UTILITY'
  | 'TIER_2_BASIC'
  | 'TIER_3_COMFORT'
  | 'TIER_4_FIRE'
  | 'TIER_CUSTOM';

export interface PassiveIncomeMilestone {
  tierId: MilestoneTierId;
  tierName: string;                     // 里程碑名稱 (繁體中文)
  monthlyTargetTwd: number;             // 月目標金額
  annualTargetTwd: number;              // 年目標金額
  achievedYearCashOut: number | null;   // 提領模式達成年 (精確小數點, 如 8.4 年)
  achievedYearDRIP: number | null;      // DRIP 模式達成年 (如 5.1 年)
  yearsSaved: number | null;            // DRIP 提早達成年數 (如 3.3 年)
  isCurrentlyAchieved: boolean;         // 當前第 0 年是否已達標
}

// ==========================================
// 2. 定期定額 (DCA) 排程與現金防透支型別
// ==========================================

export interface DCAPlan {
  id: string;
  symbol: string;                       // 扣款標的代碼 (如 0050, 006208, VT, AAPL)
  market: 'TW' | 'US';                  // 市場類別
  accountId: string;                    // 指定扣款券商帳戶 ID
  targetAmountTwd: number;              // 每期約定扣款台幣金額
  executionDays: number[];              // 每月約定扣款日 (例如 [6, 16, 26])
  isActive: boolean;                    // 是否啟用
  reinvestDividends: boolean;           // 是否加入 DRIP 聯動
  createdAt: number;
}

export interface DCAScheduledExecution {
  date: string;                         // 實際撮合交易日 YYYY-MM-DD (已處理休市順延)
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

export interface DCABacktestResult {
  symbol: string;
  totalMonths: number;
  totalInvestedTwd: number;
  dcaFinalValueTwd: number;
  dcaTotalShares: number;
  dcaAverageCost: number;
  dcaReturnPercent: number;
  dcaMaxDrawdownPercent: number;
  lumpSumFinalValueTwd: number;
  lumpSumTotalShares: number;
  lumpSumReturnPercent: number;
  lumpSumMaxDrawdownPercent: number;
  wealthDeltaPercent: number;           // (dcaFinalValue - lumpSumFinalValue) / lumpSumFinalValue * 100
}

// ==========================================
// 3. 蒙地卡羅退休提領 (FIRE) 模擬型別
// ==========================================

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
