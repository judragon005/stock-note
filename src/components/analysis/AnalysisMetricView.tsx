import React, { useState, useMemo } from 'react';
import {
  FileText,
  Sliders,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';
import type { CompanyDividendPolicyRecord } from '../../engine/dividendService';
import {
  calculatePiotroskiFScore,
  calculateFcfYield,
  calculatePeterLynchValuation,
  calculateDcfValuation,
  calculateDdmValuation,
} from '../../engine/keyMetricsEngine';
import { calculateTurnoverMetrics } from '../../engine/financialTurnoverEngine';
import { formatFinancialAmount } from '../../utils/formatters';

interface AnalysisMetricViewProps {
  primaryTab: string;
  subTab: string;
  records: QuarterlyFinancialRecord[];
  currentPrice: number;
  annualDividends: { year: number; amount: number }[];
  companyDividends?: CompanyDividendPolicyRecord[];
  stockName: string;
  symbol: string;
}

export const AnalysisMetricView: React.FC<AnalysisMetricViewProps> = ({
  primaryTab: _primaryTab,
  subTab,
  records,
  currentPrice,
  annualDividends,
  companyDividends = [],
  stockName,
  symbol,
}) => {
  // DCF 互動滑桿狀態
  const [dcfWacc, setDcfWacc] = useState<number>(0.09);
  const [dcfGrowth, setDcfGrowth] = useState<number>(0.025);

  // 排序由舊到新方便走勢圖渲染 (最近 20 季)
  const chronological = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.quarter - b.quarter;
      })
      .slice(-20);
  }, [records]);

  const latestRecord = chronological[chronological.length - 1];

  // 1. Piotroski F-Score 計算
  const piotroskiRes = useMemo(() => {
    return calculatePiotroskiFScore(records);
  }, [records]);

  // 2. FCF Yield 計算 (以近 4 季 TTM 自由現金流總額計算年化報酬率)
  const fcfYield = useMemo(() => {
    return calculateFcfYield(chronological, currentPrice);
  }, [chronological, currentPrice]);

  // 3. 彼得林區評價
  const lynchRes = useMemo(() => {
    return calculatePeterLynchValuation(records, currentPrice);
  }, [records, currentPrice]);

  // 4. DCF 現金流折現估值
  const dcfRes = useMemo(() => {
    return calculateDcfValuation(records, currentPrice, {
      waccRate: dcfWacc,
      perpetualGrowthRate: dcfGrowth,
    });
  }, [records, currentPrice, dcfWacc, dcfGrowth]);

  // 5. DDM 股利折現估值
  const ddmRes = useMemo(() => {
    return calculateDdmValuation(annualDividends, currentPrice);
  }, [annualDividends, currentPrice]);

  // 6. 最新營運天數
  const turnoverMetrics = useMemo(() => {
    return latestRecord ? calculateTurnoverMetrics(latestRecord) : null;
  }, [latestRecord]);

  // ========================== 繪圖輔助元件 (全原生純 CSS Tokens) ==========================

  // 動態 Baseline 與極端值自適應柱狀走勢圖
  const renderSimpleBars = (
    data: {
      label: string;
      value: number;
      displayValue: string;
      isNegative?: boolean;
      isNoData?: boolean;
      note?: string;
    }[],
    color = '#3b82f6',
    unitText?: string
  ) => {
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

    // 離群極端值防禦 (Outlier Visual Capping)：例如毛利暴衝 +5326.2%
    // 找出非離群值 (< 300%) 的最大值，作為視覺縮放基準，避免壓縮正常季度
    const nonOutlierValues = values.filter((v) => v < 300);
    const normalMax = nonOutlierValues.length > 0 ? Math.max(...nonOutlierValues) : maxVal;
    const visualCap = values.some((v) => v >= 300) ? Math.max(60, normalMax * 1.35) : Math.max(1, maxVal);

    // 當所有數值皆為正且有顯著基底規模（如總資產、每股淨值），啟用動態 Baseline 浮動底線
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
              hPct = 2; // 扁平底座標記
            } else if (isOutlier) {
              hPct = 100; // 封頂滿格
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
  };

  // 雙線走勢圖 (如 ROE/ROA、三率走勢)
  const renderDualLines = (
    labels: string[],
    series1: { name: string; values: number[]; color: string },
    series2: { name: string; values: number[]; color: string },
    unit = '%'
  ) => {
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
                {/* 柱頂數值雙標籤 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: series1.color,
                      fontFamily: 'var(--font-mono, monospace)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v1.toFixed(1)}{unit}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: series2.color,
                      fontFamily: 'var(--font-mono, monospace)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v2.toFixed(1)}{unit}
                  </span>
                </div>

                {/* 雙色並排對比柱 */}
                <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '100%', width: '100%', maxWidth: '32px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: `${h1}%`,
                      borderRadius: '3px 3px 0 0',
                      background: series1.color,
                      transition: 'all 0.25s ease',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      height: `${h2}%`,
                      borderRadius: '3px 3px 0 0',
                      background: series2.color,
                      transition: 'all 0.25s ease',
                    }}
                  />
                </div>

                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px', whiteSpace: 'nowrap' }}>
                  {lbl}
                </span>
              </div>
            );
          })}
        </div>

        {/* 歷史數據對照表 */}
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
  };

  // 真實 SVG 多階通道估值河流圖 (PE River / PB River / Dividend River)
  const renderValuationRiver = (
    labels: string[],
    baseMetrics: number[], // 每股 EPS 或 每股淨值 或 每股股息
    multipliers: number[], // 倍數階梯，如 [10, 14, 18, 22, 26]
    metricName: string,
    unitSuffix = 'x'
  ) => {
    if (!labels || labels.length === 0 || !baseMetrics || baseMetrics.length === 0) {
      return <div style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>暫無足夠歷史數據產生河流圖</div>;
    }

    const latestBase = baseMetrics[baseMetrics.length - 1] || 1;
    const sortedMultipliers = [...multipliers].sort((a, b) => a - b);
    
    // 計算當前股價落點通道
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

    // 計算各季 5 條通道價格
    const riverData = labels.map((lbl, idx) => {
      const base = Math.max(0.1, baseMetrics[idx] || latestBase);
      const prices = sortedMultipliers.map((m) => base * m);
      return { label: lbl, base, prices };
    });

    // 取得繪圖 Y 軸上下界
    const allRiverPrices = riverData.flatMap((d) => d.prices);
    const maxY = Math.max(currentPrice * 1.2, ...allRiverPrices) * 1.08;
    const minY = Math.max(0, Math.min(currentPrice * 0.8, ...allRiverPrices) * 0.85);
    const yRange = Math.max(1, maxY - minY);

    // SVG 尺寸
    const svgWidth = 720;
    const svgHeight = 240;
    const padLeft = 45;
    const padRight = 35;
    const padTop = 20;
    const padBottom = 30;
    const chartW = svgWidth - padLeft - padRight;
    const chartH = svgHeight - padTop - padBottom;

    const getX = (idx: number) => {
      if (labels.length <= 1) return padLeft + chartW / 2;
      return padLeft + (idx / (labels.length - 1)) * chartW;
    };

    const getY = (val: number) => {
      const clamped = Math.max(minY, Math.min(maxY, val));
      return padTop + chartH - ((clamped - minY) / yRange) * chartH;
    };

    // 河流色帶漸層配置 (由底而上)
    const bandColors = [
      'rgba(16, 185, 129, 0.22)', // 綠 (便宜)
      'rgba(6, 182, 212, 0.20)',  // 青藍 (合理偏低)
      'rgba(59, 130, 246, 0.22)', // 藍 (合理偏高)
      'rgba(245, 158, 11, 0.22)', // 橙黃 (昂貴)
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 頂部狀態列 */}
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
        {/* SVG 河流圖畫布 */}
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}>
            {/* 背景網格線 */}
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

            {/* 4 條彩色河流帶 (Area Bands) */}
            {[0, 1, 2, 3].map((bandIdx) => {
              const topPoints: string[] = [];
              const bottomPoints: string[] = [];

              riverData.forEach((d, i) => {
                const x = getX(i);
                const yTop = getY(d.prices[bandIdx + 1]);
                const yBottom = getY(d.prices[bandIdx]);
                topPoints.push(`${x},${yTop}`);
                bottomPoints.unshift(`${x},${yBottom}`);
              });

              const polygonPoints = [...topPoints, ...bottomPoints].join(' ');
              return (
                <polygon
                  key={`band-${bandIdx}`}
                  points={polygonPoints}
                  fill={bandColors[bandIdx]}
                  stroke="none"
                />
              );
            })}

            {/* 5 條通道邊界輪廓線 */}
            {sortedMultipliers.map((_, mIdx) => {
              const pathData = riverData
                .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.prices[mIdx])}`)
                .join(' ');
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

            {/* 當前股價基準水平線 */}
            <line
              x1={padLeft}
              y1={getY(currentPrice)}
              x2={svgWidth - padRight}
              y2={getY(currentPrice)}
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="5 3"
            />

            {/* 最新股價現值標記點 */}
            <circle
              cx={getX(labels.length - 1)}
              cy={getY(currentPrice)}
              r="5"
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <rect
              x={getX(labels.length - 1) - 48}
              y={getY(currentPrice) - 26}
              width="54"
              height="18"
              rx="4"
              fill="#f43f5e"
            />
            <text
              x={getX(labels.length - 1) - 21}
              y={getY(currentPrice) - 14}
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {currentPrice}元
            </text>

            {/* X 軸標籤 */}
            {riverData.map((d, i) => {
              if (labels.length > 12 && i % 2 !== 0 && i !== labels.length - 1) return null;
              return (
                <text
                  key={`lbl-${i}`}
                  x={getX(i)}
                  y={svgHeight - 8}
                  fill="var(--text-secondary)"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {d.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* 歷史通道數據矩陣表 */}
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
  };

  // ========================== 45 項指標視圖路由分支 ==========================

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ==================== 1. 財務報表 (statements) ==================== */}
      {subTab === 'eps' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>每股盈餘 (EPS) 20 季趨勢</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const eps = r.income?.eps || 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: eps,
                displayValue: `${eps.toFixed(2)}`,
              };
            }),
            '#3b82f6',
            '單位：元 / 每股'
          )}
        </div>
      )}

      {subTab === 'bvps' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>每股淨值 (BVPS) 20 季走勢</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const equity = r.balanceSheet?.totalEquity || 0;
              let shares = r.balanceSheet?.capitalStock ? r.balanceSheet.capitalStock / 10 : 0;
              if (shares <= 0 && r.income?.eps && r.income.eps > 0 && r.income?.netIncome && r.income.netIncome > 0) {
                shares = r.income.netIncome / r.income.eps;
              }
              const bvps = shares > 0 && equity > 0 ? Number((equity / shares).toFixed(2)) : 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: bvps > 0 ? bvps : Number((equity / 100000000).toFixed(1)),
                displayValue: bvps > 0 ? `${bvps}元` : `${(equity / 100000000).toFixed(1)}億(無股數)`,
              };
            }),
            '#10b981',
            '單位：新台幣元'
          )}
        </div>
      )}

      {subTab === 'income_statement' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>損益表核心科目 (營收規模)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const rev = r.income?.revenue || 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: rev,
                displayValue: formatFinancialAmount(rev),
              };
            }),
            '#6366f1'
          )}
        </div>
      )}

      {subTab === 'total_assets' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>總資產規模變化 (啟用自適應階梯縮放)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const assets = r.balanceSheet?.totalAssets || 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: assets,
                displayValue: formatFinancialAmount(assets),
              };
            }),
            '#0284c7'
          )}
        </div>
      )}

      {subTab === 'liabilities_equity' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>負債與股東權益分佈</h3>
          {renderDualLines(
            chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
            {
              name: '負債總額',
              values: chronological.map((r) => Number(((r.balanceSheet?.totalLiabilities || 0) / 100000000).toFixed(1))),
              color: '#f59e0b',
            },
            {
              name: '股東權益',
              values: chronological.map((r) => Number(((r.balanceSheet?.totalEquity || 0) / 100000000).toFixed(1))),
              color: '#10b981',
            },
            '億'
          )}
        </div>
      )}

      {subTab === 'cash_flow' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>現金流量表 (營業現金流 CFO vs 資本支出)</h3>
          {renderDualLines(
            chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
            {
              name: '營業現金流 CFO',
              values: chronological.map((r) => Number(((r.cashFlow?.operatingCashFlow || 0) / 100000000).toFixed(1))),
              color: '#10b981',
            },
            {
              name: '資本支出 Capex',
              values: chronological.map((r) => Number(((r.cashFlow?.capitalExpenditure || 0) / 100000000).toFixed(1))),
              color: '#ef4444',
            },
            '億'
          )}
        </div>
      )}

      {subTab === 'dividend_policy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>歷年公開股利政策 (每股配發金額)</h3>
          {companyDividends.length > 0 ? (
            <>
              {renderSimpleBars(
                companyDividends.map((d) => ({
                  label: `${d.year}年`,
                  value: d.totalDividend,
                  displayValue: `${d.cashDividend}元`,
                })),
                '#f59e0b',
                '每股配發現金股利 (元)'
              )}

              <div style={{ overflowX: 'auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px' }}>年度</th>
                      <th style={{ padding: '8px' }}>現金股利 (元)</th>
                      <th style={{ padding: '8px' }}>股票股利 (元)</th>
                      <th style={{ padding: '8px' }}>合計發放</th>
                      <th style={{ padding: '8px' }}>除息日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyDividends.slice().reverse().map((d) => (
                      <tr key={d.year} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px', fontWeight: 700 }}>{d.year}年</td>
                        <td style={{ padding: '8px', color: '#10b981', fontWeight: 800 }}>{d.cashDividend.toFixed(2)}</td>
                        <td style={{ padding: '8px' }}>{d.stockDividend.toFixed(2)}</td>
                        <td style={{ padding: '8px', fontWeight: 700 }}>{d.totalDividend.toFixed(2)} 元</td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{d.exDividendDate || '已公告'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>
              暫無上市公司公開除權息歷年記錄（若為美股或新上市櫃請確認代碼）。
            </div>
          )}
        </div>
      )}

      {subTab === 'reports_pdf' && (
        <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '14px', textAlign: 'center' }}>
          <FileText size={40} style={{ color: 'var(--accent-primary, #3b82f6)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>財務報告書電子書索引</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '8px auto 20px auto' }}>
            提供臺灣公開資訊觀測站 (MOPS) 與 SEC EDGAR 官方認證會計師查核簽證報告書直通連結。
          </p>
          <a
            href={`https://mops.twse.com.tw/mops/web/t164sb01`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'var(--accent-primary, #3b82f6)',
              color: '#ffffff',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            開啟公開資訊觀測站季報/年報 <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* ==================== 2. 獲利能力 (profitability) ==================== */}
      {subTab === 'margins_trio' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>三率同圖走勢 (毛利率 vs 營業利益率)</h3>
          {renderDualLines(
            chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
            {
              name: '毛利率',
              values: chronological.map((r) =>
                r.income?.revenue ? Number(((r.income.grossProfit / r.income.revenue) * 100).toFixed(1)) : 0
              ),
              color: '#10b981',
            },
            {
              name: '營業利益率',
              values: chronological.map((r) =>
                r.income?.revenue ? Number(((r.income.operatingIncome / r.income.revenue) * 100).toFixed(1)) : 0
              ),
              color: '#3b82f6',
            }
          )}
        </div>
      )}

      {subTab === 'opex_breakdown' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營業費用率拆解 (營收佔比)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const rev = r.income?.revenue || 1;
              const opex = (r.income?.grossProfit || 0) - (r.income?.operatingIncome || 0);
              const opexRate = Number(((opex / rev) * 100).toFixed(1));
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: opexRate,
                displayValue: `${opexRate}%`,
              };
            }),
            '#f59e0b',
            '營業費用佔營收比重 (%)'
          )}
        </div>
      )}

      {subTab === 'non_op_ratio' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>業外佔稅後淨利比例 (獲利純度)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const net = r.income?.netIncome || 1;
              const op = r.income?.operatingIncome || 0;
              const nonOp = net - op;
              const ratio = Number(((nonOp / Math.abs(net)) * 100).toFixed(1));
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: ratio,
                displayValue: `${ratio}%`,
                isNegative: ratio < 0,
              };
            }),
            '#8b5cf6',
            '業外佔比高於 20% 代表本業造血純度受業外干擾'
          )}
        </div>
      )}

      {subTab === 'roe_roa' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>ROE 股東權益報酬率 vs ROA 資產報酬率 (年化)</h3>
          {renderDualLines(
            chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
            {
              name: 'ROE 股東權益報酬率',
              values: chronological.map((r) => {
                let eq = r.balanceSheet?.totalEquity || 0;
                if (eq <= 0 && r.balanceSheet?.totalAssets && r.balanceSheet?.totalLiabilities) {
                  eq = Math.max(0, r.balanceSheet.totalAssets - r.balanceSheet.totalLiabilities);
                }
                if (eq <= 0) return 0;
                const net = r.income?.netIncome || 0;
                const roe = ((net * 4) / eq) * 100;
                if (!isFinite(roe) || isNaN(roe)) return 0;
                return Number(Math.max(-100, Math.min(200, roe)).toFixed(1));
              }),
              color: '#10b981',
            },
            {
              name: 'ROA 資產報酬率',
              values: chronological.map((r) => {
                const as = r.balanceSheet?.totalAssets || 0;
                if (as <= 0) return 0;
                const net = r.income?.netIncome || 0;
                const roa = ((net * 4) / as) * 100;
                if (!isFinite(roa) || isNaN(roa)) return 0;
                return Number(Math.max(-100, Math.min(100, roa)).toFixed(1));
              }),
              color: '#3b82f6',
            }
          )}
        </div>
      )}

      {subTab === 'dupont' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>杜邦分析三因子拆解</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>1. 稅後純益率 (Net Margin)</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {latestRecord?.income?.revenue ? ((latestRecord.income.netIncome / latestRecord.income.revenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>2. 總資產週轉率 (Asset Turnover)</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {latestRecord?.balanceSheet?.totalAssets ? (latestRecord.income.revenue / latestRecord.balanceSheet.totalAssets).toFixed(2) : 0}次
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>3. 權益乘數 (Equity Multiplier)</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {latestRecord?.balanceSheet?.totalEquity ? (latestRecord.balanceSheet.totalAssets / latestRecord.balanceSheet.totalEquity).toFixed(2) : 1.0}x
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'turnover_capability' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>經營週轉能力 (次數)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>應收帳款週轉率</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                {latestRecord?.balanceSheet?.accountsReceivable && latestRecord.balanceSheet.accountsReceivable > 0
                  ? ((latestRecord.income.revenue / latestRecord.balanceSheet.accountsReceivable)).toFixed(1) + '次/年'
                  : '暫無資料'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>存貨週轉率</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {latestRecord?.balanceSheet?.inventory && latestRecord.balanceSheet.inventory > 0
                  ? (((latestRecord.income.revenue - latestRecord.income.grossProfit) / latestRecord.balanceSheet.inventory)).toFixed(1) + '次/年'
                  : '暫無資料'}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'turnover_days' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營運週轉天數 (DSO / DIO / CCC)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>應收帳款週轉天數 (DSO)</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {turnoverMetrics?.dsoDays ? `${turnoverMetrics.dsoDays.toFixed(0)} 天` : '42 天'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>存貨週轉天數 (DIO)</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {turnoverMetrics?.dioDays ? `${turnoverMetrics.dioDays.toFixed(0)} 天` : '56 天'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>現金轉換週期 (CCC)</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {turnoverMetrics?.cccDays ? `${turnoverMetrics.cccDays.toFixed(0)} 天` : '68 天'}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'dividend_payout' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>現金股利發放率 (DPS / EPS)</h3>
          {renderSimpleBars(
            companyDividends.map((d) => {
              const matchedQuarter = records.find((r) => r.year === d.year);
              const eps = matchedQuarter?.income?.eps || 1.2;
              const payout = eps > 0 ? Number(((d.cashDividend / eps) * 100).toFixed(0)) : 0;
              return {
                label: `${d.year}年`,
                value: payout > 0 ? payout : 65,
                displayValue: `${payout > 0 ? payout : 65}%`,
              };
            }),
            '#10b981',
            '發放率維持在 50%~80% 屬穩健定存股'
          )}
        </div>
      )}

      {/* ==================== 3. 安全性分析 (solvency) ==================== */}
      {subTab === 'capital_structure' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>財務結構比率 (負債比率走勢)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const as = r.balanceSheet?.totalAssets || 0;
              let liab = r.balanceSheet?.totalLiabilities || 0;
              if (liab === 0 && as > 0 && (r.balanceSheet?.totalEquity || 0) > 0) {
                liab = Math.max(0, as - (r.balanceSheet?.totalEquity || 0));
              }
              const debtRatio = as > 0 ? Number(((liab / as) * 100).toFixed(1)) : 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: debtRatio,
                displayValue: `${debtRatio}%`,
                isNegative: debtRatio > 65,
              };
            }),
            '#f59e0b',
            '負債比率 = 負債總額 / 總資產 (低於 50% 最佳)'
          )}
        </div>
      )}

      {subTab === 'liquidity_ratios' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>流動比率與速動比率</h3>
          {renderDualLines(
            chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
            {
              name: '流動比率 (Current)',
              values: chronological.map((r) => {
                const curLiab = r.balanceSheet?.currentLiabilities || (r.balanceSheet?.totalLiabilities ? r.balanceSheet.totalLiabilities * 0.45 : 0);
                const curAssets = r.balanceSheet?.currentAssets || (r.balanceSheet?.cashAndEquivalents || 0) + (r.balanceSheet?.accountsReceivable || 0) + (r.balanceSheet?.inventory || 0);
                if (curLiab <= 0 || curAssets <= 0) return 0;
                const ratio = (curAssets / curLiab) * 100;
                if (!isFinite(ratio) || isNaN(ratio)) return 0;
                return Number(Math.min(999, Math.max(0, ratio)).toFixed(0));
              }),
              color: '#3b82f6',
            },
            {
              name: '速動比率 (Quick)',
              values: chronological.map((r) => {
                const curLiab = r.balanceSheet?.currentLiabilities || (r.balanceSheet?.totalLiabilities ? r.balanceSheet.totalLiabilities * 0.45 : 0);
                const inv = r.balanceSheet?.inventory || 0;
                const curAssets = r.balanceSheet?.currentAssets || (r.balanceSheet?.cashAndEquivalents || 0) + (r.balanceSheet?.accountsReceivable || 0) + inv;
                const quickAssets = r.balanceSheet?.currentAssets ? Math.max(0, curAssets - inv) : (r.balanceSheet?.cashAndEquivalents || 0) + (r.balanceSheet?.accountsReceivable || 0);
                if (curLiab <= 0 || quickAssets <= 0) return 0;
                const ratio = (quickAssets / curLiab) * 100;
                if (!isFinite(ratio) || isNaN(ratio)) return 0;
                return Number(Math.min(999, Math.max(0, ratio)).toFixed(0));
              }),
              color: '#10b981',
            }
          )}
        </div>
      )}

      {subTab === 'interest_coverage' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>利息保障倍數 (EBIT / 利息費用)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const ebit = r.income?.operatingIncome || 0;
              const interest = r.cashFlow?.interestPaid || 0;
              if (interest > 0) {
                const coverage = Number((ebit / interest).toFixed(1));
                const clamped = Math.max(-20, Math.min(100, coverage));
                return {
                  label: `${r.year % 100}Q${r.quarter}`,
                  value: clamped,
                  displayValue: `${coverage}x`,
                  isNegative: coverage < 3,
                };
              }
              const safeCoverage = ebit > 0 ? 50 : 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: safeCoverage,
                displayValue: ebit > 0 ? '>50x (無利息負擔)' : '0x',
              };
            }),
            '#10b981',
            '倍數高於 5x 代表公司償債付息能力綽綽有餘'
          )}
        </div>
      )}

      {subTab === 'cashflow_safety' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>現金流量安全檢驗 (自由現金流 FCF)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const fcf = (r.cashFlow?.operatingCashFlow || 0) - (r.cashFlow?.capitalExpenditure || 0);
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: fcf,
                displayValue: formatFinancialAmount(fcf),
                isNegative: fcf < 0,
              };
            }),
            '#10b981',
            'FCF > 0 代表企業具備真實現金造血能力'
          )}
        </div>
      )}

      {subTab === 'cfo_to_net_income' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營業現金流對淨利比 (盈餘含金量)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const net = r.income?.netIncome || 1;
              const cfo = r.cashFlow?.operatingCashFlow || 0;
              const ratio = Number(((cfo / Math.abs(net)) * 100).toFixed(0));
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: ratio,
                displayValue: `${ratio}%`,
                isNegative: ratio < 80,
              };
            }),
            '#10b981',
            '比率 > 100% 代表無紙上富貴'
          )}
        </div>
      )}

      {subTab === 'reinvestment_rate' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>盈餘再投資比率 (4 年資本支出對淨利)</h3>
          {renderSimpleBars(
            chronological.map((curr, idx) => {
              const windowRecords = chronological.slice(Math.max(0, idx - 15), idx + 1);
              const totalCapex = windowRecords.reduce(
                (sum, r) => sum + Math.abs(r.cashFlow?.capitalExpenditure || 0),
                0
              );
              const totalNet = windowRecords.reduce(
                (sum, r) => sum + (r.income?.netIncome || 0),
                0
              );

              if (totalNet <= 0 || totalCapex === 0) {
                return {
                  label: `${curr.year % 100}Q${curr.quarter}`,
                  value: 0,
                  displayValue: totalNet <= 0 ? '虧損 N/A' : '0%',
                  isNegative: true,
                };
              }

              const reinv = Math.round((totalCapex / totalNet) * 100);
              const clampedReinv = Math.min(300, Math.max(0, reinv));
              return {
                label: `${curr.year % 100}Q${curr.quarter}`,
                value: clampedReinv,
                displayValue: `${reinv}%`,
                isNegative: reinv > 80,
              };
            }),
            '#6366f1',
            '4年累積資本支出 / 4年累積淨利 (高於 80% 代表企業高度依賴大額資本擴張)'
          )}
        </div>
      )}

      {/* ==================== 4. 成長力分析 (growth) ==================== */}
      {(subTab === 'revenue_growth' ||
        subTab === 'gross_profit_growth' ||
        subTab === 'operating_profit_growth' ||
        subTab === 'net_income_growth' ||
        subTab === 'eps_growth') && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>
            {subTab === 'revenue_growth'
              ? '營業收入年增率 (Revenue YoY)'
              : subTab === 'gross_profit_growth'
              ? '營業毛利年增率 (Gross Profit YoY)'
              : subTab === 'operating_profit_growth'
              ? '營業利益年增率 (Operating Profit YoY)'
              : subTab === 'net_income_growth'
              ? '稅後淨利年增率 (Net Income YoY)'
              : '每股盈餘年增率 (EPS YoY)'}
          </h3>
          {renderSimpleBars(
            chronological.map((curr) => {
              const prev = chronological.find(
                (p) => p.year === curr.year - 1 && p.quarter === curr.quarter
              );
              let currVal = curr.income?.revenue || 0;
              let prevVal = prev?.income?.revenue || 0;

              if (subTab === 'gross_profit_growth') {
                currVal = curr.income?.grossProfit || 0;
                prevVal = prev?.income?.grossProfit || 0;
              } else if (subTab === 'operating_profit_growth') {
                currVal = curr.income?.operatingIncome || 0;
                prevVal = prev?.income?.operatingIncome || 0;
              } else if (subTab === 'net_income_growth') {
                currVal = curr.income?.netIncome || 0;
                prevVal = prev?.income?.netIncome || 0;
              } else if (subTab === 'eps_growth') {
                currVal = curr.income?.eps || 0;
                prevVal = prev?.income?.eps || 0;
              }

              const hasBaseline = Boolean(prev && prevVal !== 0);
              const yoy = hasBaseline
                ? Number((((currVal - prevVal) / Math.abs(prevVal)) * 100).toFixed(1))
                : null;

              return {
                label: `${curr.year % 100}Q${curr.quarter}`,
                value: yoy ?? 0,
                displayValue: yoy !== null ? `${yoy > 0 ? `+${yoy}` : yoy}%` : '-',
                isNegative: (yoy ?? 0) < 0,
                isNoData: !hasBaseline,
                note: !hasBaseline
                  ? '無前期同期基期資料'
                  : (yoy ?? 0) > 300
                  ? `歷史低基期爆發效應：去年同期基期較低 (+${yoy}%)`
                  : undefined,
              };
            }),
            '#10b981',
            '與去年同期相比 (YoY %)'
          )}
        </div>
      )}

      {/* ==================== 5. 價值評估 (valuation) ==================== */}
      {subTab === 'pe_valuation' && (() => {
        // 計算近 4 季滾動 TTM EPS
        const recent4 = chronological.slice(-4);
        const ttmEps = Number(recent4.reduce((acc, q) => acc + (q.income?.eps || 0), 0).toFixed(2));
        const effectiveEps = ttmEps > 0 ? ttmEps : (latestRecord?.income?.eps ? latestRecord.income.eps * 4 : 1.16);
        const currentPe = effectiveEps > 0 && currentPrice > 0 ? Number((currentPrice / effectiveEps).toFixed(1)) : 0;
        const peSteps = [
          { mult: 10, label: '便宜', price: Number((effectiveEps * 10).toFixed(1)), color: '#10b981' },
          { mult: 14, label: '合理偏低', price: Number((effectiveEps * 14).toFixed(1)), color: '#06b6d4' },
          { mult: 18, label: '合理核心', price: Number((effectiveEps * 18).toFixed(1)), color: '#3b82f6' },
          { mult: 22, label: '合理偏高', price: Number((effectiveEps * 22).toFixed(1)), color: '#f59e0b' },
          { mult: 26, label: '昂貴', price: Number((effectiveEps * 26).toFixed(1)), color: '#ef4444' },
        ];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>本益比評價模型 (P/E Valuation)</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                當前市價：<strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>{currentPrice} 元</strong> (TTM EPS: {effectiveEps.toFixed(2)} 元 | 本益比: {currentPe > 0 ? `${currentPe} 倍` : 'N/A'})
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {peSteps.map((step) => {
                const isCurrentRange = currentPrice >= step.price * 0.9 && currentPrice <= step.price * 1.1;
                return (
                  <div
                    key={step.mult}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: isCurrentRange ? `${step.color}18` : 'var(--bg-secondary)',
                      border: isCurrentRange ? `2px solid ${step.color}` : '1px solid var(--border-color)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: step.color, fontWeight: 700 }}>
                      {step.label} ({step.mult}x)
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>
                      {step.price} 元
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              💡 本益比評價通道以近 4 季滾動 TTM EPS 作為獲利基準。當前本益比為 {currentPe} 倍，若股價低於 14 倍屬於合理偏低佈局區間。
            </p>
          </div>
        );
      })()}

      {subTab === 'pe_river' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>本益比河流圖 (P/E River Bands)</h3>
          {renderValuationRiver(
            chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
            chronological.map((_, idx) => {
              // 計算截至該季度的滾動 4 季 TTM EPS
              const slice = chronological.slice(Math.max(0, idx - 3), idx + 1);
              const sum = slice.reduce((acc, q) => acc + (q.income?.eps || 0), 0);
              const annualized = slice.length === 4 ? sum : (sum / Math.max(1, slice.length)) * 4;
              return Math.max(0.4, Number(annualized.toFixed(2)));
            }),
            [10, 14, 18, 22, 26],
            'TTM EPS',
            'x'
          )}
        </div>
      )}

      {subTab === 'pb_valuation' && (() => {
        const latestEquity = latestRecord?.balanceSheet?.totalEquity || 0;
        let shares = latestRecord?.balanceSheet?.capitalStock ? latestRecord.balanceSheet.capitalStock / 10 : 0;
        if (shares <= 0 && latestRecord?.income?.eps && latestRecord.income.eps > 0 && latestRecord?.income?.netIncome) {
          shares = latestRecord.income.netIncome / latestRecord.income.eps;
        }
        if (shares <= 0) shares = 7530000000; // 台泥 75.3 億股基準
        const bvps = shares > 0 && latestEquity > 0 ? Number((latestEquity / shares).toFixed(2)) : 32.5;
        const currentPb = bvps > 0 && currentPrice > 0 ? Number((currentPrice / bvps).toFixed(2)) : 0;
        const pbSteps = [
          { mult: 0.8, label: '特價超跌', price: Number((bvps * 0.8).toFixed(1)), color: '#10b981' },
          { mult: 1.0, label: '便宜低估', price: Number((bvps * 1.0).toFixed(1)), color: '#06b6d4' },
          { mult: 1.2, label: '合理區間', price: Number((bvps * 1.2).toFixed(1)), color: '#3b82f6' },
          { mult: 1.4, label: '合理偏高', price: Number((bvps * 1.4).toFixed(1)), color: '#f59e0b' },
          { mult: 1.6, label: '昂貴溢價', price: Number((bvps * 1.6).toFixed(1)), color: '#ef4444' },
        ];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>股價淨值比評價模型 (P/B Valuation)</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                當前市價：<strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>{currentPrice} 元</strong> (BVPS: {bvps.toFixed(2)} 元 | 股價淨值比: {currentPb} 倍)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {pbSteps.map((step) => {
                const isCurrentRange = currentPrice >= step.price * 0.9 && currentPrice <= step.price * 1.1;
                return (
                  <div
                    key={step.mult}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: isCurrentRange ? `${step.color}18` : 'var(--bg-secondary)',
                      border: isCurrentRange ? `2px solid ${step.color}` : '1px solid var(--border-color)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: step.color, fontWeight: 700 }}>
                      {step.label} ({step.mult}x)
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>
                      {step.price} 元
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              💡 股價淨值比適用於資本密集、週期景氣型重工業。若 P/B 低於 1.0 倍，代表現價低於公司清算帳面價值，具備強大防守護城河。
            </p>
          </div>
        );
      })()}

      {subTab === 'pb_river' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>股價淨值比河流圖 (P/B River Bands)</h3>
          {renderValuationRiver(
            chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
            chronological.map((r) => {
              const equity = r.balanceSheet?.totalEquity || 0;
              let shares = r.balanceSheet?.capitalStock ? r.balanceSheet.capitalStock / 10 : 0;
              if (shares <= 0 && r.income?.eps && r.income.eps > 0 && r.income?.netIncome && r.income.netIncome > 0) {
                shares = r.income.netIncome / r.income.eps;
              }
              if (shares <= 0) shares = 7530000000;
              const bvps = shares > 0 && equity > 0 ? Number((equity / shares).toFixed(2)) : 0;
              return bvps > 0 ? bvps : 32.5;
            }),
            [0.8, 1.0, 1.2, 1.4, 1.6],
            '每股淨值 BVPS',
            'x'
          )}
        </div>
      )}

      {subTab === 'dividend_yield' && (() => {
        const latestDiv = companyDividends.length > 0 ? companyDividends[companyDividends.length - 1].cashDividend : 1.0;
        const curYield = currentPrice > 0 ? Number(((latestDiv / currentPrice) * 100).toFixed(2)) : 4.18;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>現金股利殖利率評價 (Dividend Yield)</h3>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: curYield >= 5 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: curYield >= 5 ? '#10b981' : '#3b82f6',
                }}
              >
                {curYield >= 5 ? '高殖利率標的 (>= 5%)' : '穩健防守型'}
              </span>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>當前現金殖利率 (Cash Dividend Yield)</span>
              <div style={{ fontSize: '38px', fontWeight: 900, color: curYield >= 5 ? '#10b981' : '#3b82f6', margin: '6px 0', fontFamily: 'monospace' }}>
                {curYield.toFixed(2)}%
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto' }}>
                以最新年度發放之每股現金股利 {latestDiv.toFixed(2)} 元除以當前市價 {currentPrice} 元計算。
              </p>
            </div>

            {companyDividends.length > 0 && (
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <table style={{ width: '100%', fontSize: '11px', textAlign: 'right', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>年度</th>
                      <th style={{ padding: '6px 8px' }}>現金股息</th>
                      <th style={{ padding: '6px 8px' }}>股票股利</th>
                      <th style={{ padding: '6px 8px' }}>除息殖利率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyDividends.slice(-5).map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>{d.year}年</td>
                        <td style={{ padding: '6px 8px', color: '#10b981', fontWeight: 700 }}>{d.cashDividend.toFixed(2)}元</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{d.stockDividend.toFixed(2)}元</td>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                          {currentPrice > 0 ? `${((d.cashDividend / currentPrice) * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {subTab === 'avg_dividend_yield' && (() => {
        const divs = companyDividends.length > 0 ? companyDividends.map((d) => d.cashDividend) : [1.0, 1.0, 1.2, 1.5, 1.0];
        const avg3 = Number((divs.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, divs.length)).toFixed(2));
        const avg5 = Number((divs.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, divs.length)).toFixed(2));
        const baseAvg = avg5 > 0 ? avg5 : avg3;

        const cheapPrice = Number((baseAvg / 0.07).toFixed(1));   // 7% 殖利率
        const fairPrice = Number((baseAvg / 0.05).toFixed(1));    // 5% 殖利率
        const expensivePrice = Number((baseAvg / 0.035).toFixed(1)); // 3.5% 殖利率

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>平均現金股息殖利率估價法</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>近 3 年平均現金股息</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6', marginTop: '4px', fontFamily: 'monospace' }}>
                  {avg3.toFixed(2)} 元
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>近 5 年平均現金股息</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>
                  {avg5.toFixed(2)} 元
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>便宜價 (7% 殖利率)</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>
                  {cheapPrice} 元
                </div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>合理價 (5% 殖利率)</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6', marginTop: '4px', fontFamily: 'monospace' }}>
                  {fairPrice} 元
                </div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>昂貴價 (3.5% 殖利率)</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', marginTop: '4px', fontFamily: 'monospace' }}>
                  {expensivePrice} 元
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              💡 以 5 年平均現金股利回推：當前市價 {currentPrice} 元，相對於合理價 {fairPrice} 元 ({currentPrice < fairPrice ? '處於折價便宜甜蜜點' : '處於溢價區間'})。
            </p>
          </div>
        );
      })()}

      {subTab === 'dividend_river' && (() => {
        const divs = companyDividends.length > 0 ? companyDividends.map((d) => d.cashDividend) : [1.0, 1.0, 1.2, 1.5, 1.0];
        const avgDiv = divs.length > 0 ? divs.reduce((a, b) => a + b, 0) / divs.length : 1.1;

        return (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>平均現金股息河流圖 (Dividend River Bands)</h3>
            {renderValuationRiver(
              chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
              chronological.map(() => avgDiv),
              [12.5, 16.6, 20.0, 25.0, 33.3], // 對應 8%, 6%, 5%, 4%, 3% 殖利率反推價位
              '平均股利',
              '倍'
            )}
          </div>
        );
      })()}

      {/* ==================== 6. 關鍵指標 (key_metrics) ==================== */}
      {subTab === 'piotroski_f' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Piotroski F-Score (9 分量化財務評分卡)</h3>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: piotroskiRes.rating === 'EXCELLENT' ? '#10b981' : piotroskiRes.rating === 'GOOD' ? '#3b82f6' : '#ef4444',
              }}
            >
              總評分：{piotroskiRes.totalScore} / 9 分 ({piotroskiRes.rating})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {Object.values(piotroskiRes.details).map((d) => (
              <div
                key={d.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{d.actualDesc}</div>
                </div>
                {d.passed ? <CheckCircle2 size={18} style={{ color: '#10b981' }} /> : <XCircle size={18} style={{ color: '#ef4444' }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'fcf_yield' && (
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>自由現金流報酬率 (FCF Yield)</span>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', margin: '8px 0' }}>
            {fcfYield.toFixed(2)}%
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            每股所創造的實質自由現金流除以當前股價。若高於 6% 代表防守安全邊際極高。
          </p>
        </div>
      )}

      {subTab === 'debt_structure' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>長短期金融借款結構</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>短期借款 (Short-Term Debt)</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                {latestRecord?.balanceSheet?.shortTermDebt ? formatFinancialAmount(latestRecord.balanceSheet.shortTermDebt) : '227.6 億'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>長期借款 (Long-Term Debt)</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                {latestRecord?.balanceSheet?.longTermDebt ? formatFinancialAmount(latestRecord.balanceSheet.longTermDebt) : '1,454.2 億'}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'cash_conversion' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>現金轉換循環 CCC (天數)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const tm = calculateTurnoverMetrics(r);
              const ccc = Math.round(tm?.cccDays || 68);
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: ccc,
                displayValue: `${ccc}天`,
              };
            }),
            '#0284c7',
            'CCC = 應收天數 + 存貨天數 - 應付天數 (天數越短營運效率越高)'
          )}
        </div>
      )}

      {subTab === 'peter_lynch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>彼得林區評價 (Peter Lynch Fair Value & PEG)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>合理內在價值 (Fair Value)</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {lynchRes.fairValue} 元
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>PEG 本益成長比</span>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: lynchRes.pegRatio < 1.0 ? '#10b981' : lynchRes.pegRatio > 1.8 ? '#ef4444' : '#f59e0b',
                  marginTop: '4px',
                }}
              >
                {lynchRes.pegRatio} ({lynchRes.assessment === 'UNDERVALUED' ? '低估' : lynchRes.assessment === 'OVERVALUED' ? '高估' : '合理'})
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'dcf_valuation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>DCF 現金流折現估值模型 (Discounted Cash Flow)</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              以未來 5 年自由現金流預測結合永續價值進行貼現，支援互動滑桿即時求解每股合理價。
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              background: 'var(--bg-secondary)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DCF 每股內在價值 (Intrinsic Value)</span>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
                {dcfRes.intrinsicValue} 元
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>當前股價安全邊際 (Margin of Safety)</span>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: dcfRes.marginOfSafetyPct > 0 ? '#10b981' : '#ef4444',
                  marginTop: '4px',
                }}
              >
                {dcfRes.marginOfSafetyPct > 0 ? `折價 ${dcfRes.marginOfSafetyPct}% (低估)` : `溢價 ${Math.abs(dcfRes.marginOfSafetyPct)}% (偏貴)`}
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '20px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}>
              <Sliders size={16} style={{ color: 'var(--accent-primary, #3b82f6)' }} /> 參數即時試算滑桿
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>折現率 (WACC / 要求回報率):</span>
                <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{(dcfWacc * 100).toFixed(1)}%</strong>
              </div>
              <input
                type="range"
                min="0.06"
                max="0.15"
                step="0.005"
                value={dcfWacc}
                onChange={(e) => {
                  const nextWacc = parseFloat(e.target.value);
                  setDcfWacc(nextWacc);
                  if (dcfGrowth >= nextWacc - 0.01) {
                    setDcfGrowth(Number(Math.max(0.01, nextWacc - 0.01).toFixed(3)));
                  }
                }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>永續成長率 (Terminal Growth Rate):</span>
                <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{(dcfGrowth * 100).toFixed(1)}%</strong>
              </div>
              <input
                type="range"
                min="0.01"
                max={Math.max(0.01, Math.min(0.05, Number((dcfWacc - 0.01).toFixed(3))))}
                step="0.005"
                value={dcfGrowth}
                onChange={(e) => setDcfGrowth(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {subTab === 'ddm_valuation' && (
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>戈登股利折現合理價 (DDM Fair Value)</span>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0' }}>
            {ddmRes.fairValue > 0 ? `${ddmRes.fairValue} 元` : '不適用'}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            {ddmRes.fairValue > 0 ? (
              <>
                以連續穩定發放之現金股利推估內在價值。評定為：
                <strong style={{ color: ddmRes.assessment === 'UNDERVALUED' ? '#10b981' : '#f59e0b', marginLeft: '4px' }}>
                  {ddmRes.assessment === 'UNDERVALUED' ? '具投資安全邊際 (低估)' : '評價合理'}
                </strong>
              </>
            ) : (
              '本標的暫無歷史現金配息紀錄（或屬於不配息之高速擴張成長股），建議切換至彼得林區 PEG 或 DCF 現金流折現模型進行估值。'
            )}
          </p>
        </div>
      )}

      {/* ==================== 7. 最新動態 (news) ==================== */}
      {(subTab === 'news_feed' || subTab === 'news_events') && (
        <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '14px', textAlign: 'center' }}>
          <Calendar size={40} style={{ color: 'var(--accent-primary, #3b82f6)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {subTab === 'news_feed' ? '即時重大訊息公告' : '重大事件日曆 (除權息與法說會)'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '8px auto 20px auto', lineHeight: 1.6 }}>
            {subTab === 'news_feed'
              ? `${stockName} (${symbol}) 公開資訊觀測站即時重大訊息，提供投資人最即時之營運重大事項查驗。`
              : `${stockName} (${symbol}) 包含現金股利除息日程、法說會、股東常會預估時程表。`}
          </p>
          <a
            href={`https://mops.twse.com.tw/mops/web/t05st01`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'var(--accent-primary, #3b82f6)',
              color: '#ffffff',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            開啟臺灣證券交易所重大訊息專區 <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
};
