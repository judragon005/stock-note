import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  FileCheck,
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
import { logger } from '../../utils/logger';

export function getAnomalySeverityBadgeInfo(severity: ForensicAnomaly['severity']): {
  text: string;
  bgClass: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  switch (severity) {
    case 'DANGEROUS':
      return {
        text: '🔴 高危警報',
        bgClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        color: '#fb7185',
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.35)',
      };
    case 'WARNING':
    default:
      return {
        text: '🟡 關注警戒',
        bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        color: '#fbbf24',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      };
  }
}

export function getAuditOpinionBadgeInfo(opinion: AuditOpinionType): {
  text: string;
  isClean: boolean;
  colorClass: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  switch (opinion) {
    case 'UNQUALIFIED':
      return {
        text: '無保留意見（標準無虞）',
        isClean: true,
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        color: '#34d399',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
      };
    case 'QUALIFIED':
      return {
        text: '保留意見（存在爭端）',
        isClean: false,
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        color: '#fbbf24',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      };
    case 'ADVERSE':
      return {
        text: '否定意見（重大不實）',
        isClean: false,
        colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        color: '#fb7185',
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.35)',
      };
    case 'DISCLAIMER':
      return {
        text: '無法表示意見（審計受阻）',
        isClean: false,
        colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        color: '#fb7185',
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.35)',
      };
    default:
      return {
        text: '查核意見審核中',
        isClean: true,
        colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        color: '#94a3b8',
        backgroundColor: 'rgba(100, 116, 139, 0.15)',
        borderColor: 'rgba(100, 116, 139, 0.35)',
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
    } catch (e) {
      logger.error('Failed to copy report:', e);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '20px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: '14px',
        border: '1px solid rgba(51, 65, 85, 0.6)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* 頂部標題與複製戰報按鈕 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck style={{ width: '20px', height: '20px', color: '#6ee7b7' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em', margin: 0 }}>
            「市場沒說什麼」逆向鑑識與獨立會計師防線
          </h3>
        </div>

        <button
          onClick={handleCopyReport}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(51, 65, 85, 0.6)',
            border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(100, 116, 139, 0.4)',
            color: copied ? '#34d399' : '#cbd5e1',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="複製 Markdown 格式財報鑑識完整報告"
        >
          {copied ? (
            <>
              <Check style={{ width: '13px', height: '13px', color: '#34d399' }} />
              <span>已複製戰報</span>
            </>
          ) : (
            <>
              <Copy style={{ width: '13px', height: '13px' }} />
              <span>複製 Markdown 鑑識戰報</span>
            </>
          )}
        </button>
      </div>

      {/* 1. 會計師查核意見與四大事務所防禦標章 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileCheck style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
            會計師查核防線與意見認證 (Audit Opinion Defense)
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              簽證事務所：<strong style={{ color: '#ffffff' }}>{auditFirm}</strong>
            </span>
            {isBigFour ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#a5b4fc',
                  fontWeight: 700,
                }}
              >
                <Award style={{ width: '12px', height: '12px' }} />
                四大標章 (Big Four)
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  fontWeight: 700,
                }}
              >
                ⚠️ 非四大獨立事務所
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              padding: '3px 10px',
              borderRadius: '9999px',
              border: `1px solid ${opinionInfo.borderColor}`,
              backgroundColor: opinionInfo.backgroundColor,
              color: opinionInfo.color,
              fontWeight: 700,
            }}
          >
            {opinionInfo.text}
          </div>
        </div>
      </div>

      {/* 2. 「市場沒說什麼」六大逆向背離排雷清單 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertOctagon style={{ width: '16px', height: '16px', color: '#fb7185' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
              逆向背離與財務粉飾防雷雷達 ({report.anomalies.length} 項警示)
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            塞貨 ｜ 假獲利 ｜ 借債配息 ｜ 存貨減損
          </span>
        </div>

        {report.anomalies.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.anomalies.map((ano, idx) => {
              const sev = getAnomalySeverityBadgeInfo(ano.severity);
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${sev.borderColor}`,
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle style={{ width: '14px', height: '14px', color: sev.color }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                        {ano.title}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        border: `1px solid ${sev.borderColor}`,
                        backgroundColor: sev.backgroundColor,
                        color: sev.color,
                        fontWeight: 700,
                      }}
                    >
                      {sev.text}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                    {ano.summary}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '24px 0',
              color: '#34d399',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <ShieldCheck style={{ width: '18px', height: '18px' }} />
            <span>近 8 季未偵測到重大逆向財務背離或粉飾異常，體質安全健康</span>
          </div>
        )}
      </div>
    </div>
  );
};
