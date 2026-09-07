import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SmartMoneyBubbleData,
  SmartMoneyQuadrant,
  ColorThemeMode,
  MarketType,
} from '../types/stock';
import { resolveBubbleCollisions, getTemporalBubbleFrameData } from '../engine/smartMoneyEngine';
import {
  Play,
  Pause,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
} from 'lucide-react';

export interface SmartMoneyBubbleChartProps {
  bubbles: SmartMoneyBubbleData[];
  colorTheme: ColorThemeMode;
  availableDates?: string[];
  currentDateIndex?: number;
  onDateChange?: (dateIndex: number) => void;
  summaryText?: string;
  overallSentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

/**
 * 坐標系轉換：將 [-100, +100] 量化坐標映射至 SVG 畫布像素坐標
 * SVG 坐標系中，Y 軸朝下，因此 +100 (多頭) 映射至畫布頂部 (小 Y)
 */
export function calculateCanvasCoordinates(
  x: number,
  y: number,
  width: number,
  height: number,
  padding: number
): { cx: number; cy: number } {
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  // X: -100 -> padding, 0 -> width/2, +100 -> width - padding
  const cx = padding + ((x + 100) / 200) * usableW;

  // Y: +100 -> padding, 0 -> height/2, -100 -> height - padding
  const cy = padding + ((100 - y) / 200) * usableH;

  return {
    cx: Math.round(cx * 10) / 10,
    cy: Math.round(cy * 10) / 10,
  };
}

/**
 * 泡泡背景填充色 (半透明玻璃光暈，支援動態影格象限 overrideQuadrant 覆寫)
 */
export function getBubbleFillColor(
  bubble: SmartMoneyBubbleData,
  colorTheme: ColorThemeMode,
  overrideQuadrant?: SmartMoneyQuadrant
): string {
  const isTaiwan = colorTheme === 'taiwan';
  const targetQuadrant = overrideQuadrant || bubble.quadrant;

  if (targetQuadrant === 'BREAKOUT') {
    // 飆股抬轎區
    return isTaiwan ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.45)';
  } else if (targetQuadrant === 'ACCUMULATION') {
    // 逢低吸籌區 (琥珀暖金/藍紫)
    return 'rgba(245, 158, 11, 0.4)';
  } else if (targetQuadrant === 'DISTRIBUTION') {
    // 割韭菜警戒區 (高檔倒貨)
    return isTaiwan ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';
  } else {
    // 冷凍提款區 (LIQUIDATION) 絕對為冷灰藍色，杜絕出現黃色
    return 'rgba(100, 116, 139, 0.4)';
  }
}

/**
 * 泡泡外邊框描邊色 (支援動態影格象限 overrideQuadrant 覆寫)
 */
export function getBubbleStrokeColor(
  bubble: SmartMoneyBubbleData,
  colorTheme: ColorThemeMode,
  overrideQuadrant?: SmartMoneyQuadrant
): string {
  const isTaiwan = colorTheme === 'taiwan';
  const targetQuadrant = overrideQuadrant || bubble.quadrant;

  if (targetQuadrant === 'BREAKOUT') {
    return isTaiwan ? '#ef4444' : '#10b981';
  } else if (targetQuadrant === 'ACCUMULATION') {
    return '#f59e0b';
  } else if (targetQuadrant === 'DISTRIBUTION') {
    return isTaiwan ? '#10b981' : '#ef4444';
  } else {
    return '#94a3b8';
  }
}

/**
 * 依據使用者燈號習慣 (ColorThemeMode) 取得四象限生活化浮水印文字顏色
 */
export function getQuadrantWatermarkColors(colorTheme: ColorThemeMode) {
  const isTaiwan = colorTheme === 'taiwan';
  return {
    breakout: isTaiwan ? 'rgba(248, 113, 113, 0.55)' : 'rgba(52, 211, 153, 0.55)',
    accumulation: 'rgba(251, 191, 36, 0.55)',
    distribution: isTaiwan ? 'rgba(52, 211, 153, 0.55)' : 'rgba(248, 113, 113, 0.55)',
    liquidation: 'rgba(148, 163, 184, 0.55)',
  };
}

