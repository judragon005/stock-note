import React from 'react';
import { DecisionCoreData } from '../../../types/aiForceDashboard';

export interface BadgeStyle {
  color: string;
  bg: string;
  borderColor: string;
}

/**
 * 依據趨勢文字回傳對應的視覺色彩
 */
export function getTrendBadgeStyle(trend: string): BadgeStyle {
  if (trend.includes('強烈多頭') || trend.includes('偏多') || trend.includes('多頭')) {
    const isStrong = trend.includes('強烈');
    return {
      color: isStrong ? '#10b981' : '#34d399',
      bg: isStrong ? 'rgba(16, 185, 129, 0.2)' : 'rgba(52, 211, 153, 0.15)',
      borderColor: isStrong ? 'rgba(16, 185, 129, 0.4)' : 'rgba(52, 211, 153, 0.3)',
    };
  }
  if (trend.includes('偏空') || trend.includes('空頭') || trend.includes('弱勢')) {
    return {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.18)',
      borderColor: 'rgba(239, 68, 68, 0.35)',
    };
  }
  return {
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.16)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
  };
}

export interface RiskBadgeResult {
  level: '高' | '中' | '低';
  color: string;
  bg: string;
}

/**
 * 依據隔日沖風險百分比回傳等級與色彩
 */
export function getRiskBadgeStyle(percent: number): RiskBadgeResult {
  if (percent >= 60) {
    return { level: '高', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' };
  }
  if (percent >= 40) {
    return { level: '中', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' };
  }
  return { level: '低', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' };
}

export interface HealthScoreResult {
  status: '良好' | '普通' | '偏弱';
  color: string;
  bg: string;
}

/**
 * 依據健康度分數回傳評估狀態與色彩
 */
export function getHealthScoreStyle(score: number): HealthScoreResult {
  if (score >= 70) {
    return { status: '良好', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' };
  }
  if (score >= 50) {
    return { status: '普通', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)' };
  }
  return { status: '偏弱', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' };
}

/**
 * 格式化支撐/壓力價位區間字串
 */
export function formatPriceRange(range?: [number, number]): string {
  if (!range || !Array.isArray(range) || range.length < 2 || range[0] === undefined || range[1] === undefined) {
    return '資料計算中';
  }
  const [p1, p2] = range;
  const f1 = p1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f2 = p2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${f1} ~ ${f2}`;
}

export interface AiDecisionCoreCardProps {
  data: DecisionCoreData;
}

export const AiDecisionCoreCard: React.FC<AiDecisionCoreCardProps> = ({ data }) => {
  const trendStyle = getTrendBadgeStyle(data.trendJudgement || '中性偏多');
  const riskBadge = getRiskBadgeStyle(data.dayTradeRiskPercent ?? 50);
  const healthBadge = getHealthScoreStyle(data.chipHealthScore ?? 55);

  const items = [
    {
      label: '趨勢判斷',
      icon: '🧭',
      badge: {
        text: data.trendJudgement || '中性偏多',
        color: trendStyle.color,
        bg: trendStyle.bg,
        border: trendStyle.borderColor,
      },
    },
    {
      label: '短線狀態',
      icon: '⚡',
      badge: {
        text: data.shortTermState || '區間震盪',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.16)',
        border: 'rgba(56, 189, 248, 0.3)',
      },
    },
    {
      label: '主力行為',
      icon: '🏛️',
      badge: {
        text: data.mainForceAction || '調節減碼',
        color: data.mainForceAction?.includes('進貨') || data.mainForceAction?.includes('吸籌') ? '#10b981' : '#f97316',
        bg: data.mainForceAction?.includes('進貨') || data.mainForceAction?.includes('吸籌') ? 'rgba(16, 185, 129, 0.18)' : 'rgba(249, 115, 22, 0.18)',
        border: 'rgba(249, 115, 22, 0.35)',
      },
    },
    {
      label: '籌碼結構',
      icon: '📊',
      badge: {
        text: data.chipStructure || '中性',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.15)',
        border: 'rgba(148, 163, 184, 0.3)',
      },
    },
    {
      label: '隔日沖風險',
      icon: '⚠️',
      badge: {
        text: `${data.dayTradeRiskPercent}% (${riskBadge.level})`,
        color: riskBadge.color,
        bg: riskBadge.bg,
        border: riskBadge.color + '55',
      },
    },
    {
      label: '籌碼健康度',
      icon: '🩺',
      badge: {
        text: `${data.chipHealthScore}分 (${data.chipHealthLabel || healthBadge.status})`,
        color: healthBadge.color,
        bg: healthBadge.bg,
        border: healthBadge.color + '55',
      },
    },
    {
      label: '支撐區間',
      icon: '🛡️',
      value: formatPriceRange(data.supportRange),
      valueColor: '#38bdf8',
    },
    {
      label: '壓力區間',
      icon: '⚔️',
      value: formatPriceRange(data.resistanceRange),
      valueColor: '#ef4444',
    },
    {
      label: '風險監控期',
      icon: '⏱️',
      value: data.riskHorizonDays || '1~4 個交易日',
      valueColor: '#f8fafc',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(20, 30, 52, 0.78) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 標題與 AI WARNING 警示列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            02
          </span>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
            AI 決策核心
          </span>
        </div>

        {/* AI WARNING 呼吸光警示徽章 */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '999px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            color: '#fbbf24',
            fontSize: '0.74rem',
            fontWeight: 700,
            boxShadow: '0 0 10px rgba(245, 158, 11, 0.25)',
          }}
        >
          <span style={{ fontSize: '0.78rem' }}>⚠️</span>
          <span>{data.warningBadgeText || 'AI WARNING'}</span>
        </div>
      </div>

      {/* 9 大核心指標項目清單 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flex: 1,
          justifyContent: 'space-around',
        }}
      >
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'background 0.2s ease',
            }}
          >
            {/* 左側名稱與圖示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ fontSize: '0.85rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                {item.label}
              </span>
            </div>

            {/* 右側徽章或數值 */}
            {item.badge ? (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '5px',
                  background: item.badge.bg,
                  color: item.badge.color,
                  border: `1px solid ${item.badge.border}`,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {item.badge.text}
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: item.valueColor || '#f8fafc',
                }}
              >
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
