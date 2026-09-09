import React, { useState } from 'react';
import { DRIPProjectionYearPoint } from '../../types/firePlanning';

interface DRIPCompoundingChartProps {
  data: DRIPProjectionYearPoint[];
  height?: number;
}

export const DRIPCompoundingChart: React.FC<DRIPCompoundingChartProps> = ({
  data,
  height = 360,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '14px',
        }}
      >
        暫無足夠模擬數據
      </div>
    );
  }

  const padding = { top: 30, right: 30, bottom: 40, left: 75 };
  const chartWidth = 800;
  const chartHeight = height;

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.dripPortfolioValue, d.cashOutPortfolioValue)),
    1_000_000
  );

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - (val / maxVal) * innerHeight;

  // 構造 SVG 路徑
  const dripPoints = data.map((d, i) => `${getX(i)},${getY(d.dripPortfolioValue)}`).join(' ');
  const cashOutPoints = data.map((d, i) => `${getX(i)},${getY(d.cashOutPortfolioValue)}`).join(' ');

  // 構造超額財富填充多邊形 (DRIP 曲線到 CashOut 曲線之間)
  const cashOutReversed = [...data]
    .reverse()
    .map((d, i) => `${getX(data.length - 1 - i)},${getY(d.cashOutPortfolioValue)}`)
    .join(' ');
  const deltaAreaPath = `M ${dripPoints} L ${cashOutReversed} Z`;

  // 格式化金額
  const formatTwd = (val: number) => {
    if (val >= 100_000_000) return `${(val / 100_000_000).toFixed(1)}億`;
    if (val >= 10_000) return `${Math.round(val / 10_000)}萬`;
    return val.toLocaleString();
  };

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="deltaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* 橫向參考格線 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + innerHeight * (1 - ratio);
          const val = maxVal * ratio;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="rgba(51, 65, 85, 0.3)"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="#64748b"
                fontSize="11"
                textAnchor="end"
                fontFamily="sans-serif"
              >
                NT$ {formatTwd(val)}
              </text>
            </g>
          );
        })}

        {/* 年份 X 軸標籤 */}
        {data
          .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
          .map((d, i) => (
            <text
              key={i}
              x={getX(d.year)}
              y={chartHeight - 10}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              第 {d.year} 年
            </text>
          ))}

        {/* 超額財富漸層色區塊 */}
        <path d={deltaAreaPath} fill="url(#deltaGradient)" />

        {/* 情境 A: 提領花掉曲線 (灰色虛線) */}
        <polyline
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="5,5"
          points={cashOutPoints}
        />

        {/* 情境 B: DRIP 股息再投資曲線 (發光翡翠綠實線) */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={dripPoints}
        />

        {/* 互動懸停觸發與指引線 */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + innerHeight}
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            {/* DRIP 點 */}
            <circle
              cx={getX(hoverIndex)}
              cy={getY(data[hoverIndex].dripPortfolioValue)}
              r="5"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {/* Cash Out 點 */}
            <circle
              cx={getX(hoverIndex)}
              cy={getY(data[hoverIndex].cashOutPortfolioValue)}
              r="4"
              fill="#94a3b8"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* 隱形透明覆蓋矩形接收滑鼠移動事件 */}
        {data.map((_, i) => {
          const widthStep = innerWidth / (data.length - 1);
          const x = getX(i) - widthStep / 2;
          return (
            <rect
              key={i}
              x={Math.max(padding.left, x)}
              y={padding.top}
              width={widthStep}
              height={innerHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}
      </svg>

      {/* 懸停浮動 Tooltip */}
      {hoveredItem && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '24px',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            fontSize: '12px',
            color: '#e2e8f0',
            pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
            📅 第 {hoveredItem.year} 年預測對照
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: '#10b981' }}>⚡ DRIP 總市值:</span>
            <span style={{ fontWeight: 600 }}>NT$ {hoveredItem.dripPortfolioValue.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: '#94a3b8' }}>領 提領總市值:</span>
            <span>NT$ {hoveredItem.cashOutPortfolioValue.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
            <span style={{ color: '#fbbf24' }}>🚀 複利放大倍數:</span>
            <span style={{ fontWeight: 600, color: '#fbbf24' }}>{hoveredItem.compoundingMultiplier}x</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: '#34d399' }}>💰 額外多賺資產:</span>
            <span style={{ fontWeight: 600, color: '#34d399' }}>+NT$ {hoveredItem.wealthDeltaTwd.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '4px' }}>
            <span style={{ color: '#93c5fd' }}>💵 預估月配現金流:</span>
            <span>NT$ {hoveredItem.dripMonthlyIncomeNet.toLocaleString()}/月</span>
          </div>
        </div>
      )}
    </div>
  );
};
