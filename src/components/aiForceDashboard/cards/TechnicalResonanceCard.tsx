import React from 'react';
import { Activity, AlertTriangle, BarChart2, Compass, Gauge, ShieldAlert, Target, Zap } from 'lucide-react';
import { OBSIDIAN_CARD_CONTAINER, resolveDirectionalPalette } from '../../../constants/designTokens';
import type {
  ResonancePillarTone,
  TechnicalResonanceReport,
} from '../../../engine/technicalResonanceEngine';
import type { SubchartIndicatorMode } from '../../../types/aiForceDashboard';
import type { ColorThemeMode, MarketType } from '../../../types/stock';

export interface TechnicalResonanceCardProps {
  resonance: TechnicalResonanceReport;
  activeSubchartMode: SubchartIndicatorMode;
  onSelectSubchart: (mode: SubchartIndicatorMode) => void;
  primaryVerb: string;
  verdictSummary: string;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

const TIMEFRAME_LABEL: Record<TechnicalResonanceReport['timeframe'], string> = {
  DAY: '日K',
  WEEK: '週K',
  MONTH: '月K',
};

export const TechnicalResonanceCard: React.FC<TechnicalResonanceCardProps> = ({
  resonance,
  activeSubchartMode,
  onSelectSubchart,
  primaryVerb,
  verdictSummary,
  stopLossPrice,
  takeProfitPrice,
  colorTheme = 'taiwan',
  market = 'TW',
}) => {
  const { upColor, downColor } = resolveDirectionalPalette(colorTheme, market);
  const pricePrefix = market === 'US' ? '$' : '';

  const resolveToneColor = (tone: ResonancePillarTone): { text: string; bg: string; border: string } => {
    if (tone === 'BULL') {
      return { text: upColor, bg: `${upColor}20`, border: `${upColor}55` };
    }
    if (tone === 'BEAR') {
      return { text: downColor, bg: `${downColor}20`, border: `${downColor}55` };
    }
    if (tone === 'WARN') {
      return { text: '#fbbf24', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.4)' };
    }
    return { text: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)', border: 'rgba(148, 163, 184, 0.3)' };
  };

  const overallColors = resolveToneColor(resonance.summary.overallTone);
  const volColors = resolveToneColor(resonance.volume.tone);
  const kdjColors = resolveToneColor(resonance.kdj.tone);
  const macdColors = resolveToneColor(resonance.macd.tone);
  const rsiColors = resolveToneColor(resonance.rsi.tone);

  const pillars: Array<{
    mode: SubchartIndicatorMode;
    title: string;
    icon: React.ReactNode;
    statusLabel: string;
    colors: { text: string; bg: string; border: string };
    primaryMetrics: string;
    secondaryMeta: string;
    interpretation: string;
    extraBadge?: string;
  }> = [
    {
      mode: 'VOL',
      title: '成交量 (VOL)',
      icon: <BarChart2 size={14} color="#fbbf24" />,
      statusLabel: resonance.volume.statusLabel,
      colors: volColors,
      primaryMetrics: resonance.volume.isAvailable
        ? `${resonance.volume.volumeDisplay.toLocaleString()} ${resonance.volume.volumeUnit}`
        : '樣本累積中',
      secondaryMeta: resonance.volume.isAvailable
        ? `5日量比 ${resonance.volume.volRatio5 ?? '-'}x · 20日 ${resonance.volume.volRatio20 ?? '-'}x · OBV ${
            resonance.volume.obvTrend === 'RISING'
              ? '上升'
              : resonance.volume.obvTrend === 'FALLING'
                ? '下降'
                : '持平'
          }`
        : '等待有效收盤量能',
      interpretation: resonance.volume.interpretation,
      extraBadge: resonance.volume.isVolumeAnchoredToPrevClose
        ? `盤中量未結算 · 前收定錨 ${resonance.volume.anchorDate || ''}`
        : undefined,
    },
    {
      mode: 'KD',
      title: 'KDJ 擺盪 (9,3,3)',
      icon: <Gauge size={14} color="#38bdf8" />,
      statusLabel: resonance.kdj.statusLabel,
      colors: kdjColors,
      primaryMetrics: resonance.kdj.isAvailable
        ? `K:${resonance.kdj.k} · D:${resonance.kdj.d} · J:${resonance.kdj.j}`
        : '樣本累積中',
      secondaryMeta: resonance.kdj.weeklyResonanceLabel
        ? `多週期：${resonance.kdj.weeklyResonanceLabel}`
        : `時框基準：${TIMEFRAME_LABEL[resonance.timeframe]}（需滿 9 期）`,
      interpretation: resonance.kdj.interpretation,
    },
    {
      mode: 'MACD',
      title: 'MACD 趨勢 (12,26,9)',
      icon: <Activity size={14} color="#60a5fa" />,
      statusLabel: resonance.macd.statusLabel,
      colors: macdColors,
      primaryMetrics: resonance.macd.isAvailable
        ? `DIF:${resonance.macd.dif} · DEA:${resonance.macd.dea} · 柱:${resonance.macd.hist}`
        : '樣本累積中',
      secondaryMeta: resonance.macd.isAvailable
        ? `零軸${
            resonance.macd.zeroAxisPosition === 'ABOVE'
              ? '上方'
              : resonance.macd.zeroAxisPosition === 'BELOW'
                ? '下方'
                : '附近'
          } · 連 ${resonance.macd.histStreakDays} 期${
            resonance.macd.divergence === 'BEARISH'
              ? ' · 頂背離'
              : resonance.macd.divergence === 'BULLISH'
                ? ' · 底背離'
                : ''
          }`
        : `時框基準：${TIMEFRAME_LABEL[resonance.timeframe]}（需滿 26 期）`,
      interpretation: resonance.macd.interpretation,
    },
    {
      mode: 'RSI',
      title: 'RSI 強弱 (6 / 14)',
      icon: <Compass size={14} color="#c084fc" />,
      statusLabel: resonance.rsi.statusLabel,
      colors: rsiColors,
      primaryMetrics: resonance.rsi.isAvailable
        ? `RSI14:${resonance.rsi.rsi14} · RSI6:${resonance.rsi.rsi6 ?? '-'}`
        : '樣本累積中',
      secondaryMeta: resonance.rsi.isAvailable
        ? `${
            resonance.rsi.crossState === 'BULL_CROSS'
              ? '快線上穿慢線'
              : resonance.rsi.crossState === 'BEAR_CROSS'
                ? '快線下穿慢線'
                : '快慢線延續'
          }${
            resonance.rsi.divergence === 'BEARISH'
              ? ' · 頂背離'
              : resonance.rsi.divergence === 'BULLISH'
                ? ' · 底背離'
                : ''
          }`
        : `時框基準：${TIMEFRAME_LABEL[resonance.timeframe]}（需滿 15 期）`,
      interpretation: resonance.rsi.interpretation,
    },
  ];

  const winStat = resonance.summary.historicalWinRate;
  const barUnit =
    resonance.timeframe === 'WEEK' ? '週' : resonance.timeframe === 'MONTH' ? '月' : '日';

  return (
    <div
      style={{
        ...OBSIDIAN_CARD_CONTAINER,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* 頂部融合摘要帶：保留 executive-verdict-strip 測試契約 + 體制與四維共鳴總評 */}
      <div
        data-testid="executive-verdict-strip"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 380px', minWidth: 0, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.75rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
            }}
          >
            01B
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
            四維量價動能共鳴解碼 ({TIMEFRAME_LABEL[resonance.timeframe]})
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            <Zap size={12} />
            <span>{primaryVerb}</span>
          </span>
          <span
            style={{
              padding: '3px 9px',
              borderRadius: '6px',
              backgroundColor: overallColors.bg,
              border: `1px solid ${overallColors.border}`,
              color: overallColors.text,
              fontSize: '0.75rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {resonance.summary.overallBadge}
          </span>
          <span
            style={{
              padding: '3px 9px',
              borderRadius: '6px',
              backgroundColor: 'rgba(99, 102, 241, 0.16)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#a5b4fc',
              fontSize: '0.75rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {resonance.regime.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ color: '#94a3b8' }}>
            {winStat.isSufficient
              ? `近250期${winStat.signalName}10${barUnit}勝率 ${winStat.winRatePercent}% (${winStat.sampleCount}次 · 均報酬 ${
                  (winStat.avgReturn10dPercent ?? 0) >= 0 ? '+' : ''
                }${winStat.avgReturn10dPercent}%)`
              : `${winStat.signalName} 歷史樣本不足 (${winStat.sampleCount} 次)`}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
            <ShieldAlert size={13} />
            <span>停損防線</span>
            <strong style={{ color: '#f8fafc' }}>
              {stopLossPrice !== undefined ? `${pricePrefix}${stopLossPrice.toFixed(2)}` : '-'}
            </strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
            <Target size={13} />
            <span>停利目標</span>
            <strong style={{ color: '#f8fafc' }}>
              {takeProfitPrice !== undefined ? `${pricePrefix}${takeProfitPrice.toFixed(2)}` : '-'}
            </strong>
          </span>
        </div>

        <div style={{ width: '100%', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>
          {verdictSummary}
        </div>
      </div>

      {/* 四宮格互動診斷磚（點擊即聯動切換主 K 線副圖） */}
      <div
        data-testid="technical-resonance-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
        }}
      >
        {pillars.map((p) => {
          const isActive = activeSubchartMode === p.mode;
          return (
            <button
              key={p.mode}
              type="button"
              data-subchart={p.mode}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onSelectSubchart(p.mode)}
              style={{
                textAlign: 'left',
                padding: '12px',
                borderRadius: '10px',
                background: isActive ? 'rgba(30, 41, 59, 0.92)' : 'rgba(15, 23, 42, 0.6)',
                border: isActive
                  ? `1.5px solid ${p.colors.text}`
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isActive ? `0 0 0 1px ${p.colors.border}` : 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minWidth: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', width: '100%' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', fontWeight: 700, color: '#f8fafc' }}>
                  {p.icon}
                  <span>{p.title}</span>
                </span>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: p.colors.bg,
                    border: `1px solid ${p.colors.border}`,
                    color: p.colors.text,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.statusLabel}
                </span>
              </div>

              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                {p.primaryMetrics}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.secondaryMeta}</div>

              {p.extraBadge && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#fbbf24',
                    background: 'rgba(245, 158, 11, 0.14)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontWeight: 600,
                  }}
                >
                  {p.extraBadge}
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.45, marginTop: 'auto' }}>
                {p.interpretation}
              </div>
            </button>
          );
        })}
      </div>

      {/* 底部體制權重提示、衝突警示與失效防線 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{resonance.regime.weightHint}</span>
          <span style={{ color: '#94a3b8' }}>點擊任一磚塊即可聯動切換上方主 K 線副圖</span>
        </div>

        {resonance.summary.conflictAlert && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={14} />
            <span>{resonance.summary.conflictAlert}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', color: '#e2e8f0' }}>
          <span>
            <strong style={{ color: overallColors.text }}>操作指引：</strong>
            {resonance.summary.actionAdvice}
          </span>
          <span style={{ color: '#94a3b8' }}>{resonance.summary.invalidationRule}</span>
        </div>
      </div>
    </div>
  );
};
