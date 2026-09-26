import React, { useState } from 'react';
import type { MainForceVerdictData } from '../../../types/aiForceDashboard';

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

export const MainForceVerdictCard: React.FC<MainForceVerdictCardProps> = ({ data }) => {
  const [showModal, setShowModal] = useState(false);

  const verb = data?.primaryVerb ?? '調節減碼';
  const tag = data?.semanticTag ?? '法人動作';
  const verdictText =
    data?.fullVerdictText ??
    'AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 -64 張、收盤相對 20 日 VWAP +7.5%、RSI 60），法人小幅調節，短線宜區間操作。';

  const verbStyle = getVerbBadgeColor(verb);

  return (
    <div
      data-testid="main-force-verdict-card"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '14px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        position: 'relative',
      }}
    >
      {/* 頂部標題與法人動作按鈕 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🔮</span>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.2px' }}>
            18 主力追蹤總評判 (MLP-AI)
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(!showModal)}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{tag}</span>
          <span style={{ fontSize: '10px' }}>▾</span>
        </button>
      </div>

      {/* 醒目超大字核心語意看板 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>主力語意：</span>
        <span
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: verbStyle.color,
            padding: '2px 14px',
            borderRadius: '8px',
            backgroundColor: verbStyle.bg,
            border: `1px solid ${verbStyle.border}`,
            letterSpacing: '1px',
            textShadow: `0 0 16px ${verbStyle.color}60`,
          }}
        >
          {verb}
        </span>
      </div>

      {/* 完整 AI 研判結論文字 */}
      <div
        style={{
          fontSize: '13px',
          lineHeight: 1.7,
          color: '#cbd5e1',
          padding: '12px 14px',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '8px',
          borderLeft: `3px solid ${verbStyle.color}`,
        }}
      >
        {verdictText}
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
