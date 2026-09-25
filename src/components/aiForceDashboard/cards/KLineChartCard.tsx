import React, { useMemo } from 'react';
import { KlineSystemData } from '../../../types/aiForceDashboard';
import { ColorThemeMode } from '../../../types/stock';

export interface PriceRange {
  min: number;
  max: number;
  span: number;
}

/**
 * 計算價格極值與上下 5% 留白安全邊界
 */
export function calculatePriceRange(
  candles: { high: number; low: number }[]
): PriceRange {
  if (!candles || candles.length === 0) {
    return { min: 90, max: 110, span: 20 };
  }

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const c of candles) {
    if (c.low < minVal) minVal = c.low;
    if (c.high > maxVal) maxVal = c.high;
  }

  if (minVal === Infinity || maxVal === -Infinity) {
    return { min: 90, max: 110, span: 20 };
  }

  // 若極值相同，給予 5% 容錯
  if (minVal === maxVal) {
    const margin = minVal === 0 ? 1 : minVal * 0.05;
    return { min: minVal - margin, max: maxVal + margin, span: margin * 2 };
  }

  const rawSpan = maxVal - minVal;
  const padding = rawSpan * 0.05;
  const min = Math.max(0, minVal - padding);
  const max = maxVal + padding;

  return { min, max, span: max - min };
}

/**
 * 將價格數值映射至 SVG Y 軸座標 (高價在上方 Y 小，低價在下方 Y 大)
 */
export function projectPriceToY(
  price: number,
  range: PriceRange,
  height: number,
  topPadding: number = 20,
  bottomPadding: number = 30
): number {
  if (range.span <= 0) return (topPadding + (height - bottomPadding)) / 2;
  const plotHeight = height - topPadding - bottomPadding;
  const normalized = (price - range.min) / range.span;
  return topPadding + plotHeight * (1 - normalized);
}

/**
 * 將均線數值陣列轉為 SVG polyline points 字串
 */
export function buildMaPolylinePoints(
  values: (number | undefined)[],
  range: PriceRange,
  getX: (idx: number) => number,
  height: number,
  topPadding: number = 20,
  bottomPadding: number = 30
): string {
  const points: string[] = [];
  values.forEach((val, idx) => {
    if (val !== undefined && !isNaN(val)) {
      const x = getX(idx);
      const y = projectPriceToY(val, range, height, topPadding, bottomPadding);
      const cleanX = Number(x.toFixed(1));
      const cleanY = Number(y.toFixed(1));
      points.push(`${cleanX},${cleanY}`);
    }
  });
  return points.join(' ');
}

export interface KLineChartCardProps {
  data: KlineSystemData;
  colorTheme?: ColorThemeMode;
}

