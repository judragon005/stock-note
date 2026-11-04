import React from 'react';
import { Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ScannedStockItem, calculateDefenseBufferMetrics } from '../../../engine/muscleBookerEngine';
import { HoldingPosition, MarketType } from '../../../types/stock';
import { StockInteractionHandlers } from '../types';
import { MuscleStockCard } from './MuscleStockCard';

export interface ActionDirectivesHUDProps {
  top3BuyItems: ScannedStockItem[];
  top3SellItems: ScannedStockItem[];
  activeHoldingsMap: Map<string, HoldingPosition>;
  expandedSymbol?: string | null;
  onToggleExpand?: (symbol: string) => void;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
  watchlistSymbols?: string[];
  onToggleWatchlist?: (symbol: string) => void;
  onQuickTrade?: (symbol: string, action: 'BUY' | 'SELL', price?: number) => void;
  handlers?: StockInteractionHandlers;
}

export const ActionDirectivesHUD: React.FC<ActionDirectivesHUDProps> = ({
  top3BuyItems,
  top3SellItems,
  activeHoldingsMap,
  expandedSymbol,
  onToggleExpand,
  onOpenOmniInspector,
  watchlistSymbols = [],
  onToggleWatchlist,
  onQuickTrade,
  handlers,
}) => {
  const actualExpandedSymbol = handlers?.expandedSymbol !== undefined ? handlers.expandedSymbol : expandedSymbol;
  const actualOnToggleExpand = handlers?.onToggleExpand ?? onToggleExpand;
  const actualOnOpenOmniInspector = handlers?.onOpenOmniInspector ?? onOpenOmniInspector;
  const actualWatchlistSymbols = handlers?.watchlistSymbols ? Array.from(handlers.watchlistSymbols) : watchlistSymbols;
  const actualOnToggleWatchlist = handlers?.onToggleWatchlist ?? onToggleWatchlist;
  const actualOnQuickTrade = handlers?.onQuickTrade ?? onQuickTrade;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* 🚀 左側：今日買進先鋒 */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} color="#4ade80" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              今日買進先鋒 (Top 3)
            </h3>
          </div>
          <span
            className="badge"
            style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            風益比 ≥ 2.0R 優先
          </span>
        </div>

        {top3BuyItems.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <CheckCircle2 size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
            目前選定資產池無滿足風益比 ≥ 2.0R 之突破標的。<br />
            保持耐心與紀律，空手等待也是一種高超的策略！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {top3BuyItems.map((item) => (
              <MuscleStockCard
                key={item.symbol}
                item={item}
                holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                isExpanded={actualExpandedSymbol === item.symbol}
                onToggleExpand={() => actualOnToggleExpand?.(item.symbol)}
                onOpenOmniInspector={actualOnOpenOmniInspector}
                badgeTone="BUY"
                badgeLabel={`買進 · ${item.actionDecision.riskRewardRatioValue}R`}
                isWatched={actualWatchlistSymbols.includes(item.symbol)}
                onToggleWatchlist={actualOnToggleWatchlist}
                onQuickTrade={actualOnQuickTrade}
                handlers={handlers}
              />
            ))}
          </div>
        )}
      </div>

      {/* 🚨 右側：在庫持股停損與瀕臨破防警戒 */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="#f87171" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              在庫停損與瀕臨破防警戒 (Top 3)
            </h3>
          </div>
          <span
            className="badge"
            style={{
              background: 'var(--loss-bg)',
              color: 'var(--loss-color)',
              border: '1px solid var(--loss-border)',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            已破防或緩衝 ≤ 1.5%
          </span>
        </div>

        {top3SellItems.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <CheckCircle2 size={24} color="#4ade80" style={{ margin: '0 auto 8px', display: 'block' }} />
            🟢 在庫持股全數守穩安全防線 (緩衝 &gt; 1.5%)，暫無破線警訊！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {top3SellItems.map((item) => {
              const { isDefenseBroken, bufferPercent } = calculateDefenseBufferMetrics(item);
              const badgeLabel = isDefenseBroken
                ? '🚨 破線停損'
                : `⚠️ 瀕臨破防 (${bufferPercent}%)`;

              return (
                <MuscleStockCard
                  key={item.symbol}
                  item={item}
                  holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                  isExpanded={actualExpandedSymbol === item.symbol}
                  onToggleExpand={() => actualOnToggleExpand?.(item.symbol)}
                  onOpenOmniInspector={actualOnOpenOmniInspector}
                  badgeTone="SELL"
                  badgeLabel={badgeLabel}
                  isWatched={actualWatchlistSymbols.includes(item.symbol)}
                  onToggleWatchlist={actualOnToggleWatchlist}
                  onQuickTrade={actualOnQuickTrade}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
