import React, { useState } from 'react';
import { Target, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { TrackADecision, TrackBDecision } from '../../types/zavySlowWealth';
import { TermTooltip } from '../common/TermTooltip';
import { ZAVY_SLOW_WEALTH_GLOSSARY } from '../../constants/zavyGlossary';

interface ZavyDualTrackDecisionCardProps {
  trackA: TrackADecision;
  trackB: TrackBDecision;
  onUpdateTolerance?: (tolerance: number) => void;
  initialActiveTab?: 'TRACK_A' | 'TRACK_B';
}

const TOLERANCE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 10, label: '10% 保守' },
  { value: 15, label: '15% 穩健' },
  { value: 20, label: '20% 平衡' },
  { value: 25, label: '25% 積極' },
  { value: 30, label: '30% 進取' },
];

export const ZavyDualTrackDecisionCard: React.FC<ZavyDualTrackDecisionCardProps> = ({
  trackA,
  trackB,
  onUpdateTolerance,
  initialActiveTab = 'TRACK_A',
}) => {
  const [activeTab, setActiveTab] = useState<'TRACK_A' | 'TRACK_B'>(initialActiveTab);

  const currentEquity = trackA.currentEquityWeightPercent;
  const isOverweight =
    typeof currentEquity === 'number' &&
    currentEquity > trackA.finalSuggestedEquityExposurePercent;

  const hasNonPureArmor =
    trackB.currentAssetAllocation.corpBondPercent > 0 ||
    trackB.currentAssetAllocation.reitsPercent > 0;

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* 標題與分頁切換 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
              <TermTooltip entry={ZAVY_SLOW_WEALTH_GLOSSARY.T01_dualTrackKnowYourself} showIcon>
                鏡頭三：「見自己」A/B 雙軌決策與個人風險預算
              </TermTooltip>
            </h3>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            🧭 <strong>見自己選軌指引</strong>：願意看週期調節部位者選 <strong>A 軌</strong>；不想擇時、追求存量不動與睡得著覺者選 <strong>B 軌</strong>。
          </div>
        </div>

        <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('TRACK_A')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'TRACK_A' ? '#f59e0b' : 'transparent',
              color: activeTab === 'TRACK_A' ? '#0f172a' : '#94a3b8',
            }}
          >
            A 軌：週期波段調節 (市場紀要)
          </button>
          <button
            onClick={() => setActiveTab('TRACK_B')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'TRACK_B' ? '#10b981' : 'transparent',
              color: activeTab === 'TRACK_B' ? '#ffffff' : '#94a3b8',
            }}
          >
            B 軌：慢富多資產配置 (再平衡)
          </button>
        </div>
      </div>

      {/* A 軌內容 */}
      {activeTab === 'TRACK_A' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 5 檔個人最大帳面耐受回撤互動選擇器 */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '10px',
              padding: '10px 14px',
              border: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              🎚️ <strong>個人最大可承受總資產帳面回撤</strong>（假設壓力情境股市大跌 {trackA.stressScenarioDrawdownPercent}%）：
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TOLERANCE_OPTIONS.map((opt) => {
                const isSelected = trackA.maxDrawdownTolerancePercent === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateTolerance?.(opt.value)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                      color: isSelected ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 曝險與風險預算試算框 */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #1e293b',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                製造業週期建議水位
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                {trackA.recommendedEquityWeightRange[0]}% ~ {trackA.recommendedEquityWeightRange[1]}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>週期基準中位數 {trackA.recommendedEquityWeightMid}%</div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                <TermTooltip entry={ZAVY_SLOW_WEALTH_GLOSSARY.T02_personalRiskBudget} showIcon>
                  個人風險預算上限 (回撤 ÷ 壓力跌幅)
                </TermTooltip>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>
                {trackA.riskBudgetMaxEquityExposurePercent}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                耐受回撤 {trackA.maxDrawdownTolerancePercent}% / 壓力跌幅 {trackA.stressScenarioDrawdownPercent}%
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #334155', paddingLeft: '14px' }}>
              <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>
                🎯 最終建議持股上限 (取交集極小值)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
                  {trackA.finalSuggestedEquityExposurePercent}%
                </div>
                {typeof currentEquity === 'number' && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: isOverweight
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                      color: isOverweight ? '#f87171' : '#34d399',
                    }}
                  >
                    當前實際持股 {currentEquity}% ({isOverweight ? '超配需降檔' : '安全範圍內'})
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                {trackA.recommendedActionSummary}
              </div>
            </div>
          </div>

          {/* 負債即負向債券：質押優先償還建議橫幅 */}
          {trackA.debtRepaymentSummary && (
            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>
                <TermTooltip entry={ZAVY_SLOW_WEALTH_GLOSSARY.T03_debtAsNegativeBond} showIcon>
                  ⛓️ 負債即負向債券：質押借款優先降槓桿建議
                </TermTooltip>
              </div>
              <div style={{ fontSize: '12px', color: '#fde68a', lineHeight: '1.5' }}>
                {trackA.debtRepaymentSummary}
              </div>
            </div>
          )}

          {/* 四階減碼瀑布流 */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '10px' }}>
              <TermTooltip entry={ZAVY_SLOW_WEALTH_GLOSSARY.T04_fourTierSellWaterfall} showIcon>
                🌊 四階減碼瀑布流 (落實存量保護 · 優先砍凹單/衛星)
              </TermTooltip>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', fontSize: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b' }}>
                <div style={{ color: '#f87171', fontWeight: 600, marginBottom: '4px' }}>Tier 1 波段/投機個股 (優先)</div>
                <div style={{ color: '#cbd5e1' }}>{trackA.sellWaterfallPreview.tier1SellCandidates.join('、') || '無持倉'}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b' }}>
                <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '4px' }}>Tier 2 主題型/次核心 ETF</div>
                <div style={{ color: '#cbd5e1' }}>{trackA.sellWaterfallPreview.tier2SellCandidates.join('、') || '無持倉'}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b' }}>
                <div style={{ color: '#34d399', fontWeight: 600, marginBottom: '4px' }}>Tier 3 高股息 ETF (存量不動)</div>
                <div style={{ color: '#cbd5e1' }}>{trackA.sellWaterfallPreview.tier3PreservedCandidates.join('、') || '無持倉'}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b' }}>
                <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: '4px' }}>Tier 4 核心底倉 (最後防線)</div>
                <div style={{ color: '#cbd5e1' }}>{trackA.sellWaterfallPreview.tier4CoreHoldings.join('、') || '無持倉'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B 軌內容 */}
      {activeTab === 'TRACK_B' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 再平衡偏離警示或均衡狀態列 */}
          <div
            style={{
              backgroundColor: trackB.isRebalanceRecommended
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${
                trackB.isRebalanceRecommended
                  ? 'rgba(245, 158, 11, 0.4)'
                  : 'rgba(16, 185, 129, 0.35)'
              }`,
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: trackB.isRebalanceRecommended ? '#fde68a' : '#a7f3d0',
            }}
          >
            {trackB.isRebalanceRecommended ? (
              <ShieldAlert size={16} color="#f59e0b" />
            ) : (
              <CheckCircle2 size={16} color="#10b981" />
            )}
            <span>
              <strong>
                {trackB.isRebalanceRecommended ? '⚠️ 已觸發 ±5% 再平衡門檻：' : '✅ 資產配置均衡：'}
              </strong>
              {trackB.rebalanceTriggerReason || '各大類資產比重皆在 ±5% 容忍帶內，維持存量不動即可。'}
            </span>
          </div>

          {/* 大類資產比重卡 */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>股票資產</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                  {trackB.currentAssetAllocation.equityPercent}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>目標 {trackB.targetAllocation.equityPercent}%</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  <TermTooltip entry={ZAVY_SLOW_WEALTH_GLOSSARY.T05_trueDefensiveArmor} showIcon>
                    純政府公債 (真防彈衣)
                  </TermTooltip>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>
                  {trackB.currentAssetAllocation.govBondPercent}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>目標 {trackB.targetAllocation.govBondPercent}%</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>黃金儲備</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24' }}>
                  {trackB.currentAssetAllocation.goldPercent}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>目標 {trackB.targetAllocation.goldPercent}%</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>現金儲備</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7' }}>
                  {trackB.currentAssetAllocation.cashPercent}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>目標 {trackB.targetAllocation.cashPercent}%</div>
              </div>
            </div>

            {/* 真假防彈衣警示：若持有公司債或 REITs */}
            {hasNonPureArmor && (
              <div
                style={{
                  borderTop: '1px solid #1e293b',
                  paddingTop: '10px',
                  fontSize: '12px',
                  color: '#fbbf24',
                }}
              >
                🛡️ <strong>真假防彈衣識別</strong>：偵測到非純公債部位（公司債 {trackB.currentAssetAllocation.corpBondPercent}% / REITs {trackB.currentAssetAllocation.reitsPercent}%）。公司債與高收益債含信用利差風險，股市崩盤時常同步下跌，不計入純公債防彈衣額度。
              </div>
            )}
          </div>

          {/* 股息活水轉向與 30x FIRE + SRR 順序風險狀態 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                padding: '14px 16px',
                border: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                <TermTooltip entry={ZAVY_SLOW_WEALTH_GLOSSARY.T06_dividendRedirectRebalance} showIcon>
                  💧 股息活水轉向再平衡 (Dividend-Redirect)
                </TermTooltip>
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {trackB.dividendRedirectPlanSummary}
              </div>
              {trackB.dividendRedirectDetails && trackB.dividendRedirectDetails.length > 0 && (
                <div
                  style={{
                    marginTop: '4px',
                    paddingTop: '8px',
                    borderTop: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12px',
                  }}
                >
                  {trackB.dividendRedirectDetails.map((detail, idx) => (
                    <div
                      key={idx}
                      style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}
                    >
                      <span>• {detail.targetCategory} ({detail.allocationPercent}%)</span>
                      <strong style={{ color: '#38bdf8' }}>
                        NT$ {detail.amountTwd.toLocaleString()}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                padding: '14px 16px',
                border: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
                <TermTooltip entry={ZAVY_SLOW_WEALTH_GLOSSARY.T07_fire30xAndCoastFire} showIcon>
                  🏖️ 慢富 30x 本金與 Coast-FIRE
                </TermTooltip>
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                30 倍年支出目標本金：<strong>NT$ {trackB.fire30xStatus.targetCapital30xTwd.toLocaleString()}</strong>
                （達成率 <strong>{trackB.fire30xStatus.currentProgressPercent}%</strong>）
                <br />
                Coast-FIRE 提早滾存門檻：
                <span style={{ color: trackB.fire30xStatus.isCoastFireAchieved ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {trackB.fire30xStatus.isCoastFireAchieved ? '【已達標】無需額外投入即可依靠複利長大' : '【進行中】繼續累積本金'}
                </span>
              </div>

              {/* SRR 報酬順序風險防彈衣保護力對比 */}
              {typeof trackB.equityOnlyExhaustionRate === 'number' &&
                typeof trackB.shieldedExhaustionRate === 'number' && (
                  <div
                    style={{
                      marginTop: '4px',
                      paddingTop: '8px',
                      borderTop: '1px solid #1e293b',
                      fontSize: '12px',
                      color: '#94a3b8',
                      lineHeight: '1.5',
                    }}
                  >
                    <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '2px' }}>
                      <TermTooltip entry={ZAVY_SLOW_WEALTH_GLOSSARY.T08_sequenceOfReturnsRisk} showIcon>
                        🛡️ 報酬順序風險 (SRR) 防彈衣保護實證
                      </TermTooltip>
                    </div>
                    <div>
                      退休前 10 年耗盡率：純股組合 <strong style={{ color: '#f87171' }}>{trackB.equityOnlyExhaustionRate}%</strong> ➔ 股債金防彈衣組合 <strong style={{ color: '#10b981' }}>{trackB.shieldedExhaustionRate}%</strong>
                      {typeof trackB.srrRiskReductionPercent === 'number' && (
                        <span>（降低破產風險 <strong>{trackB.srrRiskReductionPercent}%</strong>）</span>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
