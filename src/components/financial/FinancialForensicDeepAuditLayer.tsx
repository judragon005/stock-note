import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  FileCheck,
  FileText,
  Copy,
  Check,
  Award,
} from 'lucide-react';
import type {
  FinancialForensicReport,
  ForensicAnomaly,
  AuditOpinionType,
} from '../../types/financialForensic';
import { isBigFourFirm } from '../../types/financialForensic';
import { generateFinancialForensicMarkdown } from '../../engine/financialReportPipeline';

export function getAnomalySeverityBadgeInfo(severity: ForensicAnomaly['severity']): {
  text: string;
  bgClass: string;
} {
  switch (severity) {
    case 'DANGEROUS':
      return {
        text: '🔴 高危警報',
        bgClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      };
    case 'WARNING':
    default:
      return {
        text: '🟡 關注警戒',
        bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
  }
}

export function getAuditOpinionBadgeInfo(opinion: AuditOpinionType): {
  text: string;
  isClean: boolean;
  colorClass: string;
} {
  switch (opinion) {
    case 'UNQUALIFIED':
      return {
        text: '無保留意見（標準無虞）',
        isClean: true,
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      };
    case 'QUALIFIED':
      return {
        text: '保留意見（存在爭端）',
        isClean: false,
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      };
    case 'ADVERSE':
      return {
        text: '否定意見（重大不實）',
        isClean: false,
        colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      };
    case 'DISCLAIMER':
      return {
        text: '無法表示意見（審計受阻）',
        isClean: false,
        colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      };
    default:
      return {
        text: '查核意見審核中',
        isClean: true,
        colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
      };
  }
}

interface FinancialForensicDeepAuditLayerProps {
  report: FinancialForensicReport;
}

export const FinancialForensicDeepAuditLayer: React.FC<FinancialForensicDeepAuditLayerProps> = ({
  report,
}) => {
  const [copied, setCopied] = useState(false);

  // 取得最新一季查核意見與事務所
  const latestRec = report.historicalRecords?.[0];
  const auditFirm = latestRec?.auditInfo?.cpaFirm || '勤業眾信聯合會計師事務所';
  const auditOpinion = latestRec?.auditInfo?.opinionType || 'UNQUALIFIED';
  const isBigFour = isBigFourFirm(auditFirm);
  const opinionInfo = getAuditOpinionBadgeInfo(auditOpinion);

  const handleCopyReport = async () => {
    try {
      const md = generateFinancialForensicMarkdown(report);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl">
      {/* 區塊標題與導出按鈕 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-white tracking-wide">
            「市場沒說什麼」深度鑑識與會計師查核
          </h3>
        </div>
        <button
          onClick={handleCopyReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '已複製 Markdown 研報' : '匯出/複製完整研報'}
        </button>
      </div>

      {/* 1. 「市場沒說什麼」排查卡片清單 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          <span>逆向鑑識排雷偵測（塞貨、假現金、借債配息、業外灌水、SBC 稀釋、審計風險）</span>
        </div>

        {report.anomalies.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-300">
                🟢 體質扎實無虞：未檢測出結構性背離警訊
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                本標的經「市場沒說什麼」六大逆向規則交叉檢驗，營收與應收存貨同步、營業現金流高於稅後淨利、股息發放純度高且未依賴舉債或業外美化。
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {report.anomalies.map((anom, idx) => {
              const sev = getAnomalySeverityBadgeInfo(anom.severity);
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      {anom.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sev.bgClass}`}>
                      {sev.text}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {anom.summary}
                  </p>
                  {anom.metrics && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(anom.metrics).map(([key, val]) => (
                        <span
                          key={key}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900/80 text-slate-400 border border-slate-800"
                        >
                          {key}: <strong className="text-slate-200">{val}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. 會計師查核意見卡片 */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">
            會計師獨立查核意見與防線檢視
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 查核意見 */}
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400">查核意見類型</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${opinionInfo.colorClass}`}>
                {opinionInfo.text}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              {opinionInfo.isClean
                ? '會計師認同財務報表公允表達，無保留意見。'
                : '注意！非無保留意見，需詳閱財務附註警訊。'}
            </span>
          </div>

          {/* 審計事務所 */}
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400">簽證會計師事務所</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-slate-200">{auditFirm}</span>
              {isBigFour && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                  <Award className="w-3 h-3" />
                  四大所 (Big 4)
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              {isBigFour
                ? '由全球四大 (Deloitte, PwC, EY, KPMG) 查核簽證，信譽最高。'
                : '非四大所查核，建議留意審計嚴謹度與關鍵查核事項。'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
