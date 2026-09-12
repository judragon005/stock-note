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

export function getTrafficLightBadgeInfo(color: TrafficLightColor): {
  text: string;
  bgClass: string;
  dotClass: string;
} {
  switch (color) {
    case 'GREEN':
      return {
        text: '正常健全',
        bgClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
      };
    case 'YELLOW':
      return {
        text: '體質警戒',
        bgClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        dotClass: 'bg-amber-400',
      };
    case 'RED':
      return {
        text: '重大風險',
        bgClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        dotClass: 'bg-rose-400 animate-pulse',
      };
    case 'GRAY':
    default:
      return {
        text: '不適用',
        bgClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        dotClass: 'bg-slate-400',
      };
  }
}

export function getIndustryBadgeInfo(attr: IndustryAttribute): {
  label: string;
  exemptNote: string;
  badgeClass: string;
} {
  switch (attr) {
    case 'FINANCIALS':
      return {
        label: '🏦 金融保險業',
        exemptNote: '已啟用專業豁免模式（負債與存貨週轉不列入扣分）',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      };
    case 'CYCLICAL':
      return {
        label: '⚠️ 景氣循環股',
        exemptNote: '注意高獲利週期高點，謹防均值回歸估值陷阱',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    case 'STANDARD':
    default:
      return {
        label: '標準模型（製造/科技）',
        exemptNote: '',
        badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
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

  const gradeColor = getGradeColorClass(overallGrade);
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
    <div className="flex flex-col gap-4 p-4 md:p-6 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl">
      {/* 標題列與基本資訊 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white tracking-tight">{symbol}</span>
              <span className="text-lg text-slate-300 font-medium">{companyName}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                {latestPeriod}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${indInfo.badgeClass}`}>
                {indInfo.label}
              </span>
              {indInfo.exemptNote && (
                <span className="text-xs text-amber-400/90 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {indInfo.exemptNote}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 0~100 評分徽章 */}
        <div className="flex items-center gap-3">
          <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border ${gradeColor}`}>
            <span className="text-xs font-semibold uppercase tracking-wider">綜合評估</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl md:text-3xl font-black font-mono">{overallScore}</span>
              <span className="text-xs opacity-70">/ 100</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/20 mt-0.5">
              {overallGrade}
            </span>
          </div>
        </div>
      </div>

      {/* 0 秒操盤結論橫幅 (Executive Summary) */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/20 border border-blue-500/20 p-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-blue-300 mb-0.5">⚡ 0 秒核心操盤結論</div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {executiveSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 四大體質維度指示燈卡片 (2x2 or 4x1) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {lightCards.map((card, idx) => {
          const info = getTrafficLightBadgeInfo(card.color);
          const IconComponent = card.icon;
          return (
            <div
              key={idx}
              className="flex flex-col p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                  <IconComponent className="w-3.5 h-3.5 text-slate-300" />
                  <span>{card.title}</span>
                </div>
                <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${info.bgClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
                  <span className="font-semibold">{info.text}</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 line-clamp-1">{card.sub}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
