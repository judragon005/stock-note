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

import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseDayTradeRisk, diagnoseHealthScore } from '../../../constants/aiForceGlossary';

export interface DecisionBannerStyle {
  text: string;
  icon: string;
  color: string;
  bg: string;
  borderColor: string;
  glow: string;
}

/**
 * 依據決策結果、趨勢、健康度與隔日沖風險判定頂部橫幅樣式 (Spec 0148 Ticket 02)
 */
export function getDecisionBannerStyle(
  warningBadgeText?: string,
  trendJudgement?: string,
  chipHealthScore?: number,
  dayTradeRiskPercent?: number
): DecisionBannerStyle {
  const textUpper = (warningBadgeText || '').toUpperCase();
  const trend = trendJudgement || '';
  const health = chipHealthScore ?? 55;
  const risk = dayTradeRiskPercent ?? 50;

  // 1. 多頭優質評判
  const isBull =
    textUpper.includes('BULLISH') ||
    textUpper.includes('OPTIMAL') ||
    ((trend.includes('多頭') || trend.includes('偏多')) && health >= 70 && risk < 40);

  if (isBull) {
    return {
      text: warningBadgeText && !textUpper.includes('WARNING') ? warningBadgeText : 'AI BULLISH',
      icon: '🚀',
      color: '#34d399',
      bg: 'rgba(16, 185, 129, 0.18)',
      borderColor: 'rgba(16, 185, 129, 0.45)',
      glow: '0 0 10px rgba(16, 185, 129, 0.2)',
    };
  }

  // 2. 警戒防禦評判
  const isWarning =
    textUpper.includes('WARNING') ||
    textUpper.includes('DEFENSE') ||
    trend.includes('偏空') ||
    trend.includes('空頭') ||
    health < 50 ||
    risk >= 60;

  if (isWarning) {
    return {
      text: warningBadgeText || 'AI WARNING',
      icon: '⚠️',
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.18)',
      borderColor: 'rgba(239, 68, 68, 0.45)',
      glow: '0 0 10px rgba(239, 68, 68, 0.2)',
    };
  }

  // 3. 中性平衡評判 (Fallback)
  return {
    text: warningBadgeText || 'AI BALANCED',
    icon: '⚡',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    glow: '0 0 10px rgba(56, 189, 248, 0.2)',
  };
}

/**
 * 格式化支撐/壓力價位區間字串
 */
export function formatPriceRange(range?: [number, number], separator: string = ' ~ '): string {
  if (!range || !Array.isArray(range) || range.length < 2 || range[0] === undefined || range[1] === undefined) {
    return '資料計算中';
  }
  const [p1, p2] = range;
  const f1 = p1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f2 = p2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${f1}${separator}${f2}`;
}

export interface AiDecisionCoreCardProps {
  data: DecisionCoreData;
}

export const AiDecisionCoreCard: React.FC<AiDecisionCoreCardProps> = ({ data }) => {
  const trendStyle = getTrendBadgeStyle(data.trendJudgement || '中性偏多');
  const riskBadge = getRiskBadgeStyle(data.dayTradeRiskPercent ?? 50);
  const healthBadge = getHealthScoreStyle(data.chipHealthScore ?? 55);
  const bannerStyle = getDecisionBannerStyle(
    data.warningBadgeText,
    data.trendJudgement,
    data.chipHealthScore,
    data.dayTradeRiskPercent
  );

  const items = [
    {
      label: '趨勢判斷',
      termId: 'decisionTrend',
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
      termId: 'shortTermState',
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
      termId: 'mainForceAction',
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
      termId: 'chipStructure',
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
      termId: 'dayTradeRisk',
      dynamicDiagnosis: diagnoseDayTradeRisk(data.dayTradeRiskPercent ?? 53, 50),
      icon: '⚠️',
      badge: {
        text: `${data.dayTradeRiskPercent ?? 53}%`,
        color: riskBadge.color,
        bg: riskBadge.bg,
        border: riskBadge.color + '55',
      },
    },
    {
      label: '籌碼健康度',
      termId: 'chipsHealth',
      dynamicDiagnosis: diagnoseHealthScore(data.chipHealthScore ?? 55),
      icon: '🩺',
      badge: {
        text: `${data.chipHealthScore ?? 55}分 (${data.chipHealthLabel || healthBadge.status})`,
        color: healthBadge.color,
        bg: healthBadge.bg,
        border: healthBadge.color + '55',
      },
    },
    {
      label: '支撐區間',
      termId: 'supportLevel',
      icon: '🛡️',
      value: formatPriceRange(data.supportRange, ' / '),
      valueColor: '#38bdf8',
    },
    {
      label: '壓力區間',
      termId: 'highResistance',
      icon: '⚔️',
      value: formatPriceRange(data.resistanceRange, ' / '),
      valueColor: '#ef4444',
    },
    {
      label: '風險等級',
      termId: 'volatilityRisk',
      icon: '⏱️',
      value: data.riskHorizonDays ? `${data.riskHorizonDays.replace('個', '級')}日` : '1 ~ 4 級交易日',
      valueColor: '#f8fafc',
    },
  ];

  return (
    <div
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
      {/* 頂部標題與右上選單 */}
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
            02
          </span>
          <TermTooltip termId="decisionTrend" showIcon={true}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              AI 決策核心
            </span>
          </TermTooltip>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            | AI DECISION CORE
          </span>
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

      {/* AI 決策核心自適應橫幅 (Spec 0148 Ticket 02: 支援多頭綠標/中性藍標/警戒紅標) */}
      <div
        data-testid="decision-core-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '8px',
          background: bannerStyle.bg,
          border: `1px solid ${bannerStyle.borderColor}`,
          color: bannerStyle.color,
          fontSize: '0.78rem',
          fontWeight: 800,
          letterSpacing: '0.04em',
          marginBottom: data.settlementNotice ? '6px' : '10px',
          boxShadow: bannerStyle.glow,
          transition: 'all 0.25s ease',
        }}
      >
        <span>{bannerStyle.icon}</span>
        <span>{bannerStyle.text}</span>
      </div>

      {/* 盤中未結算安全定錨警示條 (Spec 0150) */}
      {data.settlementNotice && (
        <div
          data-testid="decision-core-settlement-notice"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            fontSize: '0.68rem',
            lineHeight: 1.35,
            fontWeight: 600,
            marginBottom: '10px',
          }}
        >
          <span>{data.settlementNotice}</span>
        </div>
      )}

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
              <TermTooltip termId={item.termId} dynamicDiagnosis={item.dynamicDiagnosis}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                  {item.label}
                </span>
              </TermTooltip>
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
