import React from 'react';
import type { AiConfidenceData } from '../../../types/aiForceDashboard';
import type { ColorThemeMode, MarketType } from '../../../types/stock';
import { TermTooltip } from '../../common/TermTooltip';

export interface AiConfidenceCardProps {
  data?: AiConfidenceData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

/**
 * 依據綜合信心指數計算等級與配色
 */
export function calculateConfidenceGrade(score: number): { label: string; color: string; bg: string } {
  if (score >= 70) {
    return { label: '高信心', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
  }
  if (score >= 50) {
    return { label: '中信心', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
  }
  if (score >= 35) {
    return { label: '一般信心', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
  }
  return { label: '偏低警示', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
}

export const AiConfidenceCard: React.FC<AiConfidenceCardProps> = ({ data }) => {
  const clampPct = (v?: number, fallback: number = 0) =>
    Math.max(0, Math.min(100, Number.isFinite(v) ? (v as number) : fallback));

  const overall = clampPct(data?.overallConfidence, 0);
  const accuracy = clampPct(data?.modelAccuracy, 0);
  const completeness = clampPct(data?.dataCompleteness, 0);
  const stability = clampPct(data?.signalStability, 0);
  const applicability = clampPct(data?.strategyApplicability, 0);

  const grade = calculateConfidenceGrade(overall);

  const bars = [
    { label: 'AI CONFIDENCE', percent: overall, color: '#38bdf8', termId: 'aiConfidence' },
    { label: '模型準確度', percent: accuracy, color: '#38bdf8', termId: 'aiConfidence' },
    { label: '資料完整度', percent: completeness, color: '#38bdf8', termId: 'aiConfidence' },
    { label: '訊號穩定度', percent: stability, color: '#38bdf8', termId: 'aiConfidence' },
    { label: '策略適用度', percent: applicability, color: '#38bdf8', termId: 'aiConfidence' },
  ];

  return (
    <div
      data-testid="ai-confidence-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '14px',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 28, 0.92) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 頂部標題 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '5px',
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            14
          </span>
          <TermTooltip termId="aiConfidence">
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', cursor: 'help' }}>
              AI 信心維度
            </span>
          </TermTooltip>
        </div>
      </div>

      {/* 5 條水平進度條 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', padding: '4px 0', flex: 1, justifyContent: 'center' }}>
        {bars.map((item) => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              {item.termId ? (
                <TermTooltip termId={item.termId}>
                  <span style={{ color: '#94a3b8', cursor: 'help' }}>{item.label}</span>
                </TermTooltip>
              ) : (
                <span style={{ color: '#94a3b8' }}>{item.label}</span>
              )}
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{item.percent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#0f172a',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${item.percent}%`,
                  height: '100%',
                  backgroundColor: item.color,
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 底部說明 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#94a3b8',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <TermTooltip termId="aiConfidence">
          <span style={{ cursor: 'help' }}>多特徵模型信任係數</span>
        </TermTooltip>
        <TermTooltip termId="aiConfidence">
          <strong style={{ color: grade.color, fontWeight: 600, cursor: 'help' }}>{overall}% 綜合信心</strong>
        </TermTooltip>
      </div>
    </div>
  );
};

export default AiConfidenceCard;