/**
 * 格式化法人或機構籌碼明細文字
 */
export function formatInstitutionalDetailText(data: {
  market?: MarketType;
  foreignNetShares?: number;
  trustNetShares?: number;
  dealerNetShares?: number;
  cmf?: number;
}): string {
  if (data.market === 'TW') {
    const parts: string[] = [];
    if (data.foreignNetShares !== undefined) {
      const sign = data.foreignNetShares >= 0 ? '+' : '';
      parts.push(`外資: ${sign}${data.foreignNetShares.toLocaleString()} 張`);
    }
    if (data.trustNetShares !== undefined) {
      const sign = data.trustNetShares >= 0 ? '+' : '';
      parts.push(`投信: ${sign}${data.trustNetShares.toLocaleString()} 張`);
    }
    if (data.dealerNetShares !== undefined) {
      const sign = data.dealerNetShares >= 0 ? '+' : '';
      parts.push(`自營商: ${sign}${data.dealerNetShares.toLocaleString()} 張`);
    }
    return parts.length > 0 ? parts.join(' | ') : '三大法人進出平穩';
  } else {
    const cmfVal = data.cmf !== undefined ? data.cmf : 0;
    const sign = cmfVal >= 0 ? '+' : '';
    const flowText =
      cmfVal > 0.15 ? '機構資金顯著流入' : cmfVal < -0.15 ? '主力資金逢高出脫' : '資金流向平衡';
    return `CMF 資金流: ${sign}${cmfVal.toFixed(2)} (${flowText})`;
  }
}

/**
 * 象限對角智慧避讓演算法 (Smart Diagonal Pinning)
 * 解決照片 2 浮窗自蓋目標泡泡的嚴重遮蔽痛點：
 * 依據當前泡泡在 SVG 畫布中的坐標，動態將 Tooltip 浮窗排定在不同對角角落，
 * 確保被選中或懸浮的泡泡 100% 完整露出版面，絕無遮擋！
 */
export function calculateTooltipPlacement(
  cx: number,
  cy: number,
  width: number,
  height: number,
  isPinned = false
): React.CSSProperties {
  const isLeft = cx < width / 2;
  const isTop = cy < height / 2;

  const style: React.CSSProperties = {
    position: 'absolute',
    maxWidth: '380px',
    zIndex: 20,
    pointerEvents: isPinned ? 'auto' : 'none',
  };

  // 水平避讓：泡泡在左半邊 -> Tooltip 停靠在右側；反之停靠在左側
  if (isLeft) {
    style.right = '16px';
  } else {
    style.left = '16px';
  }

  // 垂直避讓：泡泡在上半部 -> Tooltip 停靠在底部；反之停靠在頂部 (對角放置)
  if (isTop) {
    style.bottom = '16px';
  } else {
    style.top = '16px';
  }

  return style;
}

