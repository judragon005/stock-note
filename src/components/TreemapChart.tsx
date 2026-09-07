import React, { useState } from 'react';
import { HoldingPosition, ColorThemeMode, LoanRecord } from '../types/stock';
import { computeTreemapLayout, TreemapItem, TreemapNode } from '../utils/treemap';

export interface TreemapChartProps {
  holdings: HoldingPosition[];
  usdToTwdRate: number;
  cashBalanceTwd?: number;
  totalDebtTwd?: number;
  loans?: LoanRecord[];
  colorTheme: ColorThemeMode;
}

// 顏色映射：根據損益率、現金或借款負債屬性計算底色
export const getTreemapNodeColor = (node: TreemapNode, colorTheme: ColorThemeMode): string => {
  if (node.market === 'DEBT' || node.id === 'DEBT_TWD') {
    return 'hsla(38, 92%, 50%, 0.85)'; // 專屬高辨識度琥珀警示色
  }

  if (node.market === 'CASH' || node.id === 'CASH_TWD') {
    return 'hsla(215, 25%, 27%, 0.85)'; // 中性深灰藍石板色
  }

  const pnlPercent = node.pnlPercent;
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

// 邊框映射：根據節點屬性計算邊框色
export const getTreemapNodeBorderColor = (node: TreemapNode, colorTheme: ColorThemeMode): string => {
  if (node.market === 'DEBT' || node.id === 'DEBT_TWD') {
    return '#d97706'; // 深琥珀金邊框
  }

  if (node.market === 'CASH' || node.id === 'CASH_TWD') {
    return '#64748b'; // 板岩灰邊框
  }

  const pnlPercent = node.pnlPercent;
  const isTaiwanTheme = colorTheme === 'taiwan';
  const isProfit = pnlPercent >= 0;
  if (isProfit) {
    return isTaiwanTheme ? '#ef4444' : '#10b981';
  } else {
    return isTaiwanTheme ? '#10b981' : '#ef4444';
  }
};

// 借款節點損益/成本文字格式化
export const formatDebtNodePnlText = (_node: TreemapNode, averageInterestRate?: number): string => {
  if (averageInterestRate && averageInterestRate > 0) {
    return `-${averageInterestRate.toFixed(2)}% 年息`;
  }
  return '負債項';
};

export const TreemapChart: React.FC<TreemapChartProps> = ({
  holdings,
  usdToTwdRate,
  cashBalanceTwd = 0,
  totalDebtTwd = 0,
  loans = [],
  colorTheme,
}) => {
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

  // 若有現金餘額 (> 0)，動態注入現金節點
  if (cashBalanceTwd > 0) {
    treemapItems.push({
      id: 'CASH_TWD',
      symbol: '💵 現金',
      name: 'Cash / 活存與備用金',
      market: 'CASH',
      value: cashBalanceTwd,
      pnlPercent: 0,
    });
  }

  // 計算有效總借款額（優先取傳入的 totalDebtTwd，若無則聚合 loans 本金）
  const aggregatedLoanPrincipal = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
  const effectiveDebt = Math.max(0, totalDebtTwd > 0 ? totalDebtTwd : aggregatedLoanPrincipal);

  // 計算借貸加權平均年利率
  const avgInterestRate = loans.length > 0 && aggregatedLoanPrincipal > 0
    ? loans.reduce((sum, l) => sum + (l.principal * (l.interestRate || 0)), 0) / aggregatedLoanPrincipal
    : 0;

  // 若有借款負債 (> 0)，動態注入借款節點
  if (effectiveDebt > 0) {
    treemapItems.push({
      id: 'DEBT_TWD',
      symbol: '🏦 借貸負債',
      name: '質押/借貸負債總額',
      market: 'DEBT',
      value: effectiveDebt,
      pnlPercent: 0,
    });
  }

  const viewBoxWidth = 1000;
  const viewBoxHeight = 520;
  const nodes = computeTreemapLayout(treemapItems, viewBoxWidth, viewBoxHeight);

  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        暫無有效資產市值數據
      </div>
    );
  }

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
          const isCash = node.market === 'CASH' || node.id === 'CASH_TWD';
          const isDebt = node.market === 'DEBT' || node.id === 'DEBT_TWD';
          const bgFill = getTreemapNodeColor(node, colorTheme);

          // 判斷區塊寬高是否足夠顯示文字
          const showSymbol = node.width > 40 && node.height > 30;
          const showName = node.width > 70 && node.height > 55;
          const showPnl = node.width > 60 && node.height > 45;

          const pnlText = isDebt
            ? formatDebtNodePnlText(node, avgInterestRate)
            : isCash
            ? '0.0%'
            : `${node.pnlPercent >= 0 ? '+' : ''}${node.pnlPercent.toFixed(1)}%`;
          const weightText = `${node.weight.toFixed(1)}%`;

          const borderColor = getTreemapNodeBorderColor(node, colorTheme);

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
                    fontFamily: isCash || isDebt ? 'inherit' : "'JetBrains Mono', monospace",
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
        const isCash = hoveredNode.market === 'CASH' || hoveredNode.id === 'CASH_TWD';
        const isDebt = hoveredNode.market === 'DEBT' || hoveredNode.id === 'DEBT_TWD';
        const tooltipBorderColor = getTreemapNodeBorderColor(hoveredNode, colorTheme);

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
              border: isDebt ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              maxWidth: '320px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, color: '#fff', fontFamily: isCash || isDebt ? 'inherit' : "'JetBrains Mono', monospace" }}>
                {hoveredNode.symbol}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{hoveredNode.name}</span>
              <span
                className={isCash || isDebt ? 'badge' : `badge ${hoveredNode.market === 'TW' ? 'badge-tw' : 'badge-us'}`}
                style={
                  isDebt
                    ? { background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24', border: '1px solid #d97706' }
                    : isCash
                    ? { background: '#334155', color: '#94a3b8', border: '1px solid #64748b' }
                    : undefined
                }
              >
                {isDebt ? 'DEBT' : isCash ? 'CASH' : hoveredNode.market}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{isDebt ? '負債總額: ' : '折算市值: '}</span>
                <span className="mono" style={{ fontWeight: 600, color: isDebt ? '#fbbf24' : '#fff' }}>
                  NT$ {Math.round(hoveredNode.value).toLocaleString()}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>佔比: </span>
                <span className="mono" style={{ fontWeight: 600, color: '#60a5fa' }}>
                  {hoveredNode.weight.toFixed(1)}%
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{isDebt ? '資金成本: ' : '報酬率: '}</span>
                <span
                  className="mono"
                  style={{ fontWeight: 700, color: isDebt ? '#fbbf24' : isCash ? '#94a3b8' : tooltipBorderColor }}
                >
                  {isDebt
                    ? avgInterestRate > 0 ? `${avgInterestRate.toFixed(2)}% 年息` : '負債項'
                    : isCash
                    ? '0.00% (無損益)'
                    : `${hoveredNode.pnlPercent >= 0 ? '+' : ''}${hoveredNode.pnlPercent.toFixed(2)}%`}
                </span>
              </div>
            </div>

            {/* 若為借款節點且有多筆合約明細，展示合約細項 */}
            {isDebt && loans.length > 0 && (
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.74rem' }}>
                <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '4px' }}>📋 借貸合約明細 ({loans.length} 筆):</div>
                <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {loans.map((loan) => (
                    <div key={loan.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: 'var(--text-secondary)' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        • {loan.name || '借款合約'}
                      </span>
                      <span className="mono" style={{ flexShrink: 0 }}>
                        NT$ {Math.round(loan.principal).toLocaleString()} ({loan.interestRate}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

