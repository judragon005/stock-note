import React from 'react';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';
import {
  MultiHorizonMarketBreadth,
  MarginDeleveragingStatus,
  CycleCoupledBreadthInterpretation,
  BottomingChecklistResult,
} from '../../types/zavySlowWealth';
import { TermTooltip } from '../common/TermTooltip';
import { ZAVY_SLOW_WEALTH_GLOSSARY } from '../../constants/zavyGlossary';

interface ZavyMarketBreadthCardProps {
  breadth: MultiHorizonMarketBreadth;
  marginStatus: MarginDeleveragingStatus;
  interpretation: CycleCoupledBreadthInterpretation;
  bottomingChecklist: BottomingChecklistResult;
}

export const ZavyMarketBreadthCard: React.FC<ZavyMarketBreadthCardProps> = ({
  breadth,
  marginStatus,
  interpretation,
  bottomingChecklist,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="#10b981" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
            鏡頭二：台美市場結構、多週期寬度與融資去槓桿 (Market Breadth)
          </h3>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          基準日：{breadth.asOfDate}
        </div>
      </div>

      {/* 20/60/200MA 市場寬度進度條 */}
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
            <TermTooltip
              entry={ZAVY_SLOW_WEALTH_GLOSSARY.B01_multiHorizonBreadth}
              dynamicDiagnosis={`${interpretation.interpretationHeadline}：${interpretation.actionGuidance}`}
              showIcon
            >
              台股全市場均線站上比例 (扣除殭屍股，共 {breadth.totalFilteredStocks} 檔)
            </TermTooltip>
          </span>
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: interpretation.isOversoldOpportuneBuy
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(59, 130, 246, 0.15)',
              color: interpretation.isOversoldOpportuneBuy ? '#10b981' : '#60a5fa',
              fontWeight: 600,
            }}
          >
            {interpretation.interpretationHeadline}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* 20MA */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>20MA (短線情緒)</span>
              <span style={{ fontWeight: 600, color: breadth.breadth20 < 20 ? '#10b981' : '#f8fafc' }}>
                {breadth.breadth20.toFixed(1)}% {breadth.breadth20 < 20 ? '(超賣買點)' : ''}
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, breadth.breadth20)}%`,
                  backgroundColor: breadth.breadth20 < 20 ? '#10b981' : '#38bdf8',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          {/* 60MA */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>60MA (季線波段)</span>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{breadth.breadth60.toFixed(1)}%</span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, breadth.breadth60)}%`,
                  backgroundColor: '#60a5fa',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          {/* 200MA */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>200MA (年線大趨勢)</span>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{breadth.breadth200.toFixed(1)}%</span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, breadth.breadth200)}%`,
                  backgroundColor: '#a855f7',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        </div>

        {/* 反恐慌定心丸與操作指引 */}
        <div
          style={{
            fontSize: '13px',
            color: '#cbd5e1',
            lineHeight: '1.5',
            marginTop: '4px',
            padding: interpretation.isOversoldOpportuneBuy ? '10px 12px' : '0',
            borderRadius: '8px',
            backgroundColor: interpretation.isOversoldOpportuneBuy
              ? 'rgba(16, 185, 129, 0.1)'
              : 'transparent',
            borderLeft: interpretation.isOversoldOpportuneBuy
              ? '3px solid #10b981'
              : 'none',
          }}
        >
          {interpretation.isOversoldOpportuneBuy && (
            <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
              🛡️ 慢富定心丸（波浪回檔黃金買點 · 切勿恐慌砍在阿呆谷）
            </div>
          )}
          💡 <strong>操作指引：</strong>{interpretation.actionGuidance}
        </div>

        {/* 十年線鈍化閘門與長線防禦錨點 */}
        <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TermTooltip
            entry={ZAVY_SLOW_WEALTH_GLOSSARY.B02_decadeMaInvalidationGate}
            dynamicDiagnosis={`目前長線防禦錨點：${interpretation.fallbackIndicator}`}
            showIcon
          >
            <span>🔍 長線防禦錨點與十年線鈍化閘門：{interpretation.fallbackIndicator}</span>
          </TermTooltip>
        </div>
      </div>

      {/* 融資去槓桿與落底核對表雙欄 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {/* 融資去槓桿比率 */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #1e293b',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
            <TermTooltip
              entry={ZAVY_SLOW_WEALTH_GLOSSARY.B03_marginDeleveragingRatio}
              dynamicDiagnosis={marginStatus.statusText}
              showIcon
            >
              📉 融資去槓桿比率 (Deleveraging Ratio)
            </TermTooltip>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: marginStatus.isDeleveragingSufficient ? '#10b981' : '#f59e0b' }}>
              {marginStatus.marginDeleveragingRatio}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              門檻 &ge; 1.0 ({marginStatus.isDeleveragingSufficient ? '清洗充分' : '浮額待沉澱'})
            </span>
          </div>
          {/* 大盤回撤 vs 融資減幅雙數據膠囊 */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '11px' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
              }}
            >
              大盤回撤 {marginStatus.indexDrawdownPercent.toFixed(1)}%
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: marginStatus.isDeleveragingSufficient ? '#10b981' : '#fbbf24',
              }}
            >
              融資減幅 {marginStatus.marginDrawdownPercent.toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
            {marginStatus.statusText}
          </div>
        </div>

        {/* 落底核對表 */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                <TermTooltip
                  entry={ZAVY_SLOW_WEALTH_GLOSSARY.B04_bottomingChecklist}
                  dynamicDiagnosis={bottomingChecklist.guidanceText}
                  showIcon
                >
                  🔍 中期修正落底核對表
                </TermTooltip>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: bottomingChecklist.satisfiedCount >= 3 ? '#10b981' : '#f59e0b',
                }}
              >
                就緒度 {bottomingChecklist.bottomingReadinessScore}%
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bottomingChecklist.checklist.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  {item.isSatisfied ? (
                    <CheckCircle2 size={14} color="#10b981" />
                  ) : (
                    <XCircle size={14} color="#64748b" />
                  )}
                  <span style={{ color: item.isSatisfied ? '#f1f5f9' : '#94a3b8' }}>
                    {item.label}：{item.actualValueDescription}{' '}
                    <span style={{ color: '#64748b', fontSize: '11px' }}>
                      (門檻：{item.thresholdDescription})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              fontSize: '12px',
              color: bottomingChecklist.satisfiedCount >= 3 ? '#34d399' : '#cbd5e1',
              paddingTop: '8px',
              borderTop: '1px solid #1e293b',
              lineHeight: '1.45',
            }}
          >
            🎯 <strong>落底結論：</strong>{bottomingChecklist.guidanceText}
          </div>
        </div>
      </div>
    </div>
  );
};
