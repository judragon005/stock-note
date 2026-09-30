import React, { useState } from 'react';
import type { MainForceVerdictData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface MainForceVerdictCardProps {
  data?: MainForceVerdictData;
}

/**
 * 依據語意動作動詞取得視覺色彩
 */
export function getVerbBadgeColor(verb: string): { color: string; bg: string; border: string } {
  if (verb.includes('進貨') || verb.includes('加碼') || verb.includes('買')) {
    return {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
    };
  }
  if (verb.includes('調節') || verb.includes('減碼') || verb.includes('觀望')) {
    return {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
    };
  }
  if (verb.includes('賣壓') || verb.includes('撤退') || verb.includes('停損')) {
    return {
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.4)',
    };
  }
  return {
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.4)',
  };
}

export interface MetricCapsule {
  label: string;
  value: string;
  color?: string;
}

/**
 * 從 AI 結論文字中提取結構化量化數據指標
 */
export function parseVerdictMetrics(text: string): MetricCapsule[] {
  const metrics: MetricCapsule[] = [];

  // 法人累計匹配
  const instMatch = text.match(/法人近\s*5\s*日合計\s*([+-]?\d+)\s*張/);
  if (instMatch) {
    const val = Number(instMatch[1]);
    metrics.push({
      label: '5日法人合計',
      value: `${val > 0 ? '+' : ''}${val.toLocaleString()} 張`,
      color: val > 0 ? '#ef4444' : val < 0 ? '#10b981' : '#94a3b8',
    });
  }

  // VWAP 偏離匹配
  const vwapMatch = text.match(/VWAP\s*([+-]?\d+(?:\.\d+)?%)/i);
  if (vwapMatch) {
    const val = vwapMatch[1];
    const isPos = val.startsWith('+');
    metrics.push({
      label: '20日 VWAP 乖離',
      value: val,
      color: isPos ? '#f59e0b' : '#38bdf8',
    });
  }

  // RSI 匹配
  const rsiMatch = text.match(/RSI\s*(\d+(?:\.\d+)?)/i);
  if (rsiMatch) {
    metrics.push({
      label: 'RSI 強度',
      value: rsiMatch[1],
      color: '#38bdf8',
    });
  }

  return metrics;
}

export const MainForceVerdictCard: React.FC<MainForceVerdictCardProps> = ({ data }) => {
  const [showModal, setShowModal] = useState(false);

  const verb = data?.primaryVerb ?? '調節減碼';
  const tag = data?.semanticTag ?? '法人動作';
  const verdictText =
    data?.fullVerdictText ??
    'AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 -64 張、收盤相對 20 日 VWAP +7.5%、RSI 60），法人小幅調節，短線宜區間操作。';

  const verbStyle = getVerbBadgeColor(verb);
  const metricCapsules = parseVerdictMetrics(verdictText);

  return (
    <div
      data-testid="main-force-verdict-card"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '14px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxSizing: 'border-box',
        gap: '10px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        position: 'relative',
      }}
    >
      {/* 1. 頂部：標題與法人動作狀態徽章 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🔮</span>
          <TermTooltip termId="mlpSemanticVerdict">
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.2px', cursor: 'help' }}>
              18 主力追蹤總評判 <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>(MLP-AI)</span>
            </h3>
          </TermTooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowModal(!showModal)}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tag}
          </button>
          <MoreVertical size={14} style={{ color: '#64748b', cursor: 'pointer' }} />
        </div>
      </div>

      {/* 2. 中部：核心主力語意發光看板 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '10px',
          border: `1px solid ${verbStyle.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TermTooltip termId="mlpSemanticVerdict">
            <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 700, cursor: 'help' }}>主力核心語意</span>
          </TermTooltip>
          <TermTooltip termId="mlpSemanticVerdict">
            <span
              style={{
                fontSize: '22px',
                fontWeight: 900,
                color: verbStyle.color,
                letterSpacing: '1px',
                textShadow: `0 0 16px ${verbStyle.color}60`,
                cursor: 'help',
              }}
            >
              {verb}
            </span>
          </TermTooltip>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: verbStyle.color,
              boxShadow: `0 0 8px ${verbStyle.color}`,
            }}
          />
          <span style={{ fontSize: '11px', color: verbStyle.color, fontWeight: 700 }}>
            {verb.includes('進貨') || verb.includes('買') ? '偏多集結' : verb.includes('調節') ? '區間警戒' : '防禦觀望'}
          </span>
        </div>
      </div>

      {/* 3. 底層：結構化關鍵指標膠囊 + 完整 AI 論述 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {metricCapsules.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {metricCapsules.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: '#94a3b8' }}>{m.label}:</span>
                <span style={{ color: m.color || '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <TermTooltip termId="mlpSemanticVerdict">
          <div
            style={{
              fontSize: '12px',
              lineHeight: 1.6,
              color: '#cbd5e1',
              padding: '10px 12px',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              cursor: 'help',
            }}
          >
            {verdictText}
          </div>
        </TermTooltip>
      </div>

      {/* 法人動作彈窗 / 浮層 */}
      {showModal && (
        <div
          data-testid="verdict-details-modal"
          style={{
            position: 'absolute',
            top: '52px',
            right: '20px',
            zIndex: 30,
            width: '280px',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '12px', color: '#f8fafc' }}>法人歷程明細速查</strong>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
            本判定由 MLP 類神經網絡綜合近 20 日主力籌碼、VWAP 價差、三大法人買賣超與盤中即時大單綜合合成。
          </p>
        </div>
      )}
    </div>
  );
};

export default MainForceVerdictCard;
