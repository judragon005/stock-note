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
    directive,
    industryAttribute,
    historicalRecords = [],
    duPont,
  } = report;

  const gradeStyle = getGradeInlineStyle(overallGrade);
  const indInfo = getIndustryBadgeInfo(industryAttribute);

  // 提取最新一季數據
  const latestRec = historicalRecords.length > 0 ? historicalRecords[historicalRecords.length - 1] : null;

  // 1. 獲利能力數據
  const grossMarginStr = latestRec && latestRec.income.revenue > 0
    ? `${((latestRec.income.grossProfit / latestRec.income.revenue) * 100).toFixed(1)}%`
    : '-';
  const roeStr = duPont?.roe != null ? `${duPont.roe.toFixed(1)}%` : '-';
  const netMarginStr = latestRec && latestRec.income.revenue > 0
    ? `${((latestRec.income.netIncome / latestRec.income.revenue) * 100).toFixed(1)}%`
    : '-';

  // 2. 安全性與償債數據
  const debtRatioStr = latestRec && latestRec.balanceSheet.totalAssets > 0
    ? `${((latestRec.balanceSheet.totalLiabilities / latestRec.balanceSheet.totalAssets) * 100).toFixed(1)}%`
    : '-';
  const quickRatioStr = latestRec && latestRec.balanceSheet.totalLiabilities > 0
    ? `${(((latestRec.balanceSheet.cashAndEquivalents + latestRec.balanceSheet.accountsReceivable) / latestRec.balanceSheet.totalLiabilities) * 100).toFixed(0)}%`
    : '-';
  const totalDebt = (latestRec?.balanceSheet.shortTermDebt || 0) + (latestRec?.balanceSheet.longTermDebt || 0);
  const netCashAmount = latestRec ? latestRec.balanceSheet.cashAndEquivalents - totalDebt : 0;
  const netCashStr = latestRec ? `${(netCashAmount / 1e8).toFixed(1)}億` : '-';

  // 3. 營運效率數據
  const dsoStr = latestRec && latestRec.income.revenue > 0
    ? `${Math.round((latestRec.balanceSheet.accountsReceivable / latestRec.income.revenue) * 90)}天`
    : '-';
  const cogs = latestRec ? latestRec.income.revenue - latestRec.income.grossProfit : 0;
  const dioStr = latestRec && cogs > 0
    ? `${Math.round((latestRec.balanceSheet.inventory / cogs) * 90)}天`
    : '-';

  // 4. 現金流健康數據
  const cfoAmount = latestRec?.cashFlow?.operatingCashFlow ?? 0;
  const cfoStr = latestRec ? `${(cfoAmount / 1e8).toFixed(1)}億` : '-';
  const capexAmount = latestRec?.cashFlow?.capitalExpenditure ?? 0;
  const fcfAmount = cfoAmount - capexAmount;
  const fcfStr = latestRec ? `${(fcfAmount / 1e8).toFixed(1)}億` : '-';

  const lightCards = [
    {
      title: '獲利能力',
      sub: '三率走勢與 ROE',
      color: trafficLights.profitability,
      icon: TrendingUp,
      metrics: [
        { label: '毛利率', value: grossMarginStr },
        { label: 'ROE', value: roeStr },
        { label: '淨利率', value: netMarginStr },
      ],
    },
    {
      title: '安全性與償債',
      sub: '速動比與真實淨現金',
      color: trafficLights.safety,
      icon: ShieldCheck,
      metrics: [
        { label: '負債比', value: debtRatioStr },
        { label: '速動比', value: quickRatioStr },
        { label: '淨現金', value: netCashStr },
      ],
    },
    {
      title: '營運效率',
      sub: '收帳與存貨 CCC 週期',
      color: trafficLights.efficiency,
      icon: Activity,
      metrics: [
        { label: '應收天數(DSO)', value: dsoStr },
        { label: '存貨天數(DIO)', value: industryAttribute === 'FINANCIALS' ? '豁免' : dioStr },
      ],
    },
    {
      title: '現金流健康',
      sub: '本業營運造血與 FCF',
      color: trafficLights.cashFlow,
      icon: Coins,
      metrics: [
        { label: '營運現金流(CFO)', value: cfoStr },
        { label: '自由現金流(FCF)', value: fcfStr },
      ],
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

      {/* 0 秒操盤結論橫幅 (Executive Summary & Action Directive) */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(30, 58, 138, 0.35) 0%, rgba(49, 46, 129, 0.25) 50%, rgba(88, 28, 135, 0.2) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert style={{ width: '20px', height: '20px', color: '#60a5fa', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#93c5fd', letterSpacing: '0.05em' }}>
              ⚡ 0 秒核心操盤結論
            </span>
          </div>

          {directive?.stanceLabel && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '9999px',
                backgroundColor: directive.stance === 'STRONG_BUY_AND_HOLD'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : directive.stance === 'HIGH_RISK_TRIM'
                  ? 'rgba(244, 63, 94, 0.25)'
                  : 'rgba(245, 158, 11, 0.2)',
                color: directive.stance === 'STRONG_BUY_AND_HOLD'
                  ? '#34d399'
                  : directive.stance === 'HIGH_RISK_TRIM'
                  ? '#fb7185'
                  : '#fbbf24',
                border: '1px solid currentColor',
              }}
            >
              {directive.stanceLabel}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '0.92rem', color: '#f8fafc', lineHeight: 1.6, fontWeight: 600, margin: 0 }}>
            {executiveSummary}
          </p>

          {directive?.conflictSummary && (
            <div
              style={{
                fontSize: '0.82rem',
                color: '#e2e8f0',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                padding: '8px 12px',
                borderRadius: '6px',
                borderLeft: '3px solid #f59e0b',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: '#fbbf24', fontWeight: 700, marginRight: '4px' }}>⚠️ 核心矛盾：</span>
              {directive.conflictSummary}
            </div>
          )}

          {directive?.actionGuidance && (
            <div
              style={{
                fontSize: '0.82rem',
                color: '#e2e8f0',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                padding: '8px 12px',
                borderRadius: '6px',
                borderLeft: '3px solid #38bdf8',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: '4px' }}>🎯 操盤方針：</span>
              {directive.actionGuidance}
            </div>
          )}
        </div>
      </div>

      {/* 四大體質維度指示燈卡片 (內嵌最新關鍵數字) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
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
                gap: '8px',
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

              {/* 核心關鍵指標數值膠囊 */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  marginTop: '2px',
                }}
              >
                {card.metrics.map((m, mIdx) => (
                  <div key={mIdx} style={{ fontSize: '0.72rem', display: 'flex', gap: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>{m.label}:</span>
                    <span style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace' }}>{m.value}</span>
                    {mIdx < card.metrics.length - 1 && <span style={{ color: '#475569', marginLeft: '2px' }}>|</span>}
                  </div>
                ))}
              </div>

              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{card.sub}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
