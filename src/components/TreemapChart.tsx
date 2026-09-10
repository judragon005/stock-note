import React, { useState, useMemo } from 'react';
import { HoldingPosition, ColorThemeMode, LoanRecord } from '../types/stock';
import { computeTreemapLayout, TreemapItem, TreemapNode } from '../utils/treemap';
import { calculateLookThroughExposure } from '../engine/lookThroughEngine';
import { LookThroughExposure, LookThroughReport } from '../types/lookThrough';
import { LookThroughDetailModal } from './LookThroughDetailModal';

export interface TreemapChartProps {
  holdings: HoldingPosition[];
  usdToTwdRate: number;
  cashBalanceTwd?: number;
  totalDebtTwd?: number;
  loans?: LoanRecord[];
  colorTheme: ColorThemeMode;
}

// 顏色映射：根據損益率、現金、借款或穿透集中度屬性計算底色
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
  const profitHue = isTaiwanTheme ? '0, 72%, 48%' : '158, 64%, 42%';
  const lossHue = isTaiwanTheme ? '158, 64%, 42%' : '0, 72%, 48%';

  const absPercent = Math.min(Math.abs(pnlPercent), 40);
  const opacity = 0.35 + (absPercent / 40) * 0.55;

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
  const [viewMode, setViewMode] = useState<'SECURITY' | 'LOOK_THROUGH'>('SECURITY');
  const [selectedExposure, setSelectedExposure] = useState<LookThroughExposure | null>(null);

  const activeHoldings = holdings.filter((h) => h.shares > 0);

  // 穿透報告計算
  const lookThroughReport: LookThroughReport = useMemo(() => {
    return calculateLookThroughExposure(activeHoldings, usdToTwdRate);
  }, [activeHoldings, usdToTwdRate]);

  // 依據視圖模式組織 TreemapItems
  const treemapItems: TreemapItem[] = useMemo(() => {
    if (viewMode === 'LOOK_THROUGH') {
      // 穿透透視模式
      const items: TreemapItem[] = lookThroughReport.exposures.map((exp) => {
        return {
          id: `LT_${exp.symbol}`,
          symbol: exp.symbol,
          name: exp.name || exp.symbol,
          market: exp.market,
          value: exp.totalEffectiveValue,
          pnlPercent: 0, // 穿透節點主要反映市值分佈
        };
      });

      if (cashBalanceTwd > 0) {
        items.push({
          id: 'CASH_TWD',
          symbol: '💵 現金',
          name: 'Cash / 活存與備用金',
          market: 'CASH',
          value: cashBalanceTwd,
          pnlPercent: 0,
        });
      }
      return items;
    }

    // 標的視圖 (預設)
    const items: TreemapItem[] = activeHoldings.map((h) => {
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

    if (cashBalanceTwd > 0) {
      items.push({
        id: 'CASH_TWD',
        symbol: '💵 現金',
        name: 'Cash / 活存與備用金',
        market: 'CASH',
        value: cashBalanceTwd,
        pnlPercent: 0,
      });
    }

    const aggregatedLoanPrincipal = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
    const effectiveDebt = Math.max(0, totalDebtTwd > 0 ? totalDebtTwd : aggregatedLoanPrincipal);

    if (effectiveDebt > 0) {
      items.push({
        id: 'DEBT_TWD',
        symbol: '🏦 借貸負債',
        name: '質押/借貸負債總額',
        market: 'DEBT',
        value: effectiveDebt,
        pnlPercent: 0,
      });
    }

    return items;
  }, [viewMode, activeHoldings, lookThroughReport, cashBalanceTwd, totalDebtTwd, loans, usdToTwdRate]);

  // 計算借貸加權平均年利率
  const aggregatedLoanPrincipal = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
  const avgInterestRate =
    loans.length > 0 && aggregatedLoanPrincipal > 0
      ? loans.reduce((sum, l) => sum + l.principal * (l.interestRate || 0), 0) / aggregatedLoanPrincipal
      : 0;

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

  const handleNodeClick = (node: TreemapNode) => {
    if (viewMode === 'LOOK_THROUGH') {
      const exp = lookThroughReport.exposures.find((e) => e.symbol === node.symbol);
      if (exp) {
        setSelectedExposure(exp);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 頂部視圖切換列 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>視圖模式：</span>
          <div
            style={{
              display: 'inline-flex',
              padding: '3px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('SECURITY')}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: viewMode === 'SECURITY' ? 700 : 500,
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'SECURITY' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                color: viewMode === 'SECURITY' ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer',
              }}
            >
              📊 標的視圖 (原始)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LOOK_THROUGH')}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: viewMode === 'LOOK_THROUGH' ? 700 : 500,
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'LOOK_THROUGH' ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                color: viewMode === 'LOOK_THROUGH' ? '#34d399' : '#94a3b8',
                cursor: 'pointer',
              }}
            >
              🔍 ETF 穿透透視
            </button>
          </div>
        </div>

        {viewMode === 'LOOK_THROUGH' && (
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            💡 點擊任一穿透公司區塊可展開直接/間接持股明細
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        }}
      >
        <defs>
          <filter id="treemap-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="alert-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.8" />
          </filter>
        </defs>

        {nodes.map((node) => {
          const isHovered = hoveredNode?.id === node.id;
          const bgFill = getTreemapNodeColor(node, colorTheme);

          // 穿透模式下檢查是否觸發集中度警示
          const exp = viewMode === 'LOOK_THROUGH' ? lookThroughReport.exposures.find((e) => e.symbol === node.symbol) : undefined;
          const isAlert = exp?.isConcentrationAlert;

          const borderColor = isAlert
            ? '#f59e0b'
            : getTreemapNodeBorderColor(node, colorTheme);

          const isCompact = node.width < 60 || node.height < 40;
          const isMicro = node.width < 40 || node.height < 30;

          return (
            <g
              key={node.id}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                cursor: viewMode === 'LOOK_THROUGH' && !node.id.startsWith('CASH') && !node.id.startsWith('DEBT') ? 'pointer' : 'default',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: isAlert ? 'url(#alert-glow)' : isHovered ? 'url(#treemap-glow)' : 'none',
              }}
            >
              <rect
                x={node.x}
                y={node.y}
                width={Math.max(0, node.width)}
                height={Math.max(0, node.height)}
                fill={bgFill}
                stroke={borderColor}
                strokeWidth={isAlert ? 2.5 : isHovered ? 2 : 1}
                rx={4}
              />

              {!isMicro && (
                <>
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + node.height / 2 - (isCompact ? 0 : 8)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={isCompact ? 11 : 13}
                    fontWeight="700"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.symbol}
                  </text>

                  {!isCompact && (
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height / 2 + 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255, 255, 255, 0.85)"
                      fontSize={11}
                      fontWeight="500"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {node.market === 'DEBT' || node.id === 'DEBT_TWD'
                        ? formatDebtNodePnlText(node, avgInterestRate)
                        : viewMode === 'LOOK_THROUGH' && exp
                        ? `${exp.portfolioWeightPercent.toFixed(1)}%`
                        : `${node.pnlPercent >= 0 ? '+' : ''}${node.pnlPercent.toFixed(2)}%`}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* 懸浮 Tooltip 渲染 */}
      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <strong>{hoveredNode.symbol}</strong> ({hoveredNode.name}) — NT${' '}
          {Math.round(hoveredNode.value).toLocaleString()}
          {viewMode === 'LOOK_THROUGH' ? (
            <span style={{ marginLeft: '8px', color: '#38bdf8', fontWeight: 600 }}>
              (佔整戶 NAV {((hoveredNode.value / lookThroughReport.totalPortfolioNAV) * 100).toFixed(1)}%)
            </span>
          ) : (
            hoveredNode.market !== 'CASH' &&
            hoveredNode.market !== 'DEBT' && (
              <span
                style={{
                  marginLeft: '8px',
                  color: hoveredNode.pnlPercent >= 0 ? '#ef4444' : '#10b981',
                  fontWeight: 600,
                }}
              >
                {hoveredNode.pnlPercent >= 0 ? '+' : ''}
                {hoveredNode.pnlPercent.toFixed(2)}%
              </span>
            )
          )}
        </div>
      )}

      {/* 穿透分解抽屜 */}
      <LookThroughDetailModal
        isOpen={selectedExposure !== null}
        onClose={() => setSelectedExposure(null)}
        exposure={selectedExposure}
      />
    </div>
  );
};
