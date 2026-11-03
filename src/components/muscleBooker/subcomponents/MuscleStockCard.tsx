import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ScannedStockItem, BEGINNER_TOOLTIPS } from '../../../engine/muscleBookerEngine';
import { HoldingPosition, MarketType } from '../../../types/stock';
import { Tooltip } from '../../common/Tooltip';
import { formatCurrencyPrice } from '../../MuscleBookerWorkspace';

export interface MuscleStockCardProps {
  item: ScannedStockItem;
  holding?: HoldingPosition;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
  badgeLabel?: string;
  badgeTone?: 'BUY' | 'SELL' | 'AVOID' | 'HOLD';
}

export const MuscleStockCard: React.FC<MuscleStockCardProps> = ({
  item,
  holding,
  isExpanded = false,
  onToggleExpand,
  onOpenOmniInspector,
  badgeLabel,
  badgeTone,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopySymbol = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(item.symbol);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInspector = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenOmniInspector) {
      onOpenOmniInspector(item.symbol, item.market);
    }
  };

  // 計算漲跌價與漲跌幅
  let priceChange: number | undefined;
  let priceChangePercent: number | undefined;
  let volRatio: number | undefined;

  if (item.candles && item.candles.length >= 2) {
    const len = item.candles.length;
    const prevClose = item.candles[len - 2].close;
    if (prevClose > 0) {
      priceChange = Math.round((item.currentPrice - prevClose) * 100) / 100;
      priceChangePercent = Math.round(((item.currentPrice - prevClose) / prevClose) * 10000) / 100;
    }
    // 量比計算：當日成交量 / 5日均量
    if (len >= 5) {
      const vSlice = item.candles.slice(-5);
      const vAvg = vSlice.reduce((acc, c) => acc + c.volume, 0) / 5;
      if (vAvg > 0) {
        volRatio = Math.round((item.candles[len - 1].volume / vAvg) * 100) / 100;
      }
    }
  }

  // 防守價與防守緩衝距離 Buffer %
  const defensePrice =
    item.actionDecision.stopLossPrice ??
    (item.actionDecision.action === 'BUY' ? item.boxUpper : item.boxLower);

  let bufferPercent: number | undefined;
  if (defensePrice !== undefined && item.currentPrice > 0) {
    bufferPercent =
      Math.round(((item.currentPrice - defensePrice) / item.currentPrice) * 1000) / 10;
  }

  // 是否處於防守臨界警訊 (已破防守線，或緩衝距離 <= 1.5%)
  const isBroken = defensePrice !== undefined && item.currentPrice < defensePrice;
  const isBufferCritical =
    isBroken || (bufferPercent !== undefined && bufferPercent <= 1.5);

  // 決定徽章色彩與文字
  const tone = badgeTone ?? item.actionDecision.action;
  const label = badgeLabel ?? (item.actionDecision.action === 'BUY' ? '🟢 建議買進' : item.actionDecision.action === 'SELL' ? '🔴 建議賣出' : '🟡 觀望不碰');

  const toneStyles = {
    BUY: {
      bg: 'rgba(34, 197, 94, 0.15)',
      color: '#4ade80',
      border: 'rgba(34, 197, 94, 0.35)',
    },
    SELL: {
      bg: 'var(--loss-bg)',
      color: 'var(--loss-color)',
      border: 'var(--loss-border)',
    },
    AVOID: {
      bg: 'rgba(148, 163, 184, 0.12)',
      color: 'var(--text-secondary)',
      border: 'rgba(148, 163, 184, 0.25)',
    },
    HOLD: {
      bg: 'rgba(234, 179, 8, 0.15)',
      color: '#facc15',
      border: 'rgba(234, 179, 8, 0.35)',
    },
  }[tone] || {
    bg: 'rgba(148, 163, 184, 0.12)',
    color: 'var(--text-secondary)',
    border: 'rgba(148, 163, 184, 0.25)',
  };

  return (
    <div
      className="warroom-stat-card animate-fade-in"
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        border: isBufferCritical
          ? '1px solid rgba(239, 68, 68, 0.8)'
          : undefined,
        boxShadow: isBufferCritical ? '0 0 10px rgba(239, 68, 68, 0.3)' : undefined,
      }}
      onClick={onToggleExpand}
    >
      {/* 頂部：代碼、名稱、複製、透視、狀態徽章 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mono" style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
            {item.symbol}
          </span>
          <button
            type="button"
            onClick={handleCopySymbol}
            style={{
              background: 'none',
              border: 'none',
              color: copied ? '#4ade80' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            title="一鍵複製股票代碼"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {item.name}
          </span>
          {holding && (
            <span
              className="badge"
              style={{
                fontSize: '0.7rem',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)',
              }}
            >
              庫存: {holding.shares.toLocaleString()} 股
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a
            href={
              item.market === 'US'
                ? `https://finance.yahoo.com/quote/${encodeURIComponent(item.symbol)}`
                : `https://tw.stock.yahoo.com/quote/${encodeURIComponent(item.symbol)}.TW`
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              padding: '2px 6px',
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              textDecoration: 'none',
            }}
            title="開啟外部即時 K 線圖表"
          >
            <ExternalLink size={11} />
            圖表
          </a>
          {onOpenOmniInspector && (
            <button
              type="button"
              onClick={handleOpenInspector}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                color: '#38bdf8',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '0.72rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="開啟全方位指標透視儀"
            >
              <ExternalLink size={11} />
              透視
            </button>
          )}

          <span
            className="badge"
            style={{
              background: toneStyles.bg,
              color: toneStyles.color,
              border: `1px solid ${toneStyles.border}`,
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* 價格、漲跌幅、量比、防守價 */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span className="mono" style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            {formatCurrencyPrice(item.currentPrice, item.market)}
          </span>
          {priceChangePercent !== undefined && (
            <span
              className="mono"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color:
                  priceChangePercent > 0
                    ? 'var(--gain-color)'
                    : priceChangePercent < 0
                    ? 'var(--loss-color)'
                    : 'var(--text-muted)',
              }}
            >
              {priceChangePercent > 0 ? '+' : ''}
              {priceChangePercent}% ({priceChange! > 0 ? '+' : ''}{priceChange})
            </span>
          )}
        </div>

        {volRatio !== undefined && (
          <span
            className="mono"
            style={{
              fontSize: '0.75rem',
              color: volRatio >= 1.5 ? '#f59e0b' : 'var(--text-muted)',
              fontWeight: volRatio >= 1.5 ? 700 : 400,
            }}
          >
            量比: {volRatio}x
          </span>
        )}
      </div>

      {/* 防守價與緩衝距離 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
        <Tooltip content={BEGINNER_TOOLTIPS.boxUpperDefense} position="top">
          <span className="mono" style={{ color: 'var(--text-secondary)', textDecoration: 'underline dotted', cursor: 'help' }}>
            防守價: {formatCurrencyPrice(defensePrice, item.market)}
          </span>
        </Tooltip>

        {bufferPercent !== undefined && (
          <span
            className="mono"
            style={{
              fontWeight: 700,
              color: isBufferCritical ? '#ef4444' : 'var(--text-muted)',
            }}
          >
            {isBroken ? '🚨 已破防守: ' : isBufferCritical ? '🚨 緊貼防守: ' : ''}
            緩衝: {bufferPercent > 0 ? `+${bufferPercent}` : bufferPercent}%
          </span>
        )}
      </div>

      {/* 風益比與目標價 */}
      {item.actionDecision.targetPrice !== undefined && item.actionDecision.riskRewardRatioValue !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
            <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>
              目標價: {formatCurrencyPrice(item.actionDecision.targetPrice, item.market)}
            </span>
          </Tooltip>
          <span className="mono" style={{ color: '#38bdf8', fontWeight: 700 }}>
            風益比: {item.actionDecision.riskRewardRatioValue}R
          </span>
        </div>
      )}

      {/* 展開收合指示 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px', color: 'var(--text-muted)' }}>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
    </div>
  );
};
