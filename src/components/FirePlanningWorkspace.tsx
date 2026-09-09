import React, { useState, useMemo } from 'react';
import {
  Flame,
  TrendingUp,
  Calendar,
  Sliders,
  Award,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { HoldingPosition, BrokerAccount } from '../types/stock';
import {
  DRIPSimulationConfig,
  MonteCarloSimulationConfig,
  DCAPlan,
  WithdrawalStrategyType,
} from '../types/firePlanning';
import {
  simulateDRIPCompounding,
  calculatePassiveIncomeMilestones,
} from '../engine/dripCompoundingEngine';
import {
  runMonteCarloFIRESimulation,
} from '../engine/monteCarloFireEngine';
import {
  generateDCASchedule,
  forecastDCAOverdraftRisk,
} from '../engine/dcaSchedulerEngine';
import { DRIPCompoundingChart } from './fire/DRIPCompoundingChart';
import { MonteCarloFanChart } from './fire/MonteCarloFanChart';
import { Tooltip } from './common/Tooltip';

interface FirePlanningWorkspaceProps {
  holdings: HoldingPosition[];
  accounts: BrokerAccount[];
  totalNavTwd: number;
  portfolioAnnualVolatility?: number;
  portfolioWeightedYield?: number;
}

export const FirePlanningWorkspace: React.FC<FirePlanningWorkspaceProps> = ({
  holdings: _holdings,
  accounts,
  totalNavTwd,
  portfolioAnnualVolatility = 0.16,
  portfolioWeightedYield = 0.045,
}) => {
  // 子分頁切換
  const [activeSubTab, setActiveSubTab] = useState<'DRIP' | 'MONTE_CARLO' | 'DCA'>('DRIP');

  // ==========================================
  // 自訂參數狀態 (可即時微調)
  // ==========================================
  const [initialNav, setInitialNav] = useState<number>(totalNavTwd > 0 ? Math.round(totalNavTwd) : 3_000_000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(15_000);
  const [capitalGrowthRate, setCapitalGrowthRate] = useState<number>(0.05); // 5%
  const [dividendYield, setDividendYield] = useState<number>(
    portfolioWeightedYield > 0 ? Number(portfolioWeightedYield.toFixed(3)) : 0.045
  );
  const [dgrRate, setDgrRate] = useState<number>(0.03); // 3%
  const [customMonthlyExpense, setCustomMonthlyExpense] = useState<number>(50_000); // 5萬生活費
  const [yearsToProject, setYearsToProject] = useState<number>(25);

  // 蒙地卡羅參數
  const [annualExpenseTarget, setAnnualExpenseTarget] = useState<number>(600_000);
  const [expectedReturn, setExpectedReturn] = useState<number>(0.07);
  const [volatility, setVolatility] = useState<number>(
    portfolioAnnualVolatility > 0 ? Number(portfolioAnnualVolatility.toFixed(2)) : 0.16
  );
  const [inflationRate, setInflationRate] = useState<number>(0.025);
  const [withdrawalStrategy, setWithdrawalStrategy] =
    useState<WithdrawalStrategyType>('FIXED_PERCENT_INFLATION_ADJUSTED');

  // 預設 DCA 計畫
  const [dcaPlans] = useState<DCAPlan[]>([
    {
      id: 'dca-0050',
      symbol: '0050 元大台灣50',
      market: 'TW',
      accountId: accounts[0]?.id ?? 'default-tw',
      targetAmountTwd: 10_000,
      executionDays: [6, 16, 26],
      isActive: true,
      reinvestDividends: true,
      createdAt: Date.now(),
    },
    {
      id: 'dca-vt',
      symbol: 'VT 全球股票ETF',
      market: 'US',
      accountId: accounts[1]?.id ?? accounts[0]?.id ?? 'default-us',
      targetAmountTwd: 15_000,
      executionDays: [10],
      isActive: true,
      reinvestDividends: true,
      createdAt: Date.now(),
    },
  ]);

  // ==========================================
  // 1. DRIP 運算
  // ==========================================
  const dripConfig: DRIPSimulationConfig = useMemo(
    () => ({
      initialPortfolioValue: initialNav,
      weightedDividendYield: dividendYield,
      expectedCapitalGrowthRate: capitalGrowthRate,
      dividendGrowthRate: dgrRate,
      monthlyContributionTwd: monthlyContribution,
      reinvestTaxRate: 0.0211,
      yearsToProject,
      customMonthlyExpenseTarget: customMonthlyExpense,
    }),
    [
      initialNav,
      dividendYield,
      capitalGrowthRate,
      dgrRate,
      monthlyContribution,
      yearsToProject,
      customMonthlyExpense,
    ]
  );

  const dripProjection = useMemo(() => simulateDRIPCompounding(dripConfig), [dripConfig]);
  const milestones = useMemo(
    () => calculatePassiveIncomeMilestones(dripProjection, customMonthlyExpense),
    [dripProjection, customMonthlyExpense]
  );

  // ==========================================
  // 2. 蒙地卡羅運算
  // ==========================================
  const monteCarloConfig: MonteCarloSimulationConfig = useMemo(
    () => ({
      initialPortfolioValue: initialNav,
      annualExpenditureTargetTwd: annualExpenseTarget,
      yearsToSimulate: 30,
      expectedAnnualReturn: expectedReturn,
      annualVolatility: volatility,
      annualInflationRate: inflationRate,
      dividendYield,
      strategy: withdrawalStrategy,
      simulationRuns: 1_000,
    }),
    [
      initialNav,
      annualExpenseTarget,
      expectedReturn,
      volatility,
      inflationRate,
      dividendYield,
      withdrawalStrategy,
    ]
  );

  const monteCarloResult = useMemo(
    () => runMonteCarloFIRESimulation(monteCarloConfig),
    [monteCarloConfig]
  );

  // ==========================================
  // 3. DCA 排程與防透支
  // ==========================================
  const dcaSchedules = useMemo(() => generateDCASchedule(dcaPlans, 30), [dcaPlans]);
  const cashMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const acc of accounts) {
      map[acc.id] = 50_000;
    }
    return map;
  }, [accounts]);

  const overdraftForecasts = useMemo(
    () => forecastDCAOverdraftRisk(dcaSchedules, accounts, cashMap),
    [dcaSchedules, accounts, cashMap]
  );

  const hasOverdraftRisk = overdraftForecasts.some((f) => f.isOverdraftRisk);
  const worstShortfall = Math.max(0, ...overdraftForecasts.map((f) => f.shortfallAmountTwd));

  // 頂部 KPI 數據
  const finalYearDrip = dripProjection[dripProjection.length - 1];
  const fireMilestone = milestones.find((m) => m.tierId === 'TIER_4_FIRE');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 標題與簡介 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <Flame size={24} color="#f59e0b" />
            FIRE 財務自由與複利飛輪導航儀
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            融合定期定額累積期 (DCA)、股息再投資複利加速 (DRIP) 與 1,000 次蒙地卡羅退休提領安全防線
          </p>
        </div>

        {/* 子分頁切換 */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(30, 41, 59, 0.7)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(51, 65, 85, 0.5)',
          }}
        >
          <button
            onClick={() => setActiveSubTab('DRIP')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'DRIP' ? '#10b981' : 'transparent',
              color: activeSubTab === 'DRIP' ? '#ffffff' : '#94a3b8',
              fontWeight: activeSubTab === 'DRIP' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <TrendingUp size={15} />
            DRIP 複利滾雪球
          </button>
          <button
            onClick={() => setActiveSubTab('MONTE_CARLO')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'MONTE_CARLO' ? '#6366f1' : 'transparent',
              color: activeSubTab === 'MONTE_CARLO' ? '#ffffff' : '#94a3b8',
              fontWeight: activeSubTab === 'MONTE_CARLO' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Award size={15} />
            蒙地卡羅 FIRE 模擬
          </button>
          <button
            onClick={() => setActiveSubTab('DCA')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'DCA' ? '#0ea5e9' : 'transparent',
              color: activeSubTab === 'DCA' ? '#ffffff' : '#94a3b8',
              fontWeight: activeSubTab === 'DCA' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Calendar size={15} />
            定期定額 DCA 排程
          </button>
        </div>
      </div>

      {/* 頂部 4 大核心 KPI 看板 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* KPI 1: 預估自由達成年 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
            <span>🎯 財務自由達成預估</span>
            <Tooltip content="依據 DRIP 股息再投資模型計算，被動月股息達到月領 10 萬 (FIRE門檻) 的預計年份。">
              <Info size={14} style={{ cursor: 'pointer' }} />
            </Tooltip>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', margin: '8px 0 4px 0' }}>
            {fireMilestone?.achievedYearDRIP !== null
              ? `${fireMilestone?.achievedYearDRIP} 年`
              : `> ${yearsToProject} 年`}
          </div>
          <div style={{ fontSize: '12px', color: '#34d399' }}>
            {fireMilestone?.yearsSaved
              ? `⚡ DRIP 替您提早 ${fireMilestone.yearsSaved} 年退休`
              : '持之以恆定期定額與再投資'}
          </div>
        </div>

        {/* KPI 2: 複利放大倍數 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
            <span>⚡ {yearsToProject} 年複利放大倍數</span>
            <Tooltip content="計算公式為 DRIP 總市值 / 單利提領總市值。衡量股息全額再買進相較直接領出花掉所放大的超額資產倍數。">
              <Info size={14} style={{ cursor: 'pointer' }} />
            </Tooltip>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b', margin: '8px 0 4px 0' }}>
            {finalYearDrip.compoundingMultiplier}x
          </div>
          <div style={{ fontSize: '12px', color: '#fbbf24' }}>
            多賺 NT$ {Math.round(finalYearDrip.wealthDeltaTwd / 10000).toLocaleString()} 萬元
          </div>
        </div>

        {/* KPI 3: 蒙地卡羅退休存活率 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
            <span>🛡️ 30 年退休存續成功率</span>
            <Tooltip content="1,000 次幾何布朗運動路徑隨機抽樣中，經歷市場極端牛熊波動在 30 年內資產未耗盡 (NAV > 0) 的路徑百分比。">
              <Info size={14} style={{ cursor: 'pointer' }} />
            </Tooltip>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#818cf8', margin: '8px 0 4px 0' }}>
            {monteCarloResult.successRate}%
          </div>
          <div style={{ fontSize: '12px', color: '#a5b4fc' }}>
            最大安全提領率: {monteCarloResult.safeWithdrawalRateMax}%
          </div>
        </div>

        {/* KPI 4: 30天 DCA 交割防透支 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${hasOverdraftRisk ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.25)'}`,
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
            <span>⚠️ 未來 30 天交割防透支</span>
            <Tooltip content="依據約定定投扣款日推演交割戶餘額水位，若低於 0 元則即時示警以防違約交割。">
              <Info size={14} style={{ cursor: 'pointer' }} />
            </Tooltip>
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: hasOverdraftRisk ? '#ef4444' : '#38bdf8',
              margin: '8px 0 4px 0',
            }}
          >
            {hasOverdraftRisk ? '透支高風險' : '🟢 水位安全充裕'}
          </div>
          <div style={{ fontSize: '12px', color: hasOverdraftRisk ? '#f87171' : '#7dd3fc' }}>
            {hasOverdraftRisk
              ? `需補足差額 NT$ ${worstShortfall.toLocaleString()}`
              : `未來 30 天共 ${dcaSchedules.length} 筆預排扣款`}
          </div>
        </div>
      </div>

      {/* 主內容區塊 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* 左側視覺化圖表與子分頁內容 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            borderRadius: '16px',
            border: '1px solid rgba(51, 65, 85, 0.4)',
            padding: '20px',
            backdropFilter: 'blur(14px)',
          }}
        >
          {/* 子分頁 1: DRIP 複利滾雪球 */}
          {activeSubTab === 'DRIP' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                    📈 股息提領花掉 vs. DRIP 複利滾雪球 (30年雙軌軌跡)
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    翡翠綠實線為 DRIP 再投資；灰色虛線為領出花掉；綠色陰影代表複利為您多賺的超額財富
                  </span>
                </div>
              </div>

              <DRIPCompoundingChart data={dripProjection} />

              {/* 4 階里程碑階梯 */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>
                  🏆 被動收入自由度里程碑階梯
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {milestones.map((m) => (
                    <div
                      key={m.tierId}
                      style={{
                        background: m.isCurrentlyAchieved ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.5)',
                        border: `1px solid ${m.isCurrentlyAchieved ? 'rgba(16, 185, 129, 0.4)' : 'rgba(51, 65, 85, 0.4)'}`,
                        borderRadius: '10px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {m.isCurrentlyAchieved && <CheckCircle2 size={15} color="#10b981" />}
                        {m.tierName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0' }}>
                        月領 NT$ {m.monthlyTargetTwd.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '6px' }}>
                        {m.isCurrentlyAchieved ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>🟢 當前已達成！</span>
                        ) : m.achievedYearDRIP !== null ? (
                          <span style={{ color: '#38bdf8' }}>
                            第 {m.achievedYearDRIP} 年達標 {m.yearsSaved ? `(提早 ${m.yearsSaved}年)` : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>需更長年期累積</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 子分頁 2: 蒙地卡羅 FIRE 模擬 */}
          {activeSubTab === 'MONTE_CARLO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  🎲 蒙地卡羅 1,000 次隨機路徑資產錐形圖 (Fan Chart)
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  亮紫線為中位數 (P50)；深色帶為 50% 核心區間 (P25~P75)；淺色外圍為 80% 擴散區 (P10~P90)
                </span>
              </div>

              <MonteCarloFanChart tracks={monteCarloResult.percentileTracks} initialValue={initialNav} />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: 'rgba(30, 41, 59, 0.4)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}
              >
                <div>
                  30 年破產機率: <strong style={{ color: monteCarloResult.ruinProbability > 10 ? '#f87171' : '#10b981' }}>{monteCarloResult.ruinProbability}%</strong>
                </div>
                <div>
                  期末資產中位數: <strong style={{ color: '#818cf8' }}>NT$ {monteCarloResult.medianFinalNetWorthTwd.toLocaleString()}</strong>
                </div>
                <div>
                  前 10 年破產路徑數: <strong style={{ color: '#e2e8f0' }}>{monteCarloResult.runsExhaustedBeforeYear10} 條</strong>
                </div>
              </div>
            </div>
          )}

          {/* 子分頁 3: 定期定額 DCA 排程 */}
          {activeSubTab === 'DCA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  📅 未來 30 天定期定額約定扣款時序與防透支預警
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  逢週末或國定休市日自動順延至下一撮合日 ($T$ 日)，並精準推導交割扣款時序
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dcaSchedules.map((s, idx) => {
                  const forecast = overdraftForecasts[idx];
                  const isRisk = forecast?.isOverdraftRisk;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: isRisk ? 'rgba(239, 68, 68, 0.12)' : 'rgba(30, 41, 59, 0.4)',
                        border: `1px solid ${isRisk ? 'rgba(239, 68, 68, 0.35)' : 'rgba(51, 65, 85, 0.3)'}`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                          {s.symbol}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                          約定扣款日: 每月 {s.scheduledDay} 日 ➔ 撮合日: {s.date}{' '}
                          {s.isHolidayDeferred && <span style={{ color: '#fbbf24' }}> (休市順延)</span>}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '14px' }}>
                          NT$ {s.amountTwd.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: isRisk ? '#ef4444' : '#64748b' }}>
                          預計交割: {s.settlementDate}{' '}
                          {isRisk && <strong style={{ color: '#f87171' }}>⚠️ 恐透支缺口 {forecast.shortfallAmountTwd.toLocaleString()} 元</strong>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 右側參數微調控制台 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '16px',
            border: '1px solid rgba(51, 65, 85, 0.4)',
            padding: '20px',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: 600 }}>
            <Sliders size={18} color="#38bdf8" />
            <span>模擬器參數即時調節</span>
          </div>

          {/* 初始總資產 */}
          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              初始資產規模 (TWD)
            </label>
            <input
              type="number"
              value={initialNav}
              onChange={(e) => setInitialNav(Number(e.target.value))}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.6)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 每月定投加碼 */}
          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              每月定期定額 (TWD)
            </label>
            <input
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.6)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 股息殖利率 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>組合加權殖利率:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{(dividendYield * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.10"
              step="0.005"
              value={dividendYield}
              onChange={(e) => setDividendYield(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* 預期資本利得率 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>年化資本增值率:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{(capitalGrowthRate * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.12"
              step="0.005"
              value={capitalGrowthRate}
              onChange={(e) => setCapitalGrowthRate(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* 股息成長率 DGR */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>股息成長率 (DGR):</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>{(dgrRate * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.08"
              step="0.005"
              value={dgrRate}
              onChange={(e) => setDgrRate(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* 自訂月生活費目標 */}
          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              目標月生活費 (TWD)
            </label>
            <input
              type="number"
              value={customMonthlyExpense}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomMonthlyExpense(val);
                setAnnualExpenseTarget(val * 12);
              }}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.6)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 預測年期 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>模擬預測年期:</span>
              <span style={{ color: '#a78bfa', fontWeight: 600 }}>{yearsToProject} 年</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              step="5"
              value={yearsToProject}
              onChange={(e) => setYearsToProject(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* 蒙地卡羅期望年化報酬率 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>蒙地卡羅期望年化報酬:</span>
              <span style={{ color: '#818cf8', fontWeight: 600 }}>{(expectedReturn * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.03"
              max="0.15"
              step="0.005"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* 蒙地卡羅組合年化波動度 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>組合年化波動度:</span>
              <span style={{ color: '#f43f5e', fontWeight: 600 }}>{(volatility * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.30"
              step="0.01"
              value={volatility}
              onChange={(e) => setVolatility(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* 年通膨率 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>預估年通膨率:</span>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{(inflationRate * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.06"
              step="0.005"
              value={inflationRate}
              onChange={(e) => setInflationRate(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* 蒙地卡羅提領策略切換 */}
          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              退休提領策略
            </label>
            <select
              value={withdrawalStrategy}
              onChange={(e) => setWithdrawalStrategy(e.target.value as WithdrawalStrategyType)}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.6)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            >
              <option value="FIXED_PERCENT_INFLATION_ADJUSTED">經典 Trinity 4% 通膨調整</option>
              <option value="GUYTON_KLINGER_GUARDRAILS">Guyton-Klinger 動態護欄</option>
              <option value="DIVIDEND_ONLY_PRESERVATION">純股息本金保全 (0%破產)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
