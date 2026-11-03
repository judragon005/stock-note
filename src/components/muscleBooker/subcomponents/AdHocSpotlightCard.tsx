import React from 'react';
import { Zap, Star, Activity, X } from 'lucide-react';
import { ScannedStockItem } from '../../../engine/muscleBookerEngine';
import { MarketType } from '../../../types/stock';

export interface AdHocSpotlightCardProps {
  adHocItem: ScannedStockItem;
  watchlistSymbols: string[];
  onToggleWatchlist: (symbol: string) => void;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
  onClose: () => void;
}

export const AdHocSpotlightCard: React.FC<AdHocSpotlightCardProps> = ({
  adHocItem,
  watchlistSymbols,
  onToggleWatchlist,
  onOpenOmniInspector,
  onClose,
}) => {
  const isWatchlisted = watchlistSymbols.includes(adHocItem.symbol);

  return (
    <div
      className="card animate-fade-in"
      style={{
        padding: '18px 22px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.5)',
        boxShadow: '0 8px 32px rgba(56, 189, 248, 0.15)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="badge"
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              fontWeight: 800,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Zap size={13} /> 即時外部診斷標的
          </span>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {adHocItem.symbol} {adHocItem.name}
          </h3>
          <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
            ${adHocItem.currentPrice}
          </span>
          <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.3)', color: 'var(--text-secondary)' }}>
            {adHocItem.market}
          </span>
        </div>

        {/* 操作按鈕組 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onToggleWatchlist(adHocItem.symbol)}
            className="btn btn-sm"
            style={{
              background: isWatchlisted ? 'rgba(250, 204, 21, 0.2)' : 'rgba(56, 189, 248, 0.15)',
              color: isWatchlisted ? '#fde047' : '#38bdf8',
              border: '1px solid ' + (isWatchlisted ? 'rgba(250, 204, 21, 0.5)' : 'rgba(56, 189, 248, 0.4)'),
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Star size={14} fill={isWatchlisted ? '#fde047' : 'none'} />
            {isWatchlisted ? '已在自訂觀察' : '釘選至自訂觀察'}
          </button>

          {onOpenOmniInspector && (
            <button
              onClick={() => onOpenOmniInspector(adHocItem.symbol, adHocItem.market)}
              className="btn btn-sm"
              style={{
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.45)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="開啟 15 大關鍵技術指標全景透視與多空共振評分"
            >
              <Activity size={14} />
              <span>全指標透視</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="btn btn-sm"
            style={{
              background: 'rgba(51, 65, 85, 0.5)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              padding: '6px 8px',
            }}
            title="關閉診斷卡片"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 指標狀態條 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>實戰動作訊號</div>
          {adHocItem.actionDecision.action === 'BUY' ? (
            <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)', fontWeight: 800 }}>
              🟢 建議買進 · 主升發動
            </span>
          ) : adHocItem.actionDecision.action === 'SELL' ? (
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 800 }}>
              🔴 建議賣出 · 破線停損
            </span>
          ) : (
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', fontWeight: 800 }}>
              🟡 觀望不碰 · 盤整待變
            </span>
          )}
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>箱子戰術狀態</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {adHocItem.boxStatus === 'BREAKOUT_UP' ? '🔥 突破箱頂' : adHocItem.boxStatus === 'BREAKOUT_DOWN' ? '⚠️ 跌破箱底' : '📦 箱內整理'}
            {adHocItem.boxUpper && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                (頂: ${adHocItem.boxUpper} / 底: ${adHocItem.boxLower})
              </span>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>布林極致壓縮 & MA扣抵</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {adHocItem.isBollingerSqueeze ? (
              <span style={{ color: '#fbbf24' }}>⚡ 極致壓縮 ({adHocItem.bollingerBandwidth?.toFixed(1)}%)</span>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>帶寬 {adHocItem.bollingerBandwidth?.toFixed(1) ?? '-'}%</span>
            )}
            <span style={{ marginLeft: '6px', color: adHocItem.ma20Slope === 'UP' ? 'var(--gain-color)' : adHocItem.ma20Slope === 'DOWN' ? 'var(--loss-color)' : 'var(--text-muted)' }}>
              {adHocItem.ma20Slope === 'UP' ? '📈 扣抵翻揚' : adHocItem.ma20Slope === 'DOWN' ? '📉 扣抵下彎' : '➖ 均線走平'}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>防守線與風益比</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
            防守: ${adHocItem.actionDecision.stopLossPrice ?? '-'}
            {adHocItem.actionDecision.riskRewardRatio && (
              <span style={{ color: '#38bdf8', marginLeft: '6px' }}>
                (風益比 1:{adHocItem.actionDecision.riskRewardRatio}R)
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Zap size={14} style={{ color: 'var(--accent-amber)' }} />
        <strong>操盤建議：</strong>
        <span>{adHocItem.actionDecision.actionReason}</span>
      </div>
    </div>
  );
};
