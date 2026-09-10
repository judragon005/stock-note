import React from 'react';
import { LookThroughExposure } from '../types/lookThrough';

export interface LookThroughDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exposure: LookThroughExposure | null;
}

export const LookThroughDetailModal: React.FC<LookThroughDetailModalProps> = ({
  isOpen,
  onClose,
  exposure,
}) => {
  if (!isOpen || !exposure) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '90%',
          maxWidth: '560px',
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card, #1e293b)',
          color: 'var(--text-main, #f8fafc)',
          borderRadius: '16px',
          border: exposure.isConcentrationAlert
            ? '2px solid rgba(245, 158, 11, 0.8)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          padding: '24px',
          boxShadow: exposure.isConcentrationAlert
            ? '0 0 25px rgba(245, 158, 11, 0.3)'
            : '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部 Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800 }}>{exposure.symbol}</span>
              <span style={{ fontSize: '15px', color: '#94a3b8' }}>{exposure.name}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                {exposure.sector}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              市場：{exposure.market === 'TW' ? '🇹🇼 台股市場' : '🇺🇸 美股市場'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* 集中度超標警示 */}
        {exposure.isConcentrationAlert && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              marginBottom: '18px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ fontSize: '13px', color: '#fcd34d' }}>
              <strong>單一標的實質穿透集中度過高警告</strong>：該公司佔您整戶投資組合高達{' '}
              <strong>{exposure.portfolioWeightPercent.toFixed(1)}%</strong>（超過 25% 建議風控上限）。
            </div>
          </div>
        )}

        {/* 核心曝險彙總數據 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>實質穿透總曝險市值</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#f8fafc' }}>
              NT$ {Math.round(exposure.totalEffectiveValue).toLocaleString()}
            </div>
          </div>
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>整戶淨資產 (NAV) 佔比</div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                marginTop: '4px',
                color: exposure.isConcentrationAlert ? '#f59e0b' : '#38bdf8',
              }}
            >
              {exposure.portfolioWeightPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* 持有來源拆解 */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#cbd5e1' }}>
            持有結構拆解 (直接買進 vs ETF 間接持有)
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 直接買進 */}
            {exposure.directMarketValue > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>🎯 直接持有 (現股/個股買進)</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    佔本公司總曝險 {((exposure.directMarketValue / exposure.totalEffectiveValue) * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#60a5fa' }}>
                  NT$ {Math.round(exposure.directMarketValue).toLocaleString()}
                </div>
              </div>
            )}

            {/* 來自各 ETF 的貢獻 */}
            {exposure.derivedSources.map((src) => (
              <div
                key={src.etfSymbol}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    📦 來自 {src.etfSymbol} ({src.etfName})
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    成分權重: {src.weightInETF.toFixed(1)}% · 佔本公司曝險{' '}
                    {((src.indirectValue / exposure.totalEffectiveValue) * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#cbd5e1' }}>
                  NT$ {Math.round(src.indirectValue).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部關閉按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
