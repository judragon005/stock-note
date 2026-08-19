import React, { useState } from 'react';
import { HoldingPosition, ColorThemeMode } from '../types/stock';
import { computeTreemapLayout, TreemapItem, TreemapNode } from '../utils/treemap';

interface TreemapChartProps {
  holdings: HoldingPosition[];
  usdToTwdRate: number;
  colorTheme: ColorThemeMode;
}

export const TreemapChart: React.FC<TreemapChartProps> = ({ holdings, usdToTwdRate, colorTheme }) => {
  const [hoveredNode, setHoveredNode] = useState<TreemapNode | null>(null);

  const activeHoldings = holdings.filter((h) => h.shares > 0);

  const treemapItems: TreemapItem[] = activeHoldings.map((h) => {
    const rate = h.currency === 'USD' ? usdToTwdRate : 1;
    const value = h.marketValue * rate;
    return {
      id: `${h.market}_${h.symbol}`,
      symbol: h.symbol,
      name: h.name || h.symbol,
      market: h.market,
      value,
      pnlPercent: h.unrealizedPnLPercent,
    };
  });

  const viewBoxWidth = 1000;
  const viewBoxHeight = 520;
  const nodes = computeTreemapLayout(treemapItems, viewBoxWidth, viewBoxHeight);

  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        暫無有效持倉市值數據
      </div>
    );
  }

  // 顏色映射：根據損益率計算顏色
  const getNodeColor = (pnlPercent: number) => {
    const isTaiwanTheme = colorTheme === 'taiwan';
    const isProfit = pnlPercent >= 0;

    // 依據主題決定主色調
    // taiwan: profit = red (#ef4444 / #dc2626), loss = green (#10b981 / #059669)
    // international: profit = green (#10b981), loss = red (#ef4444)
    const profitHue = isTaiwanTheme ? '0, 72%, 48%' : '158, 64%, 42%'; // 紅 vs 綠
    const lossHue = isTaiwanTheme ? '158, 64%, 42%' : '0, 72%, 48%'; // 綠 vs 紅

    const absPercent = Math.min(Math.abs(pnlPercent), 40); // 上限 40% 深度
    const opacity = 0.35 + (absPercent / 40) * 0.55; // 0.35 ~ 0.90

    const activeHue = isProfit ? profitHue : lossHue;
    return `hsla(${activeHue}, ${opacity})`;
  };

  const getNodeBorderColor = (pnlPercent: number) => {
    const isTaiwanTheme = colorTheme === 'taiwan';
    const isProfit = pnlPercent >= 0;
    if (isProfit) {
      return isTaiwanTheme ? '#ef4444' : '#10b981';
    } else {
      return isTaiwanTheme ? '#10b981' : '#ef4444';
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-color)',
        }}
      >
        <defs>
          <filter id="treemap-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {nodes.map((node) => {
          const isHovered = hoveredNode?.id === node.id;
          const bgFill = getNodeColor(node.pnlPercent);

          // 判斷區塊寬高是否足夠顯示文字
          const showSymbol = node.width > 40 && node.height > 30;
          const showName = node.width > 70 && node.height > 55;
          const showPnl = node.width > 60 && node.height > 45;

          const pnlText = `${node.pnlPercent >= 0 ? '+' : ''}${node.pnlPercent.toFixed(1)}%`;
          const weightText = `${node.weight.toFixed(1)}%`;

          const borderColor = getNodeBorderColor(node.pnlPercent);

          return (
            <g
              key={node.id}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <rect
                x={node.x + 1.5}
                y={node.y + 1.5}
                width={Math.max(0, node.width - 3)}
                height={Math.max(0, node.height - 3)}
                rx={6}
                ry={6}
                fill={bgFill}
                stroke={isHovered ? '#ffffff' : borderColor}
                strokeWidth={isHovered ? 2.5 : 1}
                style={{
                  filter: isHovered ? 'url(#treemap-glow)' : 'none',
                  transition: 'stroke 0.2s, stroke-width 0.2s',
                }}
              />

              {showSymbol && (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + (showName ? node.height / 2 - 10 : node.height / 2 + (showPnl ? -4 : 4))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: Math.min(18, Math.max(11, node.width / 7)),
                    pointerEvents: 'none',
                  }}
                >
                  {node.symbol}
                </text>
              )}

              {showName && (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255, 255, 255, 0.8)"
                  style={{
                    fontSize: Math.min(12, Math.max(9, node.width / 11)),
                    pointerEvents: 'none',
                  }}
                >
                  {node.name.length > 8 ? `${node.name.slice(0, 7)}…` : node.name}
                </text>
              )}

              {showPnl && (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + (showName ? node.height / 2 + 22 : node.height / 2 + 14)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: Math.min(13, Math.max(10, node.width / 9)),
                    pointerEvents: 'none',
                  }}
                >
                  {pnlText} ({weightText})
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredNode && (() => {
        const tooltipBorderColor = getNodeBorderColor(hoveredNode.pnlPercent);
        return (
          <div
            className="glass-card"
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              padding: '10px 14px',
              fontSize: '0.85rem',
              pointerEvents: 'none',
              zIndex: 10,
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                {hoveredNode.symbol}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{hoveredNode.name}</span>
              <span className={`badge ${hoveredNode.market === 'TW' ? 'badge-tw' : 'badge-us'}`}>
                {hoveredNode.market}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>折算市值: </span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  NT$ {Math.round(hoveredNode.value).toLocaleString()}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>權重: </span>
                <span className="mono" style={{ fontWeight: 600, color: '#60a5fa' }}>
                  {hoveredNode.weight.toFixed(1)}%
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>報酬率: </span>
                <span
                  className="mono"
                  style={{ fontWeight: 700, color: tooltipBorderColor }}
                >
                  {hoveredNode.pnlPercent >= 0 ? '+' : ''}
                  {hoveredNode.pnlPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
