import React, { useState } from 'react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import type { AiMorningBriefDirective } from '../../types/macro';
import type { MarketType } from '../../types/stock';

export interface WarRoomMorningBriefCardProps {
  morningBrief: AiMorningBriefDirective;
  asOfDate: string;
  holdingSymbols?: Array<{ symbol: string; market: MarketType }>;
  onInspectTechnical?: (symbol: string, market: MarketType) => void;
  onOpenTradeModal?: (symbol: string, market: MarketType) => void;
  privacyMode?: boolean;
}

const maskMoneyInText = (text: string, privacyMode: boolean): string =>
  privacyMode ? text.replace(/NT\$\s?[\d,]+/g, 'NT$******') : text;

export const WarRoomMorningBriefCard: React.FC<WarRoomMorningBriefCardProps> = ({
  morningBrief,
  asOfDate,
  holdingSymbols = [],
  onInspectTechnical,
  onOpenTradeModal,
  privacyMode = false,
}) => {
  const [showDetailedDiagnosis, setShowDetailedDiagnosis] = useState(false);

  const toneColor =
    morningBrief.tone === 'DEFENSIVE'
      ? 'var(--loss-color)'
      : morningBrief.tone === 'OPPORTUNISTIC'
        ? 'var(--gain-color)'
        : morningBrief.tone === 'CAUTION'
          ? '#fbbf24'
          : '#38bdf8';

  return (
    <div
      className="card"
      style={{
        padding: '18px 22px',
        marginBottom: '18px',
        border: `1px solid ${morningBrief.tone === 'DEFENSIVE' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.22)'}`,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.72))',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            className="badge"
            style={{
              background: 'rgba(245, 158, 11, 0.16)',
              color: 'var(--accent-amber)',
              fontSize: '0.74rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Zap size={13} />
            AI 晨報作戰方針
          </span>
          <span style={{ fontSize: '1.22rem', fontWeight: 800, color: toneColor }}>
            {morningBrief.headline}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowDetailedDiagnosis((v) => !v)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.74rem', padding: '4px 10px', border: '1px solid rgba(148, 163, 184, 0.25)' }}
          >
            {showDetailedDiagnosis ? '▲ 收合詳細診斷文字' : '▼ 展開詳細診斷文字'}
          </button>
          <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            基準日：{asOfDate}
          </span>
        </div>
      </div>

      {/* 核心方針 */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(51, 65, 85, 0.55)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '14px',
          lineHeight: 1.55,
          fontSize: '0.88rem',
          color: 'var(--text-primary)',
        }}
      >
        💡 <strong>核心方針：</strong>
        {maskMoneyInText(morningBrief.summary, privacyMode)}
      </div>

      {/* 預設收合的長篇宏觀 / 防護盾診斷文字 */}
      {showDetailedDiagnosis && (
        <div className="warroom-grid-2" style={{ marginBottom: '14px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} />
              宏觀環境診斷
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {morningBrief.macroDiagnosis}
            </p>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} />
              個人防護盾體質診斷
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {maskMoneyInText(morningBrief.shieldDiagnosis, privacyMode)}
            </p>
          </div>
        </div>
      )}

      {/* 可互動之今日客觀紀律執行清單 */}
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          📋 今日客觀紀律執行清單（含一鍵執行閉環）：
        </h4>
        <div className="warroom-grid-3">
          {morningBrief.actionPoints.map((point, idx) => {
            const matchedHoldings = holdingSymbols.filter((h) => point.includes(h.symbol));
            const primaryTarget = matchedHoldings[0];
            const isSell = point.includes('破線') || point.includes('停損') || point.includes('減碼');
            const isBuy = point.includes('突破') || point.includes('加碼');

            return (
              <div
                key={idx}
                style={{
                  background: isSell ? 'rgba(239, 68, 68, 0.08)' : isBuy ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${isSell ? 'rgba(239, 68, 68, 0.35)' : isBuy ? 'rgba(16, 185, 129, 0.35)' : 'rgba(51, 65, 85, 0.45)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span style={{ color: isSell ? 'var(--loss-color)' : isBuy ? 'var(--gain-color)' : 'var(--text-primary)' }}>
                  {maskMoneyInText(point, privacyMode)}
                </span>
                {primaryTarget && (onInspectTechnical || onOpenTradeModal) && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {onInspectTechnical && (
                      <button
                        type="button"
                        onClick={() => onInspectTechnical(primaryTarget.symbol, primaryTarget.market)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.7rem', padding: '2px 8px', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8' }}
                      >
                        📈 技術面 ({primaryTarget.symbol})
                      </button>
                    )}
                    {onOpenTradeModal && (
                      <button
                        type="button"
                        onClick={() => onOpenTradeModal(primaryTarget.symbol, primaryTarget.market)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.7rem', padding: '2px 8px', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fbbf24' }}
                      >
                        ⚡ 下單
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
