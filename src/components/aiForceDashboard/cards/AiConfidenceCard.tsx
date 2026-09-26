import React from 'react';
import type { AiConfidenceData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface AiConfidenceCardProps {
  data?: AiConfidenceData;
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
  const overall = data?.overallConfidence ?? 47;
  const accuracy = data?.modelAccuracy ?? 32;
  const completeness = data?.dataCompleteness ?? 100;
  const stability = data?.signalStability ?? 80;
  const applicability = data?.strategyApplicability ?? 44;

  const grade = calculateConfidenceGrade(overall);

  const bars = [
    { label: 'AI CONFIDENCE', percent: overall, color: '#38bdf8', termId: 'aiConfidence' },
    { label: '模型準確度', percent: accuracy, color: '#38bdf8' },
    { label: '資料完整度', percent: completeness, color: '#38bdf8' },
    { label: '經驗穩定度', percent: stability, color: '#38bdf8' },
    { label: '策略適用度', percent: applicability, color: '#38bdf8' },
  ];

  return (
    <div
      data-testid="ai-confidence-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(20, 30, 52, 0.78) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 頂部標題與選單 */}
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
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.72rem',
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
        <button
          type="button"
          aria-label="選項"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* 5 條水平進度條 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '2px 0' }}>
        {bars.map((item) => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
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
          fontSize: '11px',
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
