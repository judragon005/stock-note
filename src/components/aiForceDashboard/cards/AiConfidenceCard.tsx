import React from 'react';
import type { AiConfidenceData } from '../../../types/aiForceDashboard';

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
    { label: 'AI CONFIDENCE', percent: overall, color: '#38bdf8' },
    { label: '模型準確度', percent: accuracy, color: '#f59e0b' },
    { label: '資料完整度', percent: completeness, color: '#10b981' },
    { label: '訊號穩定度', percent: stability, color: '#8b5cf6' },
    { label: '策略適用度', percent: applicability, color: '#ec4899' },
  ];

  return (
    <div
      data-testid="ai-confidence-card"
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* 標題與等級標籤 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🎯</span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            14 AI 信心維度
          </h3>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: grade.bg,
            color: grade.color,
            fontWeight: 600,
            border: `1px solid ${grade.color}40`,
          }}
        >
          {grade.label} ({overall}%)
        </span>
      </div>

      {/* 5 條水平進度條 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '2px 0' }}>
        {bars.map((item) => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#94a3b8' }}>{item.label}</span>
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
        <span>多特徵模型信任係數</span>
        <strong style={{ color: grade.color, fontWeight: 600 }}>{overall}% 綜合信心</strong>
      </div>
    </div>
  );
};

export default AiConfidenceCard;
