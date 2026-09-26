import React, { useMemo, useState } from 'react';
import {
  KlineSystemData,
  KlinePeriodMode,
  SubchartIndicatorMode,
  KlineCandleItem,
} from '../../../types/aiForceDashboard';
import { ColorThemeMode } from '../../../types/stock';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseMainForceCost } from '../../../constants/aiForceGlossary';

export interface PriceRange {
  min: number;
  max: number;
  span: number;
}

/**
 * 依據週期切片提取蠟燭數列
 */
export function sliceCandlesByPeriod<T>(candles: T[], period: KlinePeriodMode = '60D'): T[] {
  if (!candles || candles.length === 0) return [];
  const limitMap: Record<KlinePeriodMode, number> = {
    '30D': 30,
    '60D': 60,
    '120D': 120,
    '250D': 250,
  };
  const count = limitMap[period] || 60;
  if (candles.length <= count) return candles;
  return candles.slice(-count);
}

/**
 * 依據滑鼠 X 座標尋找最接近之 K 棒索引
 */
export function findClosestCandleIndex(
  mouseX: number,
  leftPad: number,
  candleGap: number,
  totalCount: number
): number {
  if (totalCount <= 0) return -1;
  if (candleGap <= 0) return 0;
  const rawIdx = Math.floor((mouseX - leftPad) / candleGap);
  return Math.max(0, Math.min(totalCount - 1, rawIdx));
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
  const clampedPrice = Math.max(range.min, Math.min(range.max, price));
  const plotHeight = height - topPadding - bottomPadding;
  const normalized = (clampedPrice - range.min) / range.span;
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

export interface KeyLevelOverlay {
  type: 'resistance' | 'cost' | 'support';
  price: number;
  label: string;
  color: string;
  bgColor: string;
  y: number;
}

/**
 * 計算三大關鍵價位 (高檔壓力、主力成本、支撐區) 之 SVG 引線座標與文字標籤
 */
export function calculateKeyLevelOverlays(
  keyLevels: { highResistance: number; mainForceCost: number; supportLevel: number },
  range: PriceRange,
  height: number,
  topPadding: number = 20,
  bottomPadding: number = 30
): KeyLevelOverlay[] {
  const result: KeyLevelOverlay[] = [];

  if (keyLevels.highResistance) {
    const y = projectPriceToY(keyLevels.highResistance, range, height, topPadding, bottomPadding);
    result.push({
      type: 'resistance',
      price: keyLevels.highResistance,
      label: `高檔壓力區 ${keyLevels.highResistance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.25)',
      y,
    });
  }

  if (keyLevels.mainForceCost) {
    const y = projectPriceToY(keyLevels.mainForceCost, range, height, topPadding, bottomPadding);
    result.push({
      type: 'cost',
      price: keyLevels.mainForceCost,
      label: `主力成本 ${keyLevels.mainForceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.25)',
      y,
    });
  }

  if (keyLevels.supportLevel) {
    const y = projectPriceToY(keyLevels.supportLevel, range, height, topPadding, bottomPadding);
    result.push({
      type: 'support',
      price: keyLevels.supportLevel,
      label: `支撐區 ${keyLevels.supportLevel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.25)',
      y,
    });
  }

  return result;
}

export interface KLineChartCardProps {
  data: KlineSystemData;
  colorTheme?: ColorThemeMode;
}

export const KLineChartCard: React.FC<KLineChartCardProps> = ({
  data,
  colorTheme = 'taiwan',
}) => {
  const [period, setPeriod] = useState<KlinePeriodMode>('60D');
  const [subchartMode, setSubchartMode] = useState<SubchartIndicatorMode>('VOL');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 1. 若無真實歷史資料，建立 30 根示範 K 線
  const rawCandles = useMemo(() => {
    if (data.candles && data.candles.length >= 5) {
      return data.candles;
    }
    const synthetic: KlineCandleItem[] = [];
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
        k: 50 + (i % 20),
        d: 48 + (i % 18),
        dif: (i % 10) - 5,
        macd: (i % 8) - 4,
        macdHist: (i % 6) - 3,
        rsi: 45 + (i % 30),
      });
    }
    return synthetic;
  }, [data.candles]);

  // 2. 依據週期切片提取當前檢視蠟燭
  const displayCandles = useMemo(() => {
    return sliceCandlesByPeriod(rawCandles, period);
  }, [rawCandles, period]);

  const priceRange = useMemo(() => calculatePriceRange(displayCandles), [displayCandles]);

  // SVG 畫布尺寸
  const width = 680;
  const klineHeight = 220;
  const volHeight = 70;
  const totalHeight = klineHeight + volHeight + 20;

  const leftPad = 20;
  const rightPad = 120;
  const plotWidth = width - leftPad - rightPad;
  const count = displayCandles.length;
  const candleGap = plotWidth / Math.max(1, count);
  const candleWidth = Math.max(2.5, Math.min(14, candleGap * 0.7));

  const getX = (idx: number) => leftPad + idx * candleGap + candleGap / 2;

  // 成交量最大值
  const maxVol = useMemo(() => {
    let max = 1;
    displayCandles.forEach((c) => {
      if (c.volume > max) max = c.volume;
    });
    return max;
  }, [displayCandles]);

  // MACD 極值
  const maxMacdAbs = useMemo(() => {
    let max = 1;
    displayCandles.forEach((c) => {
      if (c.dif !== undefined && Math.abs(c.dif) > max) max = Math.abs(c.dif);
      if (c.macd !== undefined && Math.abs(c.macd) > max) max = Math.abs(c.macd);
      if (c.macdHist !== undefined && Math.abs(c.macdHist) > max) max = Math.abs(c.macdHist);
    });
    return max || 1;
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

  // 副圖 Points (KD / MACD / RSI)
  const subchartTop = klineHeight + 10;
  const subchartPlotHeight = volHeight - 15;

  const kdKPoints = useMemo(() => {
    if (subchartMode !== 'KD') return '';
    const points: string[] = [];
    displayCandles.forEach((c, idx) => {
      if (c.k !== undefined) {
        const x = getX(idx);
        const y = subchartTop + (1 - c.k / 100) * subchartPlotHeight;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return points.join(' ');
  }, [displayCandles, subchartMode]);

  const kdDPoints = useMemo(() => {
    if (subchartMode !== 'KD') return '';
    const points: string[] = [];
    displayCandles.forEach((c, idx) => {
      if (c.d !== undefined) {
        const x = getX(idx);
        const y = subchartTop + (1 - c.d / 100) * subchartPlotHeight;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return points.join(' ');
  }, [displayCandles, subchartMode]);

  const macdDifPoints = useMemo(() => {
    if (subchartMode !== 'MACD') return '';
    const points: string[] = [];
    const midY = subchartTop + subchartPlotHeight / 2;
    displayCandles.forEach((c, idx) => {
      if (c.dif !== undefined) {
        const x = getX(idx);
        const y = midY - (c.dif / maxMacdAbs) * (subchartPlotHeight / 2 - 2);
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return points.join(' ');
  }, [displayCandles, subchartMode, maxMacdAbs]);

  const macdDeaPoints = useMemo(() => {
    if (subchartMode !== 'MACD') return '';
    const points: string[] = [];
    const midY = subchartTop + subchartPlotHeight / 2;
    displayCandles.forEach((c, idx) => {
      if (c.macd !== undefined) {
        const x = getX(idx);
        const y = midY - (c.macd / maxMacdAbs) * (subchartPlotHeight / 2 - 2);
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return points.join(' ');
  }, [displayCandles, subchartMode, maxMacdAbs]);

  const rsiPoints = useMemo(() => {
    if (subchartMode !== 'RSI') return '';
    const points: string[] = [];
    displayCandles.forEach((c, idx) => {
      if (c.rsi !== undefined) {
        const x = getX(idx);
        const y = subchartTop + (1 - c.rsi / 100) * subchartPlotHeight;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return points.join(' ');
  }, [displayCandles, subchartMode]);

  // 三大關鍵價位引線
  const keyLevelOverlays = useMemo(() => {
    const levels = {
      highResistance: data.keyLevels?.highResistance || priceRange.max * 0.98,
      mainForceCost: data.keyLevels?.mainForceCost || (priceRange.max + priceRange.min) / 2,
      supportLevel: data.keyLevels?.supportLevel || priceRange.min * 1.02,
    };
    return calculateKeyLevelOverlays(levels, priceRange, klineHeight, 15, 15);
  }, [data.keyLevels, priceRange, klineHeight]);

  const isTaiwan = colorTheme === 'taiwan';
  const bullColor = isTaiwan ? '#ef4444' : '#10b981';
  const bearColor = isTaiwan ? '#10b981' : '#ef4444';

  const isHovering = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < count;
  const activeCandle = isHovering
    ? displayCandles[hoverIndex!]
    : count > 0
    ? displayCandles[count - 1]
    : null;
  const hoveredCandle = isHovering ? activeCandle : null;

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
        position: 'relative',
      }}
    >
      {/* 標題、週期切換、均線圖例與副圖指標列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '8px',
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
          <TermTooltip termId="mainForceCost" dynamicDiagnosis={activeCandle ? diagnoseMainForceCost(activeCandle.close, data.keyLevels.mainForceCost) : undefined} showIcon={true}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
              主K線圖
            </span>
          </TermTooltip>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            | AI 主力行為判讀系統
          </span>

          {/* 多週期切換按鈕 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '2px 4px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              gap: '2px',
              marginLeft: '6px',
            }}
          >
            {(['30D', '60D', '120D', '250D'] as KlinePeriodMode[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: 'none',
                  background: period === p ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
                  color: period === p ? '#ffffff' : '#94a3b8',
                  fontSize: '0.68rem',
                  fontWeight: period === p ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 均線圖例、副圖指標切換與選單 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
          <TermTooltip termId="ma5">
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>— MA5</span>
          </TermTooltip>
          <TermTooltip termId="ma10">
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>— MA10</span>
          </TermTooltip>
          <TermTooltip termId="ma20">
            <span style={{ color: '#c084fc', fontWeight: 600 }}>— MA20</span>
          </TermTooltip>
          <TermTooltip termId="ma60">
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>⋯ MA60</span>
          </TermTooltip>

          {/* 副圖指標切換按鈕 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '2px 4px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              gap: '2px',
            }}
          >
            {(['VOL', 'KD', 'MACD', 'RSI'] as SubchartIndicatorMode[]).map((m) => {
              const termMap: Record<SubchartIndicatorMode, string> = {
                VOL: 'volumeShares',
                KD: 'kd',
                MACD: 'macd',
                RSI: 'rsi',
              };
              return (
                <TermTooltip key={m} termId={termMap[m]} underline={false}>
                  <button
                    type="button"
                    onClick={() => setSubchartMode(m)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: 'none',
                      background: subchartMode === m ? 'rgba(16, 185, 129, 0.8)' : 'transparent',
                      color: subchartMode === m ? '#ffffff' : '#94a3b8',
                      fontSize: '0.68rem',
                      fontWeight: subchartMode === m ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {m === 'VOL' ? '量' : m}
                  </button>
                </TermTooltip>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="選項"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* 互動查價狀態列 (常駐容器，hover 時顯示吸附指標，否則顯示最新交易日，杜絕跳動) */}
      {activeCandle ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.72rem',
            padding: '4px 8px',
            background: isHovering ? 'rgba(30, 41, 59, 0.9)' : 'rgba(30, 41, 59, 0.5)',
            borderRadius: '6px',
            marginBottom: '6px',
            border: isHovering
              ? '1px solid rgba(59, 130, 246, 0.4)'
              : '1px solid rgba(255, 255, 255, 0.05)',
            flexWrap: 'wrap',
            minHeight: '26px',
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
        >
          <span
            style={{
              padding: '1px 5px',
              borderRadius: '4px',
              background: isHovering ? 'rgba(59, 130, 246, 0.3)' : 'rgba(100, 116, 139, 0.2)',
              color: isHovering ? '#60a5fa' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.65rem',
            }}
          >
            {isHovering ? '🔍 查價' : '📌 最新'}
          </span>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>📅 {activeCandle.date}</span>
          <span>開: <b style={{ color: '#f8fafc' }}>{activeCandle.open}</b></span>
          <span>高: <b style={{ color: '#ef4444' }}>{activeCandle.high}</b></span>
          <span>低: <b style={{ color: '#10b981' }}>{activeCandle.low}</b></span>
          <span>收: <b style={{ color: activeCandle.close >= activeCandle.open ? bullColor : bearColor }}>{activeCandle.close}</b></span>
          <span>量: <b style={{ color: '#fbbf24' }}>{activeCandle.volume.toLocaleString()}</b></span>
          {activeCandle.ma5 && <span style={{ color: '#fbbf24' }}>MA5:{activeCandle.ma5}</span>}
          {activeCandle.ma20 && <span style={{ color: '#c084fc' }}>MA20:{activeCandle.ma20}</span>}
          {subchartMode === 'KD' && (
            <span style={{ color: '#60a5fa' }}>
              K:{activeCandle.k ?? '-'} D:{activeCandle.d ?? '-'}
            </span>
          )}
          {subchartMode === 'MACD' && (
            <span style={{ color: '#34d399' }}>
              DIF:{activeCandle.dif ?? '-'} MACD:{activeCandle.macd ?? '-'} 柱:{activeCandle.macdHist ?? '-'}
            </span>
          )}
          {subchartMode === 'RSI' && (
            <span style={{ color: '#c084fc' }}>RSI:{activeCandle.rsi ?? '-'}</span>
          )}
        </div>
      ) : (
        <div style={{ minHeight: '26px', marginBottom: '6px' }} />
      )}

      {/* SVG K 線圖與量能主繪圖區 */}
      <div style={{ width: '100%', flex: 1, minHeight: '260px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${totalHeight}`}
          style={{ width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' }}
          preserveAspectRatio="none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / rect.width) * width;
            const idx = findClosestCandleIndex(svgX, leftPad, candleGap, count);
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
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

          {/* K 線蠟燭繪製 */}
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
              </g>
            );
          })}

          {/* 均線 Polyline 折線 */}
          <polyline points={ma60Points} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
          <polyline points={ma20Points} fill="none" stroke="#c084fc" strokeWidth="1.5" opacity="0.85" />
          <polyline points={ma10Points} fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.85" />
          <polyline points={ma5Points} fill="none" stroke="#fbbf24" strokeWidth="1.6" />

          {/* 三大水平關鍵價位引線 (Ticket 05) */}
          {keyLevelOverlays.map((overlay) => (
            <g key={overlay.type}>
              {/* 水平虛線 */}
              <line
                x1={leftPad}
                y1={overlay.y}
                x2={width - rightPad}
                y2={overlay.y}
                stroke={overlay.color}
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity="0.85"
              />
              {/* 右側彩色徽章背景矩形 */}
              <rect
                x={width - rightPad + 4}
                y={overlay.y - 7}
                width="112"
                height="15"
                rx="3"
                fill={overlay.bgColor}
                stroke={overlay.color}
                strokeWidth="0.8"
              />
              {/* 標籤文字 */}
              <text
                x={width - rightPad + 8}
                y={overlay.y + 3.5}
                fill={overlay.color}
                fontSize="8.5"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {overlay.label}
              </text>
            </g>
          ))}

          {/* 副圖分界線 */}
          <line
            x1={leftPad}
            y1={subchartTop}
            x2={width - rightPad}
            y2={subchartTop}
            stroke="rgba(255, 255, 255, 0.15)"
          />

          {/* 副圖：VOL (成交量直方柱) */}
          {subchartMode === 'VOL' &&
            displayCandles.map((c, idx) => {
              const cx = getX(idx);
              const isBull = c.close >= c.open;
              const color = isBull ? bullColor : bearColor;
              const volBarHeight = Math.max(2, (c.volume / maxVol) * (volHeight - 10));
              const volY = totalHeight - 15 - volBarHeight;
              return (
                <rect
                  key={'v' + idx}
                  x={cx - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={volBarHeight}
                  fill={color}
                  opacity="0.75"
                />
              );
            })}

          {/* 副圖：KD 指標 (K9/D9 折線與 80/20 參考線) */}
          {subchartMode === 'KD' && (
            <g>
              {/* 80 與 20 參考線 */}
              <line
                x1={leftPad}
                y1={subchartTop + 0.2 * subchartPlotHeight}
                x2={width - rightPad}
                y2={subchartTop + 0.2 * subchartPlotHeight}
                stroke="rgba(239, 68, 68, 0.3)"
                strokeDasharray="2 2"
              />
              <line
                x1={leftPad}
                y1={subchartTop + 0.8 * subchartPlotHeight}
                x2={width - rightPad}
                y2={subchartTop + 0.8 * subchartPlotHeight}
                stroke="rgba(16, 185, 129, 0.3)"
                strokeDasharray="2 2"
              />
              <polyline points={kdKPoints} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
              <polyline points={kdDPoints} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
            </g>
          )}

          {/* 副圖：MACD 指標 (DIF, DEA, 柱狀體) */}
          {subchartMode === 'MACD' && (
            <g>
              {/* 零軸線 */}
              <line
                x1={leftPad}
                y1={subchartTop + subchartPlotHeight / 2}
                x2={width - rightPad}
                y2={subchartTop + subchartPlotHeight / 2}
                stroke="rgba(255, 255, 255, 0.2)"
              />
              {/* 柱狀體 */}
              {displayCandles.map((c, idx) => {
                if (c.macdHist === undefined) return null;
                const cx = getX(idx);
                const midY = subchartTop + subchartPlotHeight / 2;
                const barH = (Math.abs(c.macdHist) / maxMacdAbs) * (subchartPlotHeight / 2 - 2);
                const y = c.macdHist >= 0 ? midY - barH : midY;
                const color = c.macdHist >= 0 ? bullColor : bearColor;
                return (
                  <rect
                    key={'mh' + idx}
                    x={cx - candleWidth / 2}
                    y={y}
                    width={candleWidth}
                    height={Math.max(1, barH)}
                    fill={color}
                    opacity="0.8"
                  />
                );
              })}
              <polyline points={macdDifPoints} fill="none" stroke="#60a5fa" strokeWidth="1.4" />
              <polyline points={macdDeaPoints} fill="none" stroke="#f59e0b" strokeWidth="1.4" />
            </g>
          )}

          {/* 副圖：RSI 指標 (RSI14 折線與 70/30 參考線) */}
          {subchartMode === 'RSI' && (
            <g>
              <line
                x1={leftPad}
                y1={subchartTop + 0.3 * subchartPlotHeight}
                x2={width - rightPad}
                y2={subchartTop + 0.3 * subchartPlotHeight}
                stroke="rgba(239, 68, 68, 0.3)"
                strokeDasharray="2 2"
              />
              <line
                x1={leftPad}
                y1={subchartTop + 0.7 * subchartPlotHeight}
                x2={width - rightPad}
                y2={subchartTop + 0.7 * subchartPlotHeight}
                stroke="rgba(16, 185, 129, 0.3)"
                strokeDasharray="2 2"
              />
              <polyline points={rsiPoints} fill="none" stroke="#c084fc" strokeWidth="1.5" />
            </g>
          )}

          {/* 十字光標 (Crosshair) 繪製 */}
          {hoverIndex !== null && hoveredCandle && (
            <g>
              {/* 垂直線 */}
              <line
                x1={getX(hoverIndex)}
                y1={10}
                x2={getX(hoverIndex)}
                y2={totalHeight - 15}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* 水平線 (指向收盤價) */}
              <line
                x1={leftPad}
                y1={projectPriceToY(hoveredCandle.close, priceRange, klineHeight, 15, 15)}
                x2={width - rightPad}
                y2={projectPriceToY(hoveredCandle.close, priceRange, klineHeight, 15, 15)}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Y 軸游標價格標籤 */}
              <rect
                x={width - rightPad + 2}
                y={projectPriceToY(hoveredCandle.close, priceRange, klineHeight, 15, 15) - 8}
                width="48"
                height="16"
                rx="3"
                fill="#3b82f6"
              />
              <text
                x={width - rightPad + 6}
                y={projectPriceToY(hoveredCandle.close, priceRange, klineHeight, 15, 15) + 4}
                fill="#ffffff"
                fontSize="9"
                fontWeight="700"
                fontFamily="monospace"
              >
                {hoveredCandle.close.toFixed(0)}
              </text>
            </g>
          )}

          {/* 底部時間軸標籤 (抽樣顯示) */}
          {displayCandles.map((c, idx) => {
            const step = Math.max(4, Math.floor(count / 7));
            if (idx % step !== 0 && idx !== count - 1) return null;
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
