import React, { useState } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Sliders,
  Shield,
  Target,
} from 'lucide-react';
import { ScannedStockItem, BEGINNER_TOOLTIPS } from '../../../engine/muscleBookerEngine';
import { HoldingPosition, MarketType } from '../../../types/stock';
import { Tooltip } from '../../common/Tooltip';
import { formatCurrencyPrice } from '../../MuscleBookerWorkspace';

// 達瓦斯防守安全條漸層色常數 (消除 Primitive Obsession smell)
const BUFFER_BAR_GRADIENTS = {
  BROKEN: 'linear-gradient(90deg, #ef4444, #f87171)',
  CRITICAL: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
  HEALTHY: 'linear-gradient(90deg, #10b981, #34d399)',
} as const;

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
      bg: 'rgba(34, 197, 94, 0.16)',
      color: 'var(--gain-color, #4ade80)',
      border: 'rgba(34, 197, 94, 0.35)',
    },
    SELL: {
      bg: 'var(--loss-bg, rgba(239, 68, 68, 0.16))',
      color: 'var(--loss-color, #f87171)',
      border: 'var(--loss-border, rgba(239, 68, 68, 0.35))',
    },
    AVOID: {
      bg: 'rgba(148, 163, 184, 0.12)',
      color: 'var(--text-secondary)',
      border: 'rgba(148, 163, 184, 0.25)',
    },
    HOLD: {
      bg: 'rgba(234, 179, 8, 0.16)',
      color: '#facc15',
      border: 'rgba(234, 179, 8, 0.35)',
    },
  }[tone] || {
    bg: 'rgba(148, 163, 184, 0.12)',
    color: 'var(--text-secondary)',
    border: 'rgba(148, 163, 184, 0.25)',
  };

  // 防守安全條進度 (0% ~ 100%，以緩衝 8% 為基準上限)
  const bufferBarWidth = Math.max(
    0,
    Math.min(100, bufferPercent !== undefined ? (Math.max(0, bufferPercent) / 8) * 100 : 50)
  );
  const bufferBarColor = isBroken
    ? BUFFER_BAR_GRADIENTS.BROKEN
    : isBufferCritical
    ? BUFFER_BAR_GRADIENTS.CRITICAL
    : BUFFER_BAR_GRADIENTS.HEALTHY;

  return (
    <div
      className="warroom-stat-card animate-fade-in"
      style={{
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isBufferCritical
          ? '1px solid rgba(239, 68, 68, 0.7)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '12px 14px',
        boxShadow: isBufferCritical
          ? '0 4px 16px rgba(239, 68, 68, 0.25)'
          : '0 4px 12px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
      }}
      onClick={onToggleExpand}
    >
      {/* 1. 頂部標的列 (Ticker & Meta Row) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '8px',
          minWidth: 0,
        }}
      >
        {/* 左側：代碼、名稱、庫存微標籤 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 auto' }}>
          <span
            className="mono"
            style={{
              fontWeight: 800,
              fontSize: '1.02rem',
              color: '#ffffff',
              letterSpacing: '-0.02em',
              flexShrink: 0,
            }}
          >
            {item.symbol}
          </span>

          <button
            type="button"
            onClick={handleCopySymbol}
            style={{
              background: 'transparent',
              border: 'none',
              color: copied ? '#4ade80' : 'rgba(148, 163, 184, 0.6)',
              cursor: 'pointer',
              padding: '2px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'color 0.2s',
              flexShrink: 0,
            }}
            title="一鍵複製股票代碼"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          <span
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '92px',
              flexShrink: 1,
            }}
            title={item.name}
          >
            {item.name}
          </span>

          {holding && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.16)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {holding.shares.toLocaleString()} 股
            </span>
          )}
        </div>

        {/* 右側：狀態微膠囊與精緻微圖標按鈕群組 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <span
            style={{
              background: toneStyles.bg,
              color: toneStyles.color,
              border: `1px solid ${toneStyles.border}`,
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {label}
          </span>

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
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              color: 'var(--text-muted)',
              padding: '3px 4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            title="開啟外部即時 K 線圖表"
          >
            <BarChart2 size={13} />
          </a>

          {onOpenOmniInspector && (
            <button
              type="button"
              onClick={handleOpenInspector}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '5px',
                color: '#38bdf8',
                cursor: 'pointer',
                padding: '3px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title="開啟全方位指標透視儀"
            >
              <Sliders size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 2. 量價核心焦點層 (Hero Price & Momentum Row) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            className="mono"
            style={{
              fontWeight: 800,
              fontSize: '1.26rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatCurrencyPrice(item.currentPrice, item.market)}
          </span>

          {priceChangePercent !== undefined && (
            <span
              className="mono"
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '5px',
                background:
                  priceChangePercent > 0
                    ? 'rgba(34, 197, 94, 0.16)'
                    : priceChangePercent < 0
                    ? 'rgba(239, 68, 68, 0.16)'
                    : 'rgba(148, 163, 184, 0.12)',
                color:
                  priceChangePercent > 0
                    ? '#4ade80'
                    : priceChangePercent < 0
                    ? '#f87171'
                    : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title={priceChange !== undefined ? `漲跌: ${priceChange > 0 ? '+' : ''}${priceChange}` : undefined}
            >
              {priceChangePercent > 0 ? '+' : ''}
              {priceChangePercent}%
            </span>
          )}
        </div>

        {volRatio !== undefined && (
          <span
            className="mono"
            style={{
              fontSize: '0.72rem',
              color: volRatio >= 1.5 ? '#f59e0b' : 'var(--text-muted)',
              fontWeight: volRatio >= 1.5 ? 700 : 500,
              background: volRatio >= 1.5 ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
              padding: volRatio >= 1.5 ? '1px 5px' : '0',
              borderRadius: '4px',
            }}
            title="當日預估成交量與 5 日均量比"
          >
            量比 {volRatio}x
          </span>
        )}
      </div>

      {/* 3. 達瓦斯防守儀表條 (Defense & Buffer Gauge) */}
      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem',
            marginBottom: '4px',
          }}
        >
          <Tooltip content={BEGINNER_TOOLTIPS.boxUpperDefense} position="top">
            <span
              className="mono"
              style={{
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'help',
              }}
            >
              <Shield size={11} color="var(--text-muted)" />
              防守 {formatCurrencyPrice(defensePrice, item.market)}
            </span>
          </Tooltip>

          {bufferPercent !== undefined && (
            <span
              className="mono"
              style={{
                fontWeight: 700,
                color: isBroken ? '#ef4444' : isBufferCritical ? '#f59e0b' : '#38bdf8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              {isBroken ? '🚨 已跌破 ' : ''}
              緩衝 {bufferPercent > 0 ? `+${bufferPercent}` : bufferPercent}%
            </span>
          )}
        </div>

        {/* 蘋果風格動態微光防守安全條 (3px Height Progress Bar) */}
        <div
          style={{
            height: '3px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '6px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${isBroken ? 100 : bufferBarWidth}%`,
              background: bufferBarColor,
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* 風益比與目標價資訊 (若有) */}
        {item.actionDecision.targetPrice !== undefined && item.actionDecision.riskRewardRatioValue !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
            }}
          >
            <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'help' }}>
                <Target size={11} />
                目標 {formatCurrencyPrice(item.actionDecision.targetPrice, item.market)}
              </span>
            </Tooltip>

            <span className="mono" style={{ color: '#38bdf8', fontWeight: 700 }}>
              {item.actionDecision.riskRewardRatioValue}R
            </span>
          </div>
        )}
      </div>

      {/* 4. 抽屜式詳細技術指標 (Collapsible Details Drawer) */}
      {isExpanded && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
            fontSize: '0.74rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>箱頂 / 箱底</span>
            <span className="mono" style={{ color: 'var(--text-primary)' }}>
              {item.boxUpper ? `$${item.boxUpper}` : '-'} / {item.boxLower ? `$${item.boxLower}` : '-'}
              {item.boxWidthPercent !== undefined && ` (${item.boxWidthPercent}%)`}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <Tooltip content={BEGINNER_TOOLTIPS.maDeductionTelescope} position="top">
              <span style={{ cursor: 'help' }}>20MA 扣抵望遠鏡</span>
            </Tooltip>
            <span className="mono" style={{ color: item.ma20Slope === 'UP' ? '#4ade80' : item.ma20Slope === 'DOWN' ? '#f87171' : 'var(--text-muted)' }}>
              {item.ma20DeductionPrice ? `$${item.ma20DeductionPrice}` : '-'} ({item.ma20Slope === 'UP' ? '翻揚助漲' : item.ma20Slope === 'DOWN' ? '下彎反壓' : '走平'})
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <Tooltip content={BEGINNER_TOOLTIPS.bollingerSqueeze} position="top">
              <span style={{ cursor: 'help' }}>布林帶寬 (壓縮狀態)</span>
            </Tooltip>
            <span className="mono" style={{ color: item.isBollingerSqueeze ? '#facc15' : 'var(--text-primary)' }}>
              {item.bollingerBandwidth !== undefined ? `${item.bollingerBandwidth}%` : '-'}
              {item.isBollingerSqueeze ? ' (極致壓縮)' : ''}
            </span>
          </div>

          {item.obvTrend && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>OBV 能量潮動能</span>
              <span className="mono" style={{ color: item.obvTrend === 'RISING' ? '#4ade80' : item.obvTrend === 'FALLING' ? '#f87171' : 'var(--text-muted)' }}>
                {item.obvTrend === 'RISING' ? '量先價行 (多頭資金流入)' : item.obvTrend === 'FALLING' ? '主力出貨 (資金流出背離)' : '常態平穩'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 5. 展開收合折疊指引 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '4px',
          color: 'rgba(148, 163, 184, 0.4)',
        }}
      >
        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </div>
    </div>
  );
};
