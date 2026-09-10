import React, { useMemo } from 'react';
import { TradeRecord, HoldingPosition } from '../types/stock';
import { calculateBehavioralAuditReport } from '../engine/behavioralAuditEngine';
import { BehavioralAuditReport } from '../types/behavioralAudit';

export interface BehavioralAuditWorkspaceProps {
  trades: TradeRecord[];
  holdings: HoldingPosition[];
  averageNAV?: number;
}

export const BehavioralAuditWorkspace: React.FC<BehavioralAuditWorkspaceProps> = ({
  trades,
  holdings,
  averageNAV = 1000000,
}) => {
  const report: BehavioralAuditReport = useMemo(() => {
    return calculateBehavioralAuditReport(trades, holdings, averageNAV);
  }, [trades, holdings, averageNAV]);

  const { disposition, fomo, friction, actionableInsights } = report;

  const severityBadgeColor =
    disposition.severity === 'SEVERE'
      ? '#ef4444'
      : disposition.severity === 'MODERATE'
      ? '#f59e0b'
      : '#10b981';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* 頂部標題與介紹 */}
      <div
        className="glass-card"
        style={{
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-card, #1e293b)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🧠</span>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
              交易行為心理學與情緒偏誤量化覆盤
            </h2>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            量化檢驗「處置效應（賺錢抱不住、賠錢死命抱）」、「FOMO 追高情緒進場」與「摩擦成本侵蝕」，打造客觀反省鏡
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>心理偏誤綜合等級</div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: severityBadgeColor,
              marginTop: '4px',
            }}
          >
            {disposition.severity === 'SEVERE' ? '🚨 嚴重處置效應' : disposition.severity === 'MODERATE' ? '⚠️ 輕度偏誤' : '✅ 心理素質健康'}
          </div>
        </div>
      </div>

      {/* 三大量化卡片 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* 卡片 1：處置效應 (Disposition Effect) */}
        <div
          className="glass-card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${severityBadgeColor}44`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>
              ⚖️ 處置效應 (持有天數對比)
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: `${severityBadgeColor}22`,
                color: severityBadgeColor,
              }}
            >
              偏誤比 {disposition.holdingDaysBiasRatio.toFixed(1)}x
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#34d399' }}>🟢 獲利部位平均持有</span>
                <strong>{disposition.avgHoldingDaysGain.toFixed(1)} 天</strong>
              </div>
              <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (disposition.avgHoldingDaysGain / 60) * 100)}%`,
                    height: '100%',
                    backgroundColor: '#10b981',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#f87171' }}>🔴 虧損部位平均抱牢</span>
                <strong>{disposition.avgHoldingDaysLoss.toFixed(1)} 天</strong>
              </div>
              <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (disposition.avgHoldingDaysLoss / 60) * 100)}%`,
                    height: '100%',
                    backgroundColor: '#ef4444',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
            {disposition.diagnosisText}
          </p>
        </div>

        {/* 卡片 2：FOMO 追高情緒進場審計 */}
        <div
          className="glass-card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>
              🚀 FOMO 追高勝率審計
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
              }}
            >
              買進總筆數 {fomo.totalBuyTradesCount} 筆
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <div style={{ fontSize: '11px', color: '#f87171' }}>追高勝率</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>
                {fomo.chasingHighWinRate.toFixed(1)}%
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <div style={{ fontSize: '11px', color: '#34d399' }}>冷靜進場勝率</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                {fomo.calmEntryWinRate.toFixed(1)}%
              </div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
            因衝動追高導致之預期勝率折損：
            <strong style={{ color: '#ef4444', marginLeft: '4px' }}>
              -{fomo.alphaDragPercentage.toFixed(1)}%
            </strong>
            。逢高爆量進場往往承擔了過高回撤風險。
          </p>
        </div>

        {/* 卡片 3：週轉與摩擦成本侵蝕率 */}
        <div
          className="glass-card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>
              💸 換手摩擦稅費侵蝕
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
              }}
            >
              年化拖累率 {friction.annualizedDragRatePercent.toFixed(2)}%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>累計手續費支出:</span>
            <strong style={{ color: '#e2e8f0' }}>NT$ {friction.totalFeesPaid.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>累計證券交易稅:</span>
            <strong style={{ color: '#e2e8f0' }}>NT$ {friction.totalTaxesPaid.toLocaleString()}</strong>
          </div>

          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '12px',
              color: '#cbd5e1',
            }}
          >
            總摩擦成本支出：<strong>NT$ {friction.totalFrictionCost.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* 動態客觀交易紀律建議卡片 */}
      <div
        className="glass-card"
        style={{
          padding: '22px',
          borderRadius: '16px',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: '#60a5fa' }}>
          💡 AI 客觀交易紀律覆盤建議 (Actionable Insights)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {actionableInsights.map((insight, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '13px',
                color: '#e2e8f0',
                lineHeight: 1.6,
              }}
            >
              {insight}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
