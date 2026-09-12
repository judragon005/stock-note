import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Activity,
  Coins,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import type {
  FinancialForensicReport,
  TrafficLightColor,
  FinancialHealthGrade,
  IndustryAttribute,
} from '../../types/financialForensic';

export function getGradeColorClass(grade: FinancialHealthGrade): string {
  switch (grade) {
    case 'EXCELLENT':
      return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    case 'HEALTHY':
      return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    case 'WARNING':
      return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    case 'DANGEROUS':
      return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    default:
      return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
  }
}

export function getGradeInlineStyle(grade: FinancialHealthGrade): {
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  switch (grade) {
    case 'EXCELLENT':
      return {
        color: '#34d399',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
      };
    case 'HEALTHY':
      return {
        color: '#60a5fa',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderColor: 'rgba(59, 130, 246, 0.35)',
      };
    case 'WARNING':
      return {
        color: '#fbbf24',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      };
    case 'DANGEROUS':
      return {
        color: '#fb7185',
        backgroundColor: 'rgba(244, 63, 94, 0.12)',
        borderColor: 'rgba(244, 63, 94, 0.35)',
      };
    default:
      return {
        color: '#94a3b8',
        backgroundColor: 'rgba(100, 116, 139, 0.12)',
        borderColor: 'rgba(100, 116, 139, 0.35)',
      };
  }
}

export function getTrafficLightBadgeInfo(color: TrafficLightColor): {
  text: string;
  bgClass: string;
  dotClass: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  switch (color) {
    case 'GREEN':
      return {
        text: '正常健全',
        bgClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
        color: '#6ee7b7',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
      };
    case 'YELLOW':
      return {
        text: '體質警戒',
        bgClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        dotClass: 'bg-amber-400',
        color: '#fcd34d',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      };
    case 'RED':
      return {
        text: '重大風險',
        bgClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        dotClass: 'bg-rose-400 animate-pulse',
        color: '#fda4af',
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.35)',
      };
    case 'GRAY':
    default:
      return {
        text: '不適用',
        bgClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        dotClass: 'bg-slate-400',
        color: '#94a3b8',
        backgroundColor: 'rgba(100, 116, 139, 0.15)',
        borderColor: 'rgba(100, 116, 139, 0.35)',
      };
  }
}

export function getIndustryBadgeInfo(attr: IndustryAttribute): {
  label: string;
  exemptNote: string;
  badgeClass: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  switch (attr) {
    case 'FINANCIALS':
      return {
        label: '🏦 金融保險業',
        exemptNote: '已啟用專業豁免模式（負債與存貨週轉不列入扣分）',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        color: '#a5b4fc',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 0.4)',
      };
    case 'CYCLICAL':
      return {
        label: '⚠️ 景氣循環股',
        exemptNote: '注意高獲利週期高點，謹防均值回歸估值陷阱',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        color: '#fde047',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
      };
    case 'STANDARD':
    default:
      return {
        label: '標準模型（製造/科技）',
        exemptNote: '',
        badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
        color: '#cbd5e1',
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
        borderColor: 'rgba(71, 85, 105, 0.6)',
      };
  }
}

interface FinancialHeroLayerProps {
  report: FinancialForensicReport;
}

export const FinancialHeroLayer: React.FC<FinancialHeroLayerProps> = ({ report }) => {
  const {
    symbol,
    companyName,
    latestPeriod,
    overallScore,
    overallGrade,
    trafficLights,
    executiveSummary,
    industryAttribute,
  } = report;

  const gradeStyle = getGradeInlineStyle(overallGrade);
  const indInfo = getIndustryBadgeInfo(industryAttribute);

  const lightCards = [
    {
      title: '獲利能力',
      sub: '三率走勢與 ROE',
      color: trafficLights.profitability,
      icon: TrendingUp,
    },
    {
      title: '安全性與償債',
      sub: '速動比與真實淨現金',
      color: trafficLights.safety,
      icon: ShieldCheck,
    },
    {
      title: '營運效率',
      sub: '收帳與存貨 CCC 週期',
      color: trafficLights.efficiency,
      icon: Activity,
    },
    {
      title: '現金流健康',
      sub: '本業營運造血與 FCF',
      color: trafficLights.cashFlow,
      icon: Coins,
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: '14px',
        border: '1px solid rgba(51, 65, 85, 0.6)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* 標題列與基本資訊 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          paddingBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                {symbol}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#cbd5e1' }}>
                {companyName}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(51, 65, 85, 0.6)',
                  color: '#94a3b8',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                }}
              >
                {latestPeriod}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: `1px solid ${indInfo.borderColor}`,
                  backgroundColor: indInfo.backgroundColor,
                  color: indInfo.color,
                  fontWeight: 600,
                }}
              >
                {indInfo.label}
              </span>
              {indInfo.exemptNote && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertTriangle style={{ width: '13px', height: '13px' }} />
                  {indInfo.exemptNote}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 0~100 評分徽章 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              borderRadius: '12px',
              border: `1px solid ${gradeStyle.borderColor}`,
              backgroundColor: gradeStyle.backgroundColor,
              color: gradeStyle.color,
              minWidth: '100px',
            }}
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              綜合評估
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'monospace' }}>
                {overallScore}
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>/ 100</span>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                marginTop: '2px',
              }}
            >
              {overallGrade}
            </span>
          </div>
        </div>
      </div>

      {/* 0 秒操盤結論橫幅 (Executive Summary) */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '10px',
          background: 'linear-gradient(90deg, rgba(30, 58, 138, 0.35) 0%, rgba(49, 46, 129, 0.25) 50%, rgba(88, 28, 135, 0.15) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <ShieldAlert style={{ width: '18px', height: '18px', color: '#60a5fa', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#93c5fd', marginBottom: '3px' }}>
              ⚡ 0 秒核心操盤結論
            </div>
            <p style={{ fontSize: '0.88rem', color: '#f1f5f9', lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
              {executiveSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 四大體質維度指示燈卡片 (2x2 or 4x1) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {lightCards.map((card, idx) => {
          const info = getTrafficLightBadgeInfo(card.color);
          const IconComponent = card.icon;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>
                  <IconComponent style={{ width: '14px', height: '14px', color: '#cbd5e1' }} />
                  <span>{card.title}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: `1px solid ${info.borderColor}`,
                    backgroundColor: info.backgroundColor,
                    color: info.color,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      backgroundColor: info.color,
                    }}
                  />
                  <span>{info.text}</span>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{card.sub}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
