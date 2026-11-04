import React from 'react';
import { Flame, Zap, AlertTriangle, Activity } from 'lucide-react';
import { ScannedStockItem } from '../../../engine/muscleBookerEngine';
import { HoldingPosition, MarketType } from '../../../types/stock';
import { MuscleStockCard } from './MuscleStockCard';

export interface DarvasQuadrantGridProps {
  scannedItems: ScannedStockItem[];
  activeHoldingsMap: Map<string, HoldingPosition>;
  expandedSymbol: string | null;
  onToggleExpand: (symbol: string) => void;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
  watchlistSymbols?: string[];
  onToggleWatchlist?: (symbol: string) => void;
  onQuickTrade?: (symbol: string, action: 'BUY' | 'SELL', price?: number) => void;
}

export const DarvasQuadrantGrid: React.FC<DarvasQuadrantGridProps> = ({
  scannedItems,
  activeHoldingsMap,
  expandedSymbol,
  onToggleExpand,
  onOpenOmniInspector,
  watchlistSymbols = [],
  onToggleWatchlist,
  onQuickTrade,
}) => {
  const { breakoutUpItems, bottomPenetrationItems, bollingerSqueezeItems, breakoutDownItems } =
    React.useMemo(() => {
      const bUp: ScannedStockItem[] = [];
      const bPen: ScannedStockItem[] = [];
      const bSq: ScannedStockItem[] = [];
      const bDown: ScannedStockItem[] = [];

      for (const item of scannedItems) {
        if (item.boxStatus === 'BREAKOUT_UP') bUp.push(item);
        if (item.isBottomPenetration) bPen.push(item);
        if (item.isBollingerSqueeze) bSq.push(item);
        if (item.boxStatus === 'BREAKOUT_DOWN') bDown.push(item);
      }

      return {
        breakoutUpItems: bUp,
        bottomPenetrationItems: bPen,
        bollingerSqueezeItems: bSq,
        breakoutDownItems: bDown,
      };
    }, [scannedItems]);

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            四大象限動能看板 (Darvas & Bollinger Quadrants)
          </h3>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          多維度空間量價型態全景掃描
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {/* 象限一：🔥 箱頂突破區 */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={18} color="#4ade80" />
              <span style={{ fontWeight: 800, color: '#4ade80', fontSize: '0.95rem' }}>
                🔥 箱頂突破區 ({breakoutUpItems.length})
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>主升段動能表態</span>
          </div>

          {breakoutUpItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              目前暫無突破箱頂標的
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {breakoutUpItems.map((item) => (
                <MuscleStockCard
                  key={item.symbol}
                  item={item}
                  holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                  isExpanded={expandedSymbol === item.symbol}
                  onToggleExpand={() => onToggleExpand(item.symbol)}
                  onOpenOmniInspector={onOpenOmniInspector}
                  watchlistSymbols={watchlistSymbols}
                  onToggleWatchlist={onToggleWatchlist}
                  onQuickTrade={onQuickTrade}
                  badgeTone="BUY"
                  badgeLabel="🔥 箱頂突破"
                />
              ))}
            </div>
          )}
        </div>

        {/* 象限二：🚀 底穿上反轉區 */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={18} color="#38bdf8" />
              <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.95rem' }}>
                🚀 底穿上反轉區 ({bottomPenetrationItems.length})
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>假跌破強勢收腳</span>
          </div>

          {bottomPenetrationItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              目前暫無底穿上型態標的
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bottomPenetrationItems.map((item) => (
                <MuscleStockCard
                  key={item.symbol}
                  item={item}
                  holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                  isExpanded={expandedSymbol === item.symbol}
                  onToggleExpand={() => onToggleExpand(item.symbol)}
                  onOpenOmniInspector={onOpenOmniInspector}
                  watchlistSymbols={watchlistSymbols}
                  onToggleWatchlist={onToggleWatchlist}
                  onQuickTrade={onQuickTrade}
                  badgeTone="BUY"
                  badgeLabel="🚀 底穿上"
                />
              ))}
            </div>
          )}
        </div>

        {/* 象限三：⚡ 布林極致收縮區 */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={18} color="#facc15" />
              <span style={{ fontWeight: 800, color: '#facc15', fontSize: '0.95rem' }}>
                ⚡ 布林極致收縮區 ({bollingerSqueezeItems.length})
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>帶寬 ≤ 8% 變盤在即</span>
          </div>

          {bollingerSqueezeItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              目前暫無布林極致壓縮標的
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bollingerSqueezeItems.map((item) => (
                <MuscleStockCard
                  key={item.symbol}
                  item={item}
                  holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                  isExpanded={expandedSymbol === item.symbol}
                  onToggleExpand={() => onToggleExpand(item.symbol)}
                  onOpenOmniInspector={onOpenOmniInspector}
                  watchlistSymbols={watchlistSymbols}
                  onToggleWatchlist={onToggleWatchlist}
                  onQuickTrade={onQuickTrade}
                  badgeTone="HOLD"
                  badgeLabel="⚡ 極致壓縮"
                />
              ))}
            </div>
          )}
        </div>

        {/* 象限四：⚠️ 跌破箱底警戒區 */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={18} color="#f87171" />
              <span style={{ fontWeight: 800, color: '#f87171', fontSize: '0.95rem' }}>
                ⚠️ 跌破箱底警戒區 ({breakoutDownItems.length})
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>空頭破位嚴禁摸底</span>
          </div>

          {breakoutDownItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              目前暫無跌破箱底標的
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {breakoutDownItems.map((item) => (
                <MuscleStockCard
                  key={item.symbol}
                  item={item}
                  holding={activeHoldingsMap.get(item.symbol.toUpperCase())}
                  isExpanded={expandedSymbol === item.symbol}
                  onToggleExpand={() => onToggleExpand(item.symbol)}
                  onOpenOmniInspector={onOpenOmniInspector}
                  watchlistSymbols={watchlistSymbols}
                  onToggleWatchlist={onToggleWatchlist}
                  onQuickTrade={onQuickTrade}
                  badgeTone="SELL"
                  badgeLabel="⚠️ 破箱底"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