export const SmartMoneyBubbleChart: React.FC<SmartMoneyBubbleChartProps> = ({
  bubbles,
  colorTheme,
  availableDates = [],
  currentDateIndex = 0,
  onDateChange,
  summaryText,
  overallSentiment = 'NEUTRAL',
}) => {
  const [showGuide, setShowGuide] = useState(true);
  const [hoveredBubble, setHoveredBubble] = useState<SmartMoneyBubbleData | null>(null);
  const [selectedBubble, setSelectedBubble] = useState<SmartMoneyBubbleData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2>(1);

  // SVG 畫布基準尺寸
  const width = 880;
  const height = 560;
  const padding = 50;

  // 動態時序播放控制
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isPlaying && availableDates.length > 1) {
      const intervalMs = playSpeed === 1 ? 1200 : 600;
      timerRef.current = setInterval(() => {
        if (onDateChange) {
          const nextIndex = (currentDateIndex + 1) % availableDates.length;
          onDateChange(nextIndex);
          if (nextIndex === availableDates.length - 1) {
            setIsPlaying(false);
          }
        }
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed, availableDates.length, currentDateIndex, onDateChange]);

  const activeBubble = hoveredBubble || selectedBubble;

  // 1. 2D 圓形防碰撞排斥佈局 (依據當前時間軸進度 currentDateIndex 動態映射泡泡時序坐標)
  const placedBubbles = useMemo(() => {
    const temporalBubbles = bubbles.map((b) => {
      const trailPt = b.trail && b.trail.length > currentDateIndex
        ? b.trail[currentDateIndex]
        : null;
      if (trailPt) {
        let dynQuadrant: SmartMoneyQuadrant = b.quadrant;
        if (trailPt.x >= 0 && trailPt.y >= 0) {
          dynQuadrant = 'BREAKOUT';
        } else if (trailPt.x < 0 && trailPt.y > 0) {
          dynQuadrant = 'ACCUMULATION';
        } else if (trailPt.x >= 0 && trailPt.y < 0) {
          dynQuadrant = 'DISTRIBUTION';
        } else {
          dynQuadrant = 'LIQUIDATION';
        }

        return {
          ...b,
          x: trailPt.x,
          y: trailPt.y,
          changePercent: trailPt.changePercent !== undefined ? trailPt.changePercent : b.changePercent,
          flowScore: trailPt.flowScore !== undefined ? trailPt.flowScore : b.flowScore,
          quadrant: dynQuadrant,
        };
      }
      return b;
    });
    return resolveBubbleCollisions(temporalBubbles, width, height, padding);
  }, [bubbles, currentDateIndex, width, height, padding]);

  // 2. DOM 頂層繪製排序 (消滅大球吞小球：半徑較大者先畫在底層，小球後畫在頂層；active 泡泡排在絕對最末尾)
  const displayBubbles = useMemo(() => {
    return [...placedBubbles].sort((a, b) => {
      if (activeBubble) {
        if (a.symbol === activeBubble.symbol) return 1;
        if (b.symbol === activeBubble.symbol) return -1;
      }
      return b.radius - a.radius;
    });
  }, [placedBubbles, activeBubble]);

  // 3. 即時時序影格資料抽取 (隨播放進度實時計算當日數值與診斷)
  const activeFrameData = useMemo(() => {
    if (!activeBubble) return null;
    const dateStr = availableDates && availableDates.length > currentDateIndex ? availableDates[currentDateIndex] : undefined;
    return getTemporalBubbleFrameData(activeBubble, currentDateIndex, dateStr);
  }, [activeBubble, currentDateIndex, availableDates]);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 29, 0.95) 100%)',
        border: '1px solid rgba(51, 65, 85, 0.4)',
        borderRadius: '16px',
        padding: '20px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* 頂部資訊與導引切換 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
              🪐 聰明錢與籌碼動態星圖 (Smart Money Bubble Map)
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '8px',
                fontWeight: 700,
                background:
                  overallSentiment === 'BULLISH'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : overallSentiment === 'BEARISH'
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(148, 163, 184, 0.2)',
                color:
                  overallSentiment === 'BULLISH'
                    ? '#f87171'
                    : overallSentiment === 'BEARISH'
                    ? '#34d399'
                    : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {overallSentiment === 'BULLISH'
                ? '🔥 機構合力偏多'
                : overallSentiment === 'BEARISH'
                ? '❄️ 機構調節偏空'
                : '⚖️ 多空籌碼平衡'}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
            {summaryText || '即時偵測外資、投信與美股機構大單真實位移，透視主力是進駐還是出貨。'}
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: showGuide ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: '10px',
            padding: '6px 12px',
            color: '#93c5fd',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <HelpCircle size={14} />
          <span>💡 3 秒新手速讀指南</span>
          {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 💡 折疊式新手速讀指南 */}
      {showGuide && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            background: 'rgba(30, 41, 59, 0.45)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '16px',
            fontSize: '0.8rem',
            lineHeight: '1.5',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🎯</span>
            <div>
              <strong style={{ color: '#60a5fa' }}>泡泡大小 (Size)</strong>
              <div style={{ color: '#cbd5e1' }}>
                代表該股票在你的資產（或市場總成交量）中的<strong>份量大小</strong>。泡泡愈大，代表影響力愈關鍵！
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🎨</span>
            <div>
              <strong style={{ color: '#34d399' }}>泡泡顏色 (Color)</strong>
              <div style={{ color: '#cbd5e1' }}>
                連動你的慣用主題：外資投信合買呈現<strong>多頭光暈</strong>；主力大賣則呈現<strong>空頭警示色</strong>。
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🚀</span>
            <div>
              <strong style={{ color: '#f59e0b' }}>位移方向 (Motion)</strong>
              <div style={{ color: '#cbd5e1' }}>
                往<strong>右上衝</strong>代表大機構正在狂歡推升；往<strong>右下鑽</strong>代表股價漲但主力在偷倒貨割韭菜！
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主 SVG 畫布區域 */}
      <div
        onClick={() => setSelectedBubble(null)}
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          borderRadius: '12px',
          background: 'rgba(10, 15, 29, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.3)',
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onClick={() => setSelectedBubble(null)}
        >
          <defs>
            {/* 濾鏡光暈 */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 四象限背景氛圍色塊 */}
          {/* 右上：主力抬轎飆股區 */}
          <rect
            x={width / 2}
            y={padding}
            width={width / 2 - padding}
            height={height / 2 - padding}
            fill="rgba(239, 68, 68, 0.04)"
          />
          {/* 左上：逢低撿便宜區 */}
          <rect
            x={padding}
            y={padding}
            width={width / 2 - padding}
            height={height / 2 - padding}
            fill="rgba(245, 158, 11, 0.04)"
          />
          {/* 右下：割韭菜警戒區 */}
          <rect
            x={width / 2}
            y={height / 2}
            width={width / 2 - padding}
            height={height / 2 - padding}
            fill="rgba(16, 185, 129, 0.04)"
          />
          {/* 左下：冷凍提款區 */}
          <rect
            x={padding}
            y={height / 2}
            width={width / 2 - padding}
            height={height / 2 - padding}
            fill="rgba(100, 116, 139, 0.04)"
          />

          {/* 中心中軸十字線 */}
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <line
            x1={width / 2}
            y1={padding}
            x2={width / 2}
            y2={height - padding}
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* 四象限生活化浮水印文字 (依據使用者選擇習慣燈號顏色顯示) */}
          {(() => {
            const watermarkColors = getQuadrantWatermarkColors(colorTheme);
            return (
              <>
                <text
                  x={width - padding - 15}
                  y={padding + 25}
                  textAnchor="end"
                  fill={watermarkColors.breakout}
                  fontSize="13"
                  fontWeight="700"
                >
                  🔥 主力抬轎飆股區 (價漲 + 法人大買)
                </text>
                <text
                  x={padding + 15}
                  y={padding + 25}
                  textAnchor="start"
                  fill={watermarkColors.accumulation}
                  fontSize="13"
                  fontWeight="700"
                >
                  🛡️ 逢低撿便宜區 (價跌 + 法人偷偷吃貨)
                </text>
                <text
                  x={width - padding - 15}
                  y={height - padding - 15}
                  textAnchor="end"
                  fill={watermarkColors.distribution}
                  fontSize="13"
                  fontWeight="700"
                >
                  ⚠️ 割韭菜警戒區 (價漲 + 法人趁高倒貨)
                </text>
                <text
                  x={padding + 15}
                  y={height - padding - 15}
                  textAnchor="start"
                  fill={watermarkColors.liquidation}
                  fontSize="13"
                  fontWeight="700"
                >
                  ❄️ 冷凍提款區 (價跌 + 法人逃跑提款)
                </text>
              </>
            );
          })()}

          {/* 軸向指引箭頭與標籤 */}
          <text
            x={width - padding}
            y={height / 2 - 8}
            textAnchor="end"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="600"
          >
            價格強勢上漲 ▶
          </text>
          <text
            x={padding}
            y={height / 2 - 8}
            textAnchor="start"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="600"
          >
            ◀ 價格重挫回檔
          </text>
          <text
            x={width / 2 + 10}
            y={padding + 12}
            textAnchor="start"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="600"
          >
            ▲ 大機構聰明錢瘋狂買進
          </text>
          <text
            x={width / 2 + 10}
            y={height - padding - 6}
            textAnchor="start"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="600"
          >
            ▼ 大機構聰明錢大舉倒貨
          </text>

          {/* 渲染泡泡歷史彗星尾巴 (Motion Trails - 隨播放進度漸進展開) */}
          {displayBubbles.map((b) => {
            if (!b.trail || b.trail.length < 2) return null;
            // 彗星尾巴只呈現截至當前播放日期的軌跡點
            const visibleTrail = b.trail.slice(0, currentDateIndex + 1);
            if (visibleTrail.length < 2) return null;

            const points = visibleTrail.map((t: { x: number; y: number }, idx: number) => {
              if (idx === visibleTrail.length - 1 && b.cx !== undefined && b.cy !== undefined) {
                return `${b.cx},${b.cy}`;
              }
              const { cx, cy } = calculateCanvasCoordinates(t.x, t.y, width, height, padding);
              return `${cx},${cy}`;
            });
            const strokeColor = getBubbleStrokeColor(b, colorTheme);

            return (
              <g key={`trail-${b.symbol}`}>
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  strokeOpacity={activeBubble?.symbol === b.symbol ? '0.75' : '0.35'}
                />
              </g>
            );
          })}

          {/* 渲染各標的實體泡泡節點 (聚光燈高亮與防重疊坐標) */}
          {displayBubbles.map((b) => {
            const cx = b.cx !== undefined ? b.cx : calculateCanvasCoordinates(b.x, b.y, width, height, padding).cx;
            const cy = b.cy !== undefined ? b.cy : calculateCanvasCoordinates(b.x, b.y, width, height, padding).cy;
            const fillColor = getBubbleFillColor(b, colorTheme, b.quadrant);
            const strokeColor = getBubbleStrokeColor(b, colorTheme, b.quadrant);
            const isHovered = hoveredBubble?.symbol === b.symbol;
            const isSelected = selectedBubble?.symbol === b.symbol;
            const isActive = isHovered || isSelected;
            const currentRadius = isActive ? b.radius * 1.15 : b.radius;
            // 聚光燈模式：當有選中或懸浮泡泡時，其他泡泡降至 0.25 透明度
            const bubbleOpacity = activeBubble ? (isActive ? 1.0 : 0.25) : 1.0;

            return (
              <g
                key={b.symbol}
                style={{
                  cursor: 'pointer',
                  opacity: bubbleOpacity,
                  transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={() => setHoveredBubble(b)}
                onMouseLeave={() => setHoveredBubble(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBubble(selectedBubble?.symbol === b.symbol ? null : b);
                }}
              >
                {/* 脈衝外光暈 */}
                {isActive && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={currentRadius + 6}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    strokeDasharray="4 4"
                  />
                )}

                {/* 主實體泡泡 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={currentRadius}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  filter="url(#glow)"
                  style={{
                    transition: 'cx 0.4s ease-out, cy 0.4s ease-out, r 0.3s ease',
                  }}
                />

                {/* 泡泡中心標籤文字 */}
                <text
                  x={cx}
                  y={cy - 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  fontSize={b.radius >= 28 ? '11' : '10'}
                  fontWeight="800"
                  pointerEvents="none"
                  style={{
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    transition: 'x 0.4s ease-out, y 0.4s ease-out',
                  }}
                >
                  {b.symbol}
                </text>
                <text
                  x={cx}
                  y={cy + 11}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#e2e8f0"
                  fontSize="9"
                  fontWeight="600"
                  pointerEvents="none"
                  style={{
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    transition: 'x 0.4s ease-out, y 0.4s ease-out',
                  }}
                >
                  {b.changePercent >= 0 ? '+' : ''}
                  {b.changePercent.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* 懸浮 Tooltip 浮窗 (大白話結論先行 & 象限對角智慧避讓，徹底避免擋住目標泡泡) */}
        {activeBubble && activeFrameData && (() => {
          const activeCx = activeBubble.cx !== undefined ? activeBubble.cx : calculateCanvasCoordinates(activeBubble.x, activeBubble.y, width, height, padding).cx;
          const activeCy = activeBubble.cy !== undefined ? activeBubble.cy : calculateCanvasCoordinates(activeBubble.x, activeBubble.y, width, height, padding).cy;
          const isPinned = !!selectedBubble;
          const placement = calculateTooltipPlacement(activeCx, activeCy, width, height, isPinned);

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                ...placement,
                background: 'rgba(15, 23, 42, 0.95)',
                border: `1px solid ${getBubbleStrokeColor(activeBubble, colorTheme)}`,
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(16px)',
                transition: 'top 0.25s ease, bottom 0.25s ease, left 0.25s ease, right 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                    {activeBubble.name} ({activeBubble.symbol})
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#93c5fd',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    {activeBubble.market}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {activeBubble.synergyLabel && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: activeBubble.institutionalSynergy === 'TUG_OF_WAR' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        color: activeBubble.institutionalSynergy === 'TUG_OF_WAR' ? '#fde047' : '#e2e8f0',
                        border: activeBubble.institutionalSynergy === 'TUG_OF_WAR' ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                      }}
                    >
                      {activeBubble.synergyLabel}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: getBubbleStrokeColor(activeBubble, colorTheme),
                    }}
                  >
                    {activeFrameData.quadrantLabel}
                  </span>
                  {selectedBubble && (
                    <button
                      onClick={() => setSelectedBubble(null)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        marginLeft: '4px',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.color = '#fca5a5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = '#94a3b8';
                      }}
                      title="關閉卡片 (或點擊畫布空白處)"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* 播放日期與即時漲跌幅標籤 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: 600 }}>
                  <Calendar size={12} />
                  <span>{activeFrameData.date}</span>
                </span>
                <span>•</span>
                <span style={{ fontWeight: 700, color: activeFrameData.changePercent >= 0 ? '#f87171' : '#34d399' }}>
                  當日表現: {activeFrameData.changePercent >= 0 ? '+' : ''}{activeFrameData.changePercent.toFixed(2)}%
                </span>
              </div>

              {/* 人類大白話結論先行 (隨影格日期動態更新) */}
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  marginTop: '8px',
                  lineHeight: '1.4',
                }}
              >
                {activeFrameData.diagnosisTitle}
              </div>

              {/* 生活化詳細解說 (隨影格日期動態更新) */}
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  marginTop: '4px',
                  lineHeight: '1.4',
                }}
              >
                {activeFrameData.diagnosisDetail}
              </div>

              {/* 詳細三大法人數據 */}
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Info size={13} color="#60a5fa" />
                <span>
                  {formatInstitutionalDetailText({
                    market: activeBubble.market,
                    foreignNetShares: activeFrameData.foreignNetShares,
                    trustNetShares: activeFrameData.trustNetShares,
                    dealerNetShares: activeFrameData.dealerNetShares,
                    cmf: activeFrameData.cmf,
                  })}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 底部時序播放控制器 (Timeline Player) */}
      {availableDates.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(30, 41, 59, 0.4)',
            borderRadius: '12px',
            border: '1px solid rgba(51, 65, 85, 0.3)',
          }}
        >
          {/* 播放 / 暫停 / 速度 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isPlaying ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                border: `1px solid ${isPlaying ? '#ef4444' : '#10b981'}`,
                color: isPlaying ? '#fca5a5' : '#6ee7b7',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? '暫停' : '播放時序'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                if (onDateChange) onDateChange(0);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(51, 65, 85, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} />
              <span>重播</span>
            </button>

            <button
              onClick={() => setPlaySpeed(playSpeed === 1 ? 2 : 1)}
              style={{
                background: 'rgba(51, 65, 85, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: '#93c5fd',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {playSpeed}x 速度
            </button>
          </div>

          {/* 日期進度滑桿 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              minWidth: '240px',
              maxWidth: '480px',
            }}
          >
            <Calendar size={15} color="#94a3b8" />
            <input
              type="range"
              min="0"
              max={availableDates.length - 1}
              value={currentDateIndex}
              onChange={(e) => {
                setIsPlaying(false);
                if (onDateChange) onDateChange(parseInt(e.target.value, 10));
              }}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: '#3b82f6',
              }}
            />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
              {availableDates[currentDateIndex] || '最新盤後'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
