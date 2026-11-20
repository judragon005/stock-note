import React from 'react';

export interface SimpleBarDatum {
  label: string;
  value: number;
  displayValue: string;
  isNegative?: boolean;
  isNoData?: boolean;
  note?: string;
}

export interface DualLineSeries {
  name: string;
  values: number[];
  color: string;
}

/**
 * 動態 Baseline 與極端值自適應柱狀走勢圖 (Spec 0241 T06 / Debt 0050)
 */
export function renderSimpleBars(
  data: SimpleBarDatum[],
  color = '#3b82f6',
  unitText?: string
): React.ReactNode {
  if (!data || data.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', padding: '32px 16px', textAlign: 'center' }}>
        暫無歷史季報數據
      </div>
    );
  }

  const validData = data.filter((d) => !d.isNoData && d.displayValue !== '-' && d.displayValue !== 'N/A');
  const values = validData.map((d) => d.value);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 100;
  const allPositive = values.length > 0 && values.every((v) => v >= 0);

  const nonOutlierValues = values.filter((v) => v < 300);
  const normalMax = nonOutlierValues.length > 0 ? Math.max(...nonOutlierValues) : maxVal;
  const visualCap = values.some((v) => v >= 300) ? Math.max(60, normalMax * 1.35) : Math.max(1, maxVal);

  const useDynamicBaseline = allPositive && minVal > 0 && maxVal > minVal * 1.05 && maxVal < 500;
  const baseline = useDynamicBaseline ? minVal * 0.85 : 0;
  const range = Math.max(1, (useDynamicBaseline ? maxVal : visualCap) - baseline);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {unitText && (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
          {unitText}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          height: '210px',
          paddingTop: '24px',
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
        }}
      >
        {data.map((d, idx) => {
          const isNoData = d.isNoData || d.displayValue === '-' || d.displayValue === 'N/A';
          const isOutlier = !isNoData && d.value >= visualCap && d.value > 150;
          const isLoss = d.isNegative || d.value < 0;

          let hPct = 0;
          if (isNoData) {
            hPct = 2;
          } else if (isOutlier) {
            hPct = 100;
          } else if (useDynamicBaseline) {
            hPct = Math.min(100, Math.max(12, ((d.value - baseline) / range) * 100));
          } else {
            hPct = Math.min(100, Math.max(8, (Math.abs(d.value) / visualCap) * 100));
          }

          return (
            <div
              key={idx}
              title={d.note || (isOutlier ? `歷史真實爆發值: ${d.displayValue} (低基期效應)` : undefined)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '42px',
                flex: 1,
                height: '100%',
                justifyContent: 'flex-end',
                cursor: isOutlier || isNoData ? 'help' : 'default',
              }}
            >
              <span
                style={{
                  fontSize: isOutlier ? '9px' : '10px',
                  fontFamily: 'var(--font-mono, monospace)',
                  color: isNoData
                    ? 'var(--text-secondary)'
                    : isLoss
                    ? '#ef4444'
                    : isOutlier
                    ? '#f59e0b'
                    : 'var(--text-secondary)',
                  fontWeight: isOutlier ? 800 : 500,
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isOutlier ? `⚡${d.displayValue}` : d.displayValue}
              </span>
              <div
                style={{
                  width: '100%',
                  maxWidth: '32px',
                  height: `${hPct}%`,
                  borderRadius: isNoData ? '1px' : '4px 4px 0 0',
                  background: isNoData
                    ? 'var(--border-color)'
                    : isLoss
                    ? '#ef4444'
                    : isOutlier
                    ? 'linear-gradient(180deg, #f59e0b 0%, #10b981 100%)'
                    : color,
                  transition: 'all 0.25s ease',
                  boxShadow: isNoData
                    ? 'none'
                    : isLoss
                    ? '0 2px 6px rgba(239, 68, 68, 0.25)'
                    : isOutlier
                    ? '0 2px 8px rgba(245, 158, 11, 0.4)'
                    : `0 2px 6px ${color}40`,
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  marginTop: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 雙線對比柱狀走勢圖與歷史數據表 (如 ROE/ROA、三率走勢) (Spec 0241 T06 / Debt 0050)
 */
export function renderDualLines(
  labels: string[],
  series1: DualLineSeries,
  series2: DualLineSeries,
  unit = '%'
): React.ReactNode {
  const allVals = [...series1.values, ...series2.values];
  const maxVal = Math.max(10, ...allVals);
  const minVal = Math.min(0, ...allVals);
  const range = Math.max(1, maxVal - minVal);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', fontSize: '12px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: series1.color, fontWeight: 700 }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: series1.color }} />
          {series1.name} (最新: {series1.values[series1.values.length - 1]?.toFixed(1)}{unit})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: series2.color, fontWeight: 700 }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: series2.color }} />
          {series2.name} (最新: {series2.values[series2.values.length - 1]?.toFixed(1)}{unit})
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          height: '230px',
          paddingTop: '32px',
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
        }}
      >
        {labels.map((lbl, idx) => {
          const v1 = series1.values[idx] || 0;
          const v2 = series2.values[idx] || 0;
          const h1 = Math.min(100, Math.max(6, ((v1 - minVal) / range) * 100));
          const h2 = Math.min(100, Math.max(6, ((v2 - minVal) / range) * 100));

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '46px',
                flex: 1,
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: series1.color, fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                  {v1.toFixed(1)}{unit}
                </span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: series2.color, fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                  {v2.toFixed(1)}{unit}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '100%', width: '100%', maxWidth: '32px' }}>
                <div style={{ flex: 1, height: `${h1}%`, borderRadius: '3px 3px 0 0', background: series1.color, transition: 'all 0.25s ease' }} />
                <div style={{ flex: 1, height: `${h2}%`, borderRadius: '3px 3px 0 0', background: series2.color, transition: 'all 0.25s ease' }} />
              </div>

              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px', whiteSpace: 'nowrap' }}>
                {lbl}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ overflowX: 'auto', marginTop: '4px' }}>
        <table style={{ width: '100%', fontSize: '11px', textAlign: 'right', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ textAlign: 'left', padding: '4px 6px' }}>指標 / 季度</th>
              {labels.map((lbl, i) => (
                <th key={i} style={{ padding: '4px 6px', fontWeight: 600 }}>{lbl}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ textAlign: 'left', padding: '4px 6px', color: series1.color, fontWeight: 700 }}>{series1.name}</td>
              {series1.values.map((v, i) => (
                <td key={i} style={{ padding: '4px 6px', color: series1.color, fontWeight: 600 }}>{v.toFixed(1)}{unit}</td>
              ))}
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '4px 6px', color: series2.color, fontWeight: 700 }}>{series2.name}</td>
              {series2.values.map((v, i) => (
                <td key={i} style={{ padding: '4px 6px', color: series2.color, fontWeight: 600 }}>{v.toFixed(1)}{unit}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 真實 SVG 多階通道估值河流圖 (PE River / PB River / Dividend River) (Spec 0241 T06 / Debt 0050)
 */
export function renderValuationRiver(
  currentPrice: number,
  labels: string[],
  baseMetrics: number[],
  multipliers: number[],
  metricName: string,
  unitSuffix = 'x',
  historicalPrices?: (number | null)[]
): React.ReactNode {
  if (!labels || labels.length === 0 || !baseMetrics || baseMetrics.length === 0) {
    return <div style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>暫無足夠歷史數據產生河流圖</div>;
  }

  const latestBase = baseMetrics[baseMetrics.length - 1] || 1;
  const sortedMultipliers = [...multipliers].sort((a, b) => a - b);

  const latestTargetPrices = sortedMultipliers.map((m) => Number((latestBase * m).toFixed(2)));
  let currentZoneLabel = '合理';
  let currentZoneColor = '#3b82f6';
  if (currentPrice < latestTargetPrices[0]) {
    currentZoneLabel = `超跌 (<${sortedMultipliers[0]}${unitSuffix})`;
    currentZoneColor = '#10b981';
  } else if (currentPrice <= latestTargetPrices[1]) {
    currentZoneLabel = `便宜 (${sortedMultipliers[0]}${unitSuffix} ~ ${sortedMultipliers[1]}${unitSuffix})`;
    currentZoneColor = '#10b981';
  } else if (currentPrice <= latestTargetPrices[2]) {
    currentZoneLabel = `合理偏低 (${sortedMultipliers[1]}${unitSuffix} ~ ${sortedMultipliers[2]}${unitSuffix})`;
    currentZoneColor = '#06b6d4';
  } else if (currentPrice <= latestTargetPrices[3]) {
    currentZoneLabel = `合理偏高 (${sortedMultipliers[2]}${unitSuffix} ~ ${sortedMultipliers[3]}${unitSuffix})`;
    currentZoneColor = '#f59e0b';
  } else {
    currentZoneLabel = `偏高/昂貴 (>${sortedMultipliers[3]}${unitSuffix})`;
    currentZoneColor = '#ef4444';
  }

  const riverData = labels.map((lbl, idx) => {
    const base = Math.max(0.1, baseMetrics[idx] || latestBase);
    const prices = sortedMultipliers.map((m) => base * m);
    return { label: lbl, base, prices };
  });

  const allRiverPrices = riverData.flatMap((d) => d.prices);
  const maxY = Math.max(currentPrice * 1.2, ...allRiverPrices) * 1.08;
  const minY = Math.max(0, Math.min(currentPrice * 0.8, ...allRiverPrices) * 0.85);
  const yRange = Math.max(1, maxY - minY);

  const svgWidth = 720;
  const svgHeight = 240;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 20;
  const padBottom = 30;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getX = (idx: number) => (labels.length <= 1 ? padLeft + chartW / 2 : padLeft + (idx / (labels.length - 1)) * chartW);
  const getY = (val: number) => padTop + chartH - ((Math.max(minY, Math.min(maxY, val)) - minY) / yRange) * chartH;

  const bandColors = [
    'rgba(16, 185, 129, 0.22)',
    'rgba(6, 182, 212, 0.20)',
    'rgba(59, 130, 246, 0.22)',
    'rgba(245, 158, 11, 0.22)',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            當前股價：<strong style={{ color: 'var(--text-primary)', fontSize: '17px' }}>{currentPrice} 元</strong>
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '6px',
              background: `${currentZoneColor}20`,
              color: currentZoneColor,
              border: `1px solid ${currentZoneColor}50`,
            }}
          >
            落點評估：{currentZoneLabel}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
          {sortedMultipliers.map((m, idx) => (
            <span
              key={idx}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {m}{unitSuffix}: {(latestBase * m).toFixed(1)}元
            </span>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const yVal = minY + yRange * ratio;
            const yPos = getY(yVal);
            return (
              <g key={i}>
                <line x1={padLeft} y1={yPos} x2={svgWidth - padRight} y2={yPos} stroke="var(--border-color)" strokeDasharray="3 3" strokeOpacity={0.4} />
                <text x={padLeft - 6} y={yPos + 4} fill="var(--text-secondary)" fontSize="9" textAnchor="end" fontFamily="monospace">
                  {yVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {[0, 1, 2, 3].map((bandIdx) => {
            const topPoints: string[] = [];
            const bottomPoints: string[] = [];
            riverData.forEach((d, i) => {
              const x = getX(i);
              topPoints.push(`${x},${getY(d.prices[bandIdx + 1])}`);
              bottomPoints.unshift(`${x},${getY(d.prices[bandIdx])}`);
            });
            return <polygon key={`band-${bandIdx}`} points={[...topPoints, ...bottomPoints].join(' ')} fill={bandColors[bandIdx]} stroke="none" />;
          })}

          {sortedMultipliers.map((_, mIdx) => {
            const pathData = riverData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.prices[mIdx])}`).join(' ');
            return (
              <path
                key={`line-${mIdx}`}
                d={pathData}
                fill="none"
                stroke={mIdx === 2 ? '#3b82f6' : 'rgba(255,255,255,0.2)'}
                strokeWidth={mIdx === 2 ? 1.5 : 1}
                strokeDasharray={mIdx === 2 ? 'none' : '4 4'}
              />
            );
          })}

          {(() => {
            const prices = historicalPrices;
            const validPrices = prices?.filter((p): p is number => typeof p === 'number' && p > 0);
            if (prices && validPrices && validPrices.length > 1) {
              const pathParts: string[] = [];
              prices.forEach((p, i) => {
                if (typeof p === 'number' && p > 0) {
                  pathParts.push(`${pathParts.length === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p)}`);
                }
              });
              return (
                <g>
                  <path d={pathParts.join(' ')} fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                  {prices.map((p, i) => {
                    if (typeof p !== 'number' || p <= 0) return null;
                    return <circle key={`hp-${i}`} cx={getX(i)} cy={getY(p)} r="3" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />;
                  })}
                </g>
              );
            }
            return null;
          })()}

          {currentPrice > 0 && (
            <line
              x1={getX(labels.length - 1)}
              y1={padTop}
              x2={getX(labels.length - 1)}
              y2={padTop + chartH}
              stroke="rgba(244, 63, 94, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {currentPrice > 0 && (
            <g>
              <circle cx={getX(labels.length - 1)} cy={getY(currentPrice)} r="5.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
              <rect x={getX(labels.length - 1) - 48} y={Math.max(padTop, getY(currentPrice) - 26)} width="54" height="18" rx="4" fill="#f43f5e" />
              <text
                x={getX(labels.length - 1) - 21}
                y={Math.max(padTop, getY(currentPrice) - 26) + 12}
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {currentPrice}元
              </text>
            </g>
          )}

          {riverData.map((d, i) => {
            if (labels.length > 12 && i % 2 !== 0 && i !== labels.length - 1) return null;
            return (
              <text key={`lbl-${i}`} x={getX(i)} y={svgHeight - 8} fill="var(--text-secondary)" fontSize="9" textAnchor="middle" fontFamily="monospace">
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', fontSize: '11px', textAlign: 'right', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>季度</th>
              <th style={{ padding: '6px 8px' }}>基底 ({metricName})</th>
              {sortedMultipliers.map((m, i) => (
                <th key={i} style={{ padding: '6px 8px' }}>{m}{unitSuffix}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {riverData.slice(-8).map((row, rIdx) => (
              <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}</td>
                <td style={{ padding: '6px 8px', color: '#06b6d4', fontWeight: 600 }}>{row.base.toFixed(2)}元</td>
                {row.prices.map((p, pIdx) => (
                  <td key={pIdx} style={{ padding: '6px 8px', fontFamily: 'monospace', color: pIdx === 2 ? '#3b82f6' : 'var(--text-secondary)' }}>
                    {p.toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
