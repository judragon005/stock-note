import React from 'react';
import {
  TrendingUp,
  Scale,
  DollarSign,
} from 'lucide-react';
import type {
  QuarterlyFinancialRecord,
  DuPontAnalysis,
} from '../../types/financialForensic';

export type MarginType = 'grossMargin' | 'operatingMargin' | 'netMargin';

export function calculateMarginSvgPoints(
  records: (QuarterlyFinancialRecord | any)[],
  type: MarginType,
  width: number,
  height: number
): string {
  if (!records || records.length === 0) return '';
  if (records.length === 1) {
    return `${width / 2},${height / 2}`;
  }

  // 1. 計算所有比率
  const margins = records.map((r) => {
    const rev = r.income?.revenue ?? r.revenue ?? 0;
    if (rev <= 0) return 0;
    const gross = r.income?.grossProfit ?? r.grossProfit ?? 0;
    const op = r.income?.operatingIncome ?? r.operatingProfit ?? 0;
    const net = r.income?.netIncome ?? r.netIncome ?? 0;

    if (type === 'grossMargin') return (gross / rev) * 100;
    if (type === 'operatingMargin') return (op / rev) * 100;
    return (net / rev) * 100;
  });

  const validMargins = margins.filter((m) => !isNaN(m));
  if (validMargins.length === 0) return '';

  const minVal = Math.min(0, ...validMargins);
  const maxVal = Math.max(10, ...validMargins);
  const range = maxVal - minVal || 1;

  const paddingX = 28;
  const paddingY = 24;
  const usableW = width - paddingX * 2;
  const usableH = height - paddingY * 2;

  const stepX = usableW / (records.length - 1);

  return margins
    .map((val, idx) => {
      const x = paddingX + idx * stepX;
      // SVG y: 0 為頂部，height 為底部
      const ratio = (val - minVal) / range;
      const y = height - paddingY - ratio * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function formatCurrencyMillions(val: number): string {
  if (isNaN(val)) return '0 百萬';
  if (Math.abs(val) >= 100) {
    const yi = Math.round(val / 100);
    return `${yi.toLocaleString()} 億`;
  }
  return `${Math.round(val).toLocaleString()} 百萬`;
}

export function getDuPontDriverBadge(driver: DuPontAnalysis['primaryDriver']): {
  label: string;
  isWarning: boolean;
  colorClass: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  switch (driver) {
    case 'LEVERAGE':
      return {
        label: '財務槓桿推升',
        isWarning: true,
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        color: '#fbbf24',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      };
    case 'EFFICIENCY':
      return {
        label: '資產週轉效率推升',
        isWarning: false,
        colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        color: '#60a5fa',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.35)',
      };
    case 'PROFITABILITY':
    default:
      return {
        label: '產品獲利率推升',
        isWarning: false,
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        color: '#34d399',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
      };
  }
}

interface FinancialTrendsLayerProps {
  records: (QuarterlyFinancialRecord | any)[];
  duPont: DuPontAnalysis;
}

export const FinancialTrendsLayer: React.FC<FinancialTrendsLayerProps> = ({
  records,
  duPont,
}) => {
  // 排序近 8 季由遠至近
  const sortedRecords = [...records].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  const chartWidth = 540;
  const chartHeight = 180;

  const grossPoints = calculateMarginSvgPoints(sortedRecords, 'grossMargin', chartWidth, chartHeight);
  const opPoints = calculateMarginSvgPoints(sortedRecords, 'operatingMargin', chartWidth, chartHeight);
  const netPoints = calculateMarginSvgPoints(sortedRecords, 'netMargin', chartWidth, chartHeight);

  const driverBadge = getDuPontDriverBadge(duPont.primaryDriver);

  // 淨利 vs CFO 找出最大值作為長條高度參照
  const maxCashValue = Math.max(
    ...sortedRecords.map((r) => {
      const net = Math.abs(r.income?.netIncome ?? r.netIncome ?? 0);
      const cfo = Math.abs(r.cashFlow?.operatingCashFlow ?? r.operatingCashFlow ?? 0);
      return Math.max(net, cfo);
    }),
    1
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '20px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: '14px',
        border: '1px solid rgba(51, 65, 85, 0.6)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* 區塊標題 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp style={{ width: '20px', height: '20px', color: '#818cf8' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em', margin: 0 }}>
            近 8 季核心財務趨勢與體質透視
          </h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          三率走勢 ｜ 現金流階梯 ｜ 杜邦 ROE 拆解
        </span>
      </div>

      {/* 1. 近 8 季獲利三率趨勢折線圖 */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
            📈 獲利三率走勢（毛利率 vs 營業利益率 vs 淨利率）
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#34d399' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399' }} />
              毛利率
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
              營益率
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#c084fc' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#c084fc' }} />
              淨利率
            </span>
          </div>
        </div>

        {/* 折線圖 SVG 渲染區 */}
        {sortedRecords.length > 0 ? (
          <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', height: '180px', overflow: 'visible' }}
            >
              {/* 背景格線 */}
              <line x1="28" y1="30" x2={chartWidth - 28} y2="30" stroke="rgba(51, 65, 85, 0.3)" strokeDasharray="3 3" />
              <line x1="28" y1="80" x2={chartWidth - 28} y2="80" stroke="rgba(51, 65, 85, 0.3)" strokeDasharray="3 3" />
              <line x1="28" y1="130" x2={chartWidth - 28} y2="130" stroke="rgba(51, 65, 85, 0.3)" strokeDasharray="3 3" />

              {/* 折線 */}
              {grossPoints && (
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={grossPoints}
                />
              )}
              {opPoints && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={opPoints}
                />
              )}
              {netPoints && (
                <polyline
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={netPoints}
                />
              )}

              {/* 節點與季度標籤 */}
              {sortedRecords.map((r, i) => {
                const stepX = (chartWidth - 56) / Math.max(1, sortedRecords.length - 1);
                const x = 28 + i * stepX;
                const periodLabel = `${r.year % 100}Q${r.quarter}`;
                return (
                  <g key={i}>
                    <line x1={x} y1="20" x2={x} y2={chartHeight - 20} stroke="rgba(51, 65, 85, 0.2)" />
                    <text
                      x={x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {periodLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0', fontSize: '0.78rem', color: '#64748b' }}>
            暫無歷史季度數據
          </div>
        )}
      </div>

      {/* 2. 稅後淨利 vs 營業活動現金流 (CFO) 階梯柱狀圖 */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign style={{ width: '16px', height: '16px', color: '#34d399' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
              💵 獲利品質檢驗：稅後淨利 vs 營業現金流 (CFO)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#c084fc' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#a855f7' }} />
              稅後淨利
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6ee7b7' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10b981' }} />
              營業現金流 (CFO)
            </span>
          </div>
        </div>

        {/* 柱狀圖 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(4, sortedRecords.length)}, 1fr)`,
            gap: '8px',
          }}
        >
          {sortedRecords.map((r, idx) => {
            const net = r.income?.netIncome ?? r.netIncome ?? 0;
            const cfo = r.cashFlow?.operatingCashFlow ?? r.operatingCashFlow ?? 0;
            const isDivergent = net > 0 && cfo < 0;

            const netHeightPct = Math.min(100, Math.max(12, (Math.abs(net) / maxCashValue) * 100));
            const cfoHeightPct = Math.min(100, Math.max(12, (Math.abs(cfo) / maxCashValue) * 100));

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  border: isDivergent ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(51, 65, 85, 0.4)',
                }}
              >
                <div
                  style={{
                    height: '110px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: '6px',
                    paddingBottom: '4px',
                  }}
                >
                  {/* 淨利長條柱 */}
                  <div
                    style={{
                      width: '12px',
                      height: `${netHeightPct}%`,
                      borderTopLeftRadius: '3px',
                      borderTopRightRadius: '3px',
                      backgroundColor: net >= 0 ? 'rgba(168, 85, 247, 0.75)' : 'rgba(239, 68, 68, 0.75)',
                    }}
                    title={`淨利: ${formatCurrencyMillions(net)}`}
                  />
                  {/* CFO 長條柱 */}
                  <div
                    style={{
                      width: '12px',
                      height: `${cfoHeightPct}%`,
                      borderTopLeftRadius: '3px',
                      borderTopRightRadius: '3px',
                      backgroundColor: cfo >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(244, 63, 94, 0.75)',
                    }}
                    title={`CFO: ${formatCurrencyMillions(cfo)}`}
                  />
                </div>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#94a3b8', marginTop: '4px' }}>
                  {r.year % 100}Q{r.quarter}
                </span>
                {isDivergent && (
                  <span style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: 700, marginTop: '2px' }}>
                    ⚠️背離
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 杜邦 ROE 三因子矩陣拆解 */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scale style={{ width: '16px', height: '16px', color: '#22d3ee' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
              🧬 杜邦分析 ROE 三因子拆解 (DuPont Analysis)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>主驅動力：</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: `1px solid ${driverBadge.borderColor}`,
                backgroundColor: driverBadge.backgroundColor,
                color: driverBadge.color,
                fontWeight: 700,
              }}
            >
              {driverBadge.label}
            </span>
          </div>
        </div>

        {/* 三因子指標四卡片 (ROE = 淨利率 x 資產週轉率 x 權益乘數) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>股東權益報酬率 (ROE)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#34d399', marginTop: '2px' }}>
              {(duPont.roe * 100).toFixed(1)}%
            </div>
            <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>三因子乘積總結果</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>1. 稅後淨利率 (Net Margin)</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace', color: '#ffffff', marginTop: '2px' }}>
              {(duPont.netMargin * 100).toFixed(1)}%
            </div>
            <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>定價權與本業獲利力</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>2. 資產週轉率 (Turnover)</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace', color: '#ffffff', marginTop: '2px' }}>
              {duPont.assetTurnover.toFixed(2)} 次
            </div>
            <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>資產運用與翻桌效率</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>3. 權益乘數 (Leverage)</span>
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                fontFamily: 'monospace',
                color: duPont.equityMultiplier > 2.5 ? '#fbbf24' : '#ffffff',
                marginTop: '2px',
              }}
            >
              {duPont.equityMultiplier.toFixed(2)} 倍
            </div>
            <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>負債槓桿擴張程度</span>
          </div>
        </div>
      </div>
    </div>
  );
};
