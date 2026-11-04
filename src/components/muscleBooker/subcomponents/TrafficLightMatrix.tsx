import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ScannedStockItem } from '../../../engine/muscleBookerEngine';
import { HoldingPosition, MarketType } from '../../../types/stock';
import { StockInteractionHandlers } from '../types';
import { MuscleStockCard } from './MuscleStockCard';

export interface TrafficLightMatrixProps {
  buyItems: ScannedStockItem[];
  avoidItems: ScannedStockItem[];
  sellItems: ScannedStockItem[];
  activeHoldingsMap: Map<string, HoldingPosition>;
  expandedSymbol?: string | null;
  onToggleExpand?: (symbol: string) => void;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
  watchlistSymbols?: string[];
  onToggleWatchlist?: (symbol: string) => void;
  onQuickTrade?: (symbol: string, action: 'BUY' | 'SELL', price?: number) => void;
  handlers?: StockInteractionHandlers;
}

export const TrafficLightMatrix: React.FC<TrafficLightMatrixProps> = ({
  buyItems,
  avoidItems,
  sellItems,
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
  const [isAvoidExpanded, setIsAvoidExpanded] = React.useState(false);
  const displayedAvoidItems = isAvoidExpanded ? avoidItems : avoidItems.slice(0, 12);
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            肌肉書僮 · 三色實戰操盤導航儀 (Action Matrix)
          </h3>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          嚴格執行「有動能才進場、破防守立刻退」鐵血紀律
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {/* 🟢 建議買進 */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 800, color: '#4ade80', fontSize: '0.95rem' }}>
              🟢 建議買進 ({buyItems.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>風益比降序排列</span>
          </div>

          {buyItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              目前無買進訊號標的
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {buyItems.map((item) => (
                <MuscleStockCard
                  key={item.symbol}
                  item={item}
                  holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                  isExpanded={actualExpandedSymbol === item.symbol}
                  onToggleExpand={() => actualOnToggleExpand?.(item.symbol)}
                  onOpenOmniInspector={actualOnOpenOmniInspector}
                  badgeTone="BUY"
                  isWatched={actualWatchlistSymbols.includes(item.symbol)}
                  onToggleWatchlist={actualOnToggleWatchlist}
                  onQuickTrade={actualOnQuickTrade}
                />
              ))}
            </div>
          )}
        </div>

        {/* 🟡 觀望不碰 */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 800, color: '#facc15', fontSize: '0.95rem' }}>
              🟡 觀望不碰 / 整理待變 ({avoidItems.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {avoidItems.length > 12 && !isAvoidExpanded ? '預設精選前 12 檔' : '維持耐心不妄動'}
            </span>
          </div>

          {avoidItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              目前無觀望標的
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayedAvoidItems.map((item) => (
                <MuscleStockCard
                  key={item.symbol}
                  item={item}
                  holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                  isExpanded={actualExpandedSymbol === item.symbol}
                  onToggleExpand={() => actualOnToggleExpand?.(item.symbol)}
                  onOpenOmniInspector={actualOnOpenOmniInspector}
                  badgeTone={item.actionDecision.action === 'HOLD' ? 'HOLD' : 'AVOID'}
                  isWatched={actualWatchlistSymbols.includes(item.symbol)}
                  onToggleWatchlist={actualOnToggleWatchlist}
                  onQuickTrade={actualOnQuickTrade}
                />
              ))}

              {avoidItems.length > 12 && (
                <button
                  type="button"
                  onClick={() => setIsAvoidExpanded((prev) => !prev)}
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    color: '#facc15',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    transition: 'all 0.2s',
                  }}
                >
                  {isAvoidExpanded
                    ? '收合至前 12 檔精華 ▲'
                    : `展開其餘 ${avoidItems.length - 12} 檔觀望標的 ▼`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 🔴 建議賣出 */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 800, color: '#f87171', fontSize: '0.95rem' }}>
              🔴 建議賣出 / 破線停損 ({sellItems.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>破線嚴守退場紀律</span>
          </div>

          {sellItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              目前無破線賣出標的
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sellItems.map((item) => (
                <MuscleStockCard
                  key={item.symbol}
                  item={item}
                  holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                  isExpanded={actualExpandedSymbol === item.symbol}
                  onToggleExpand={() => actualOnToggleExpand?.(item.symbol)}
                  onOpenOmniInspector={actualOnOpenOmniInspector}
                  badgeTone="SELL"
                  isWatched={actualWatchlistSymbols.includes(item.symbol)}
                  onToggleWatchlist={actualOnToggleWatchlist}
                  onQuickTrade={actualOnQuickTrade}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
