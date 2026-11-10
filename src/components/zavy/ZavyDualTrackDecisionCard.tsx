import React, { useState } from 'react';
import { Target } from 'lucide-react';
import { TrackADecision, TrackBDecision } from '../../types/zavySlowWealth';

interface ZavyDualTrackDecisionCardProps {
  trackA: TrackADecision;
  trackB: TrackBDecision;
  onUpdateTolerance?: (tolerance: number) => void;
}

export const ZavyDualTrackDecisionCard: React.FC<ZavyDualTrackDecisionCardProps> = ({
  trackA,
  trackB,
  onUpdateTolerance: _onUpdateTolerance,
}) => {
  const [activeTab, setActiveTab] = useState<'TRACK_A' | 'TRACK_B'>('TRACK_A');

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20} color="#f59e0b" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
            鏡頭三：「見自己」A/B 雙軌決策與個人風險預算
          </h3>
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
                個人風險預算上限 (回撤 ÷ 壓力跌幅)
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
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
                {trackA.finalSuggestedEquityExposurePercent}%
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{trackA.recommendedActionSummary}</div>
            </div>
          </div>

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
              🌊 四階減碼瀑布流 (落實存量保護 · 優先砍凹單/衛星)
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
          {/* 大類資產比重卡 */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #1e293b',
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
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>純政府公債</div>
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

          {/* 股息活水轉向與 30x FIRE 狀態 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                padding: '14px 16px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '6px' }}>
                💧 股息活水轉向再平衡 (Dividend-Redirect)
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {trackB.dividendRedirectPlanSummary}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                padding: '14px 16px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', marginBottom: '6px' }}>
                🏖️ 慢富 30x 本金與 Coast-FIRE
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                30 倍年支出達成率：<strong>{trackB.fire30xStatus.currentProgressPercent}%</strong>
                <br />
                Coast-FIRE 提早滾存門檻：
                <span style={{ color: trackB.fire30xStatus.isCoastFireAchieved ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {trackB.fire30xStatus.isCoastFireAchieved ? '【已達標】無需額外投入即可依靠複利長大' : '【進行中】繼續累積本金'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