export const KLineChartCard: React.FC<KLineChartCardProps> = ({
  data,
  colorTheme = 'taiwan',
}) => {
  // 若無真實歷史資料，建立 30 根示範 K 線
  const displayCandles = useMemo(() => {
    if (data.candles && data.candles.length >= 5) {
      return data.candles;
    }
    const synthetic = [];
    let basePrice = 2100;
    for (let i = 30; i >= 1; i--) {
      const isUp = i % 2 === 0;
      const change = (i * 7) % 35;
      const open = basePrice;
      const close = isUp ? open + change : open - change;
      const high = Math.max(open, close) + 15;
      const low = Math.min(open, close) - 15;
      const volume = 1200 + ((i * 123) % 1800);
      basePrice = close;
      synthetic.push({
        date: `09/${i < 10 ? '0' + i : i}`,
        open,
        high,
        low,
        close,
        volume,
        ma5: close * 0.98,
        ma10: close * 0.96,
        ma20: 2130,
        ma60: 2050,
      });
    }
    return synthetic;
  }, [data.candles]);

  const priceRange = useMemo(() => calculatePriceRange(displayCandles), [displayCandles]);

  // SVG 畫布尺寸
  const width = 640;
  const klineHeight = 220;
  const volHeight = 70;
  const totalHeight = klineHeight + volHeight + 20;

  const leftPad = 20;
  const rightPad = 70;
  const plotWidth = width - leftPad - rightPad;
  const count = displayCandles.length;
  const candleGap = plotWidth / Math.max(1, count);
  const candleWidth = Math.max(3, candleGap * 0.65);

  const getX = (idx: number) => leftPad + idx * candleGap + candleGap / 2;

  // 成交量最大值
  const maxVol = useMemo(() => {
    let max = 1;
    displayCandles.forEach((c) => {
      if (c.volume > max) max = c.volume;
    });
    return max;
  }, [displayCandles]);

  // 均線 Points
  const ma5Points = useMemo(
    () => buildMaPolylinePoints(displayCandles.map((c) => c.ma5), priceRange, getX, klineHeight, 15, 15),
    [displayCandles, priceRange]
  );
  const ma10Points = useMemo(
    () => buildMaPolylinePoints(displayCandles.map((c) => c.ma10), priceRange, getX, klineHeight, 15, 15),
    [displayCandles, priceRange]
  );
  const ma20Points = useMemo(
    () => buildMaPolylinePoints(displayCandles.map((c) => c.ma20), priceRange, getX, klineHeight, 15, 15),
    [displayCandles, priceRange]
  );
  const ma60Points = useMemo(
    () => buildMaPolylinePoints(displayCandles.map((c) => c.ma60), priceRange, getX, klineHeight, 15, 15),
    [displayCandles, priceRange]
  );

  const isTaiwan = colorTheme === 'taiwan';
  const bullColor = isTaiwan ? '#ef4444' : '#10b981';
  const bearColor = isTaiwan ? '#10b981' : '#ef4444';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(20, 30, 50, 0.75) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 標題與均線圖例列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            01
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
            主K線圖
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            | AI 主力行為判讀系統
          </span>
        </div>

        {/* 均線圖例 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>— MA5</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>— MA10</span>
          <span style={{ color: '#c084fc', fontWeight: 600 }}>— MA20</span>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>⋯ MA60</span>
          <span style={{ color: '#34d399', fontWeight: 600 }}>■ 成交量</span>
        </div>
      </div>

      {/* SVG K 線圖與量能主繪圖區 */}
      <div style={{ width: '100%', flex: 1, minHeight: '260px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${totalHeight}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          {/* 背景參考格線 */}
          <line
            x1={leftPad}
            y1={klineHeight / 2}
            x2={width - rightPad}
            y2={klineHeight / 2}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeDasharray="3 3"
          />
          <line
            x1={leftPad}
            y1={klineHeight}
            x2={width - rightPad}
            y2={klineHeight}
            stroke="rgba(255, 255, 255, 0.12)"
          />

          {/* 右側價格刻度 */}
          <text
            x={width - rightPad + 6}
            y={20}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            {priceRange.max.toFixed(0)}
          </text>
          <text
            x={width - rightPad + 6}
            y={klineHeight / 2 + 4}
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
          >
            {((priceRange.max + priceRange.min) / 2).toFixed(0)}
          </text>
          <text
            x={width - rightPad + 6}
            y={klineHeight - 6}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            {priceRange.min.toFixed(0)}
          </text>

          {/* K 線蠟燭與量能直方柱 */}
          {displayCandles.map((c, idx) => {
            const cx = getX(idx);
            const isBull = c.close >= c.open;
            const color = isBull ? bullColor : bearColor;

            // K 線
            const yHigh = projectPriceToY(c.high, priceRange, klineHeight, 15, 15);
            const yLow = projectPriceToY(c.low, priceRange, klineHeight, 15, 15);
            const yOpen = projectPriceToY(c.open, priceRange, klineHeight, 15, 15);
            const yClose = projectPriceToY(c.close, priceRange, klineHeight, 15, 15);

            const candleTop = Math.min(yOpen, yClose);
            const candleBodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

            // 成交量直方柱 (位於 klineHeight + 10 之下)
            const volBarHeight = Math.max(2, (c.volume / maxVol) * (volHeight - 10));
            const volY = totalHeight - 15 - volBarHeight;

            return (
              <g key={idx}>
                {/* 影線 */}
                <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth="1.2" />
                {/* 實體 */}
                <rect
                  x={cx - candleWidth / 2}
                  y={candleTop}
                  width={candleWidth}
                  height={candleBodyHeight}
                  fill={color}
                  rx="1"
                />
                {/* 成交量 */}
                <rect
                  x={cx - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={volBarHeight}
                  fill={color}
                  opacity="0.75"
                />
              </g>
            );
          })}

          {/* 均線 Polyline 折線 */}
          <polyline points={ma60Points} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
          <polyline points={ma20Points} fill="none" stroke="#c084fc" strokeWidth="1.5" opacity="0.85" />
          <polyline points={ma10Points} fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.85" />
          <polyline points={ma5Points} fill="none" stroke="#fbbf24" strokeWidth="1.6" />

          {/* 底部時間軸標籤 (抽樣顯示) */}
          {displayCandles.map((c, idx) => {
            if (idx % 6 !== 0 && idx !== count - 1) return null;
            const cx = getX(idx);
            return (
              <text
                key={'t' + idx}
                x={cx}
                y={totalHeight - 2}
                textAnchor="middle"
                fill="#64748b"
                fontSize="9"
              >
                {c.date}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
