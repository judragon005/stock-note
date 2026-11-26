import React, { useMemo, useId } from 'react';
import { OBSIDIAN_CARD_CONTAINER, resolveDirectionalPalette } from '../../../constants/designTokens';
import { TDCC_GAP_THRESHOLD_DAYS, calcCalendarDayGap } from '../../../engine/aiForceMarketAssembly';
import { TdccDistributionData } from '../../../types/aiForceDashboard';
import { ColorThemeMode, MarketType } from '../../../types/stock';
import { Users, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface TdccScales {
  leftMin: number;
  leftMax: number;
  rightMin: number;
  rightMax: number;
}

export interface TdccPaddingConfig {
  top: number;
  bottom: number;
}

/**
 * 計算 TDCC 雙軸極值 (左軸千張大戶 %，右軸股東人數)
 */
export function calculateTdccScales(
  history: TdccDistributionData['history'] = [],
  _height: number = 180,
  _padding: TdccPaddingConfig = { top: 20, bottom: 25 }
): TdccScales {
  if (!history || history.length === 0) {
    return {
      leftMin: 0,
      leftMax: 100,
      rightMin: 0,
      rightMax: 1000000,
    };
  }

  let minRatio = Infinity;
  let maxRatio = -Infinity;
  let minHolders = Infinity;
  let maxHolders = -Infinity;

  history.forEach((h) => {
    if (h.over1000Ratio < minRatio) minRatio = h.over1000Ratio;
    if (h.over1000Ratio > maxRatio) maxRatio = h.over1000Ratio;
    if (h.totalShareholders < minHolders) minHolders = h.totalShareholders;
    if (h.totalShareholders > maxHolders) maxHolders = h.totalShareholders;
  });

  const ratioSpan = maxRatio - minRatio || 1;
  const holdersSpan = maxHolders - minHolders || 100;

  return {
    leftMin: Math.max(0, Number((minRatio - ratioSpan * 0.15).toFixed(2))),
    leftMax: Number((maxRatio + ratioSpan * 0.15).toFixed(2)),
    rightMin: Math.max(0, Math.floor(minHolders - holdersSpan * 0.15)),
    rightMax: Math.ceil(maxHolders + holdersSpan * 0.15),
  };
}

/**
 * 投影千張大戶比例至 SVG Y 座標 (左軸)
 */
export function projectTdccRatioToY(
  ratio: number,
  scales: TdccScales,
  height: number = 180,
  padding: TdccPaddingConfig = { top: 20, bottom: 25 }
): number {
  const usable = height - padding.top - padding.bottom;
  const span = scales.leftMax - scales.leftMin || 1;
  const norm = (ratio - scales.leftMin) / span;
  return Number((padding.top + usable * (1 - norm)).toFixed(1));
}

/**
 * 投影總股東人數至 SVG Y 座標 (右軸長條高度基準)
 */
export function projectTdccShareholdersToY(
  holders: number,
  scales: TdccScales,
  height: number = 180,
  padding: TdccPaddingConfig = { top: 20, bottom: 25 }
): number {
  const usable = height - padding.top - padding.bottom;
  const span = scales.rightMax - scales.rightMin || 1;
  const norm = (holders - scales.rightMin) / span;
  return Number((padding.top + usable * (1 - norm)).toFixed(1));
}

export interface NormalizedUs13fOwnership {
  hasStructureData: boolean;
  instWidth: number;
  insiderWidth: number;
  publicWidth: number;
}

/**
 * 歸一化美股 13F 持股結構寬度，防止 institutional + insider > 100% 擠壓文字，並在無結構資料時拒絕偽造 50%/10%
 */
export function normalizeUs13fOwnership(
  us13f?: TdccDistributionData['us13fData']
): NormalizedUs13fOwnership {
  if (
    !us13f ||
    (us13f.institutionalRatio === undefined &&
      us13f.insiderRatio === undefined &&
      us13f.publicFloatRatio === undefined)
  ) {
    return { hasStructureData: false, instWidth: 0, insiderWidth: 0, publicWidth: 0 };
  }
  const inst = Math.max(0, us13f.institutionalRatio ?? 0);
  const insider = Math.max(0, us13f.insiderRatio ?? 0);
  const sumKnown = inst + insider;
  if (sumKnown <= 0 && (us13f.publicFloatRatio ?? 0) <= 0) {
    return { hasStructureData: false, instWidth: 0, insiderWidth: 0, publicWidth: 0 };
  }
  if (sumKnown >= 100) {
    return {
      hasStructureData: true,
      instWidth: Number(((inst / sumKnown) * 100).toFixed(2)),
      insiderWidth: Number(((insider / sumKnown) * 100).toFixed(2)),
      publicWidth: 0,
    };
  }
  const pub =
    us13f.publicFloatRatio !== undefined
      ? Math.max(0, us13f.publicFloatRatio)
      : Math.max(0, 100 - sumKnown);
  const total = sumKnown + pub || 100;
  return {
    hasStructureData: true,
    instWidth: Number(((inst / total) * 100).toFixed(2)),
    insiderWidth: Number(((insider / total) * 100).toFixed(2)),
    publicWidth: Number(((pub / total) * 100).toFixed(2)),
  };
}

interface TdccDistributionCardProps {
  data: TdccDistributionData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

export const TdccDistributionCard: React.FC<TdccDistributionCardProps> = ({
  data,
  colorTheme,
  market,
}) => {
  const uid = useId().replace(/:/g, '');
  const holderBarGradId = `holderBarGrad-${uid}`;
  const history = data?.history || [];
  const chartWidth = 340;
  const chartHeight = 170;
  const padding = { top: 20, bottom: 25 };

  const isUsMode = Boolean(data?.isUsMarket || data?.us13fData);
  const palette = resolveDirectionalPalette(colorTheme, market ?? (isUsMode ? 'US' : 'TW'));
  const bullText = palette.upLightColor;
  const bullBg = `rgba(${palette.upRgb}, 0.2)`;
  const bullBorder = `rgba(${palette.upRgb}, 0.4)`;
  const bearText = palette.downLightColor;
  const bearBg = `rgba(${palette.downRgb}, 0.2)`;
  const bearBorder = `rgba(${palette.downRgb}, 0.4)`;

  const isDataEmpty = isUsMode
    ? Boolean(data?.isEmpty || !data?.us13fData)
    : Boolean(data?.isEmpty || !data?.history || data.history.length === 0);

  const scales = useMemo(
    () => calculateTdccScales(history, chartHeight, padding),
    [history, chartHeight]
  );

  const ratioSegments = useMemo(() => {
    if (history.length <= 1) return [] as Array<{ x1: number; y1: number; x2: number; y2: number; isGap: boolean; key: string }>;
    const usableWidth = chartWidth - 40;
    const step = usableWidth / Math.max(1, history.length - 1);
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number; isGap: boolean; key: string }> = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const x1 = Number((20 + (i - 1) * step).toFixed(1));
      const y1 = projectTdccRatioToY(prev.over1000Ratio, scales, chartHeight, padding);
      const x2 = Number((20 + i * step).toFixed(1));
      const y2 = projectTdccRatioToY(curr.over1000Ratio, scales, chartHeight, padding);
      const diffDays = calcCalendarDayGap(curr.date, prev.date);
      segments.push({
        x1,
        y1,
        x2,
        y2,
        isGap: diffDays > TDCC_GAP_THRESHOLD_DAYS,
        key: `seg-${prev.date}-${curr.date}`,
      });
    }
    return segments;
  }, [history, scales, chartHeight]);

  const hasChartGaps = useMemo(
    () => Boolean(data?.hasDateGaps || ratioSegments.some((s) => s.isGap)),
    [data?.hasDateGaps, ratioSegments]
  );

  const badgeColor = useMemo(() => {
    const badge = data?.concentrationBadge || '';
    if (badge.includes('高度集中') || badge.includes('增持') || badge.includes('控盤')) {
      return { bg: bullBg, text: bullText, border: bullBorder };
    }
    if (badge.includes('軋空')) {
      return { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' };
    }
    if (badge.includes('警戒') || badge.includes('調節') || badge.includes('發散')) {
      return { bg: bearBg, text: bearText, border: bearBorder };
    }
    return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
  }, [data?.concentrationBadge, bullBg, bullText, bullBorder, bearBg, bearText, bearBorder]);

  const usOwnership = useMemo(
    () => normalizeUs13fOwnership(data?.us13fData),
    [data?.us13fData]
  );
  const isSqueeze = Boolean(
    data?.us13fData?.isSqueezeRisk || (data?.us13fData?.shortFloatRatio ?? 0) > 10
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        ...OBSIDIAN_CARD_CONTAINER,
      }}
    >
      {/* 標題列 */}
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
              padding: '2px 6px',
              borderRadius: '5px',
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}
          >
            {data?.symbol ? `19 · ${data.symbol}` : '19'}
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '0.98rem',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={16} color="#a78bfa" />
            {isUsMode ? (
              <TermTooltip termId="usInstitutionalHoldings">美股機構持股與放空籌碼</TermTooltip>
            ) : (
              <TermTooltip termId="tdccDistribution">
                {data?.symbol ? 'TDCC 集保趨勢' : 'TDCC 集保千張大戶趨勢'}
              </TermTooltip>
            )}
          </h3>
        </div>

        {/* 狀態徽章 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '999px',
            background: badgeColor.bg,
            border: `1px solid ${badgeColor.border}`,
            color: badgeColor.text,
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {data?.concentrationBadge?.includes('高度集中') || data?.concentrationBadge?.includes('控盤') ? (
            <ShieldCheck size={13} />
          ) : data?.concentrationBadge?.includes('警戒') || data?.concentrationBadge?.includes('軋空') ? (
            <AlertTriangle size={13} />
          ) : (
            <TrendingUp size={13} />
          )}
          <span>{data?.concentrationBadge || '暫無資料'}</span>
        </div>
      </div>

      {/* 空狀態防禦 (Honest Empty State) */}
      {isDataEmpty ? (
        <div
          data-testid="tdcc-empty-state"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 12px',
            color: '#94a3b8',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <Users size={32} opacity={0.3} />
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#cbd5e1' }}>
            {data?.emptyMessage || '尚無集保分散資料'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {data?.asOfDateText || '集保每週五收盤後更新'}
          </div>
        </div>
      ) : isUsMode && data?.us13fData ? (
        <>
          {/* 美股 13F 與放空籌碼三宮格指標 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>機構持股比 (13F)</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c084fc' }}>
                {data.us13fData.institutionalRatio !== undefined
                  ? `${data.us13fData.institutionalRatio.toFixed(2)}%`
                  : '--'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: `1px solid ${
                  isSqueeze
                    ? 'rgba(239, 68, 68, 0.35)'
                    : 'rgba(59, 130, 246, 0.2)'
                }`,
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <TermTooltip termId="shortFloat">空單佔流通比 (Short Float)</TermTooltip>
              </div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: isSqueeze ? '#f87171' : '#38bdf8',
                }}
              >
                {data.us13fData.shortFloatRatio !== undefined
                  ? `${data.us13fData.shortFloatRatio.toFixed(2)}%`
                  : '--'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>內部人持股比</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {data.us13fData.insiderRatio !== undefined
                  ? `${data.us13fData.insiderRatio.toFixed(2)}%`
                  : '--'}
              </div>
            </div>
          </div>

          {/* 持股結構分佈水平長條圖 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>
              持股結構分佈 (機構 / 內部人 / 公眾流通)
            </div>
            {!usOwnership.hasStructureData ? (
              <div
                data-testid="us13f-structure-empty"
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.45)',
                  border: '1px dashed rgba(148, 163, 184, 0.25)',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  textAlign: 'center',
                }}
              >
                機構與內部人持股結構資料待更新
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  height: '24px',
                  width: '100%',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: 'rgba(30, 41, 59, 0.6)',
                }}
              >
                {usOwnership.instWidth > 0 && (
                  <div
                    style={{
                      width: `${usOwnership.instWidth}%`,
                      background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      color: '#fff',
                      fontWeight: 700,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    title={`機構: ${data.us13fData.institutionalRatio ?? 0}%`}
                  >
                    {usOwnership.instWidth >= 14 && `${Math.round(usOwnership.instWidth)}%`}
                  </div>
                )}
                {usOwnership.insiderWidth > 0 && (
                  <div
                    style={{
                      width: `${usOwnership.insiderWidth}%`,
                      background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      color: '#fff',
                      fontWeight: 700,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    title={`內部人: ${data.us13fData.insiderRatio ?? 0}%`}
                  >
                    {usOwnership.insiderWidth >= 12 && `${Math.round(usOwnership.insiderWidth)}%`}
                  </div>
                )}
                {usOwnership.publicWidth > 0 && (
                  <div
                    style={{
                      width: `${usOwnership.publicWidth}%`,
                      background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      color: '#fff',
                      fontWeight: 700,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    title={`公眾流通: ${usOwnership.publicWidth.toFixed(1)}%`}
                  >
                    {usOwnership.publicWidth >= 14 && `${Math.round(usOwnership.publicWidth)}%`}
                  </div>
                )}
              </div>
            )}

            {/* 圖例說明 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px',
                fontSize: '0.75rem',
                color: '#94a3b8',
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#a78bfa' }} />
                  機構 (13F)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#60a5fa' }} />
                  內部人
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38bdf8' }} />
                  公眾流通
                </span>
              </div>
              <span>{data.us13fData.asOfQuarterText || data.asOfDateText}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 指標概覽卡片 (自適應 3 欄或 4 欄) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                data.latestUnder10Ratio !== undefined
                  ? 'repeat(auto-fit, minmax(75px, 1fr))'
                  : 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: data.retailScissorsText ? '8px' : '12px',
            }}
          >
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>千張大戶持股比</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c084fc' }}>
                {data.latestOver1000Ratio !== undefined ? `${data.latestOver1000Ratio.toFixed(2)}%` : '--'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {data.compareLabel || '近 4 週大戶變動'}
              </div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color:
                    data.change4WeeksRatio === undefined
                      ? '#94a3b8'
                      : data.change4WeeksRatio > 0
                      ? bullText
                      : data.change4WeeksRatio < 0
                      ? bearText
                      : '#94a3b8',
                }}
              >
                {data.change4WeeksRatio !== undefined
                  ? `${data.change4WeeksRatio >= 0 ? '+' : ''}${data.change4WeeksRatio.toFixed(2)}%`
                  : '--'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>總股東人數</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {data.latestShareholders !== undefined
                  ? data.latestShareholders.toLocaleString()
                  : '--'}
              </div>
            </div>

            {data.latestUnder10Ratio !== undefined && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.55)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>散戶持股比 (10張以下)</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                  {data.latestUnder10Ratio.toFixed(2)}%
                </div>
              </div>
            )}
          </div>

          {/* 散戶剪刀差狀態標籤 */}
          {data.retailScissorsText && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                marginBottom: '10px',
                borderRadius: '6px',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#94a3b8' }}>籌碼剪刀差判定</span>
              <span style={{ color: '#c084fc' }}>{data.retailScissorsText}</span>
            </div>
          )}

          {/* 雙軸 SVG 趨勢圖 */}
          <div style={{ flex: 1, position: 'relative', minHeight: '130px' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id={holderBarGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.08" />
                </linearGradient>
              </defs>

              {/* 背景網格線 */}
              <line
                x1="20"
                y1={padding.top}
                x2={chartWidth - 20}
                y2={padding.top}
                stroke="rgba(148, 163, 184, 0.12)"
                strokeDasharray="3 3"
              />
              <line
                x1="20"
                y1={chartHeight - padding.bottom}
                x2={chartWidth - 20}
                y2={chartHeight - padding.bottom}
                stroke="rgba(148, 163, 184, 0.12)"
              />

              {/* 右軸：總股東人數柱狀圖 */}
              {history.map((h, i) => {
                const usableWidth = chartWidth - 40;
                const isSingle = history.length === 1;
                const step = usableWidth / Math.max(1, history.length - 1);
                const xCenter = isSingle ? chartWidth / 2 : 20 + i * step;
                const barWidth = isSingle ? 28 : Math.min(18, Math.max(8, step * 0.45));
                const yTop = projectTdccShareholdersToY(h.totalShareholders, scales, chartHeight, padding);
                const yBase = chartHeight - padding.bottom;
                const barHeight = Math.max(2, yBase - yTop);
                const shouldShowDate =
                  history.length <= 6 ||
                  i === 0 ||
                  i === history.length - 1 ||
                  (i % 2 === 0 && history.length - 1 - i >= 2);

                return (
                  <g key={`bar-${h.date}`}>
                    <rect
                      x={xCenter - barWidth / 2}
                      y={yTop}
                      width={barWidth}
                      height={barHeight}
                      fill={`url(#${holderBarGradId})`}
                      rx="2"
                    />
                    {/* 日期標籤 (超過 6 週時隔週疏化，防止文字重疊) */}
                    {shouldShowDate && (
                      <text
                        x={xCenter}
                        y={chartHeight - 6}
                        fontSize="12"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        {h.date.substring(5)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 單週基準水平虛線 */}
              {history.length === 1 && (
                <line
                  data-testid="tdcc-single-point-baseline"
                  x1="20"
                  y1={projectTdccRatioToY(history[0].over1000Ratio, scales, chartHeight, padding)}
                  x2={chartWidth - 20}
                  y2={projectTdccRatioToY(history[0].over1000Ratio, scales, chartHeight, padding)}
                  stroke="#c084fc"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />
              )}

              {/* 左軸：千張大戶持股比折線 (Spec 0245 T10: 相鄰週距 > 11 天之斷層段改以虛線誠實標示) */}
              {ratioSegments.map((seg) => (
                <line
                  key={seg.key}
                  data-testid={seg.isGap ? 'tdcc-gap-segment' : undefined}
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  stroke="#c084fc"
                  strokeWidth={seg.isGap ? '2' : '2.5'}
                  strokeLinecap="round"
                  strokeDasharray={seg.isGap ? '4 4' : undefined}
                  opacity={seg.isGap ? '0.65' : '1'}
                />
              ))}

              {/* 折線資料節點圓點 */}
              {history.map((h, i) => {
                const usableWidth = chartWidth - 40;
                const isSingle = history.length === 1;
                const step = usableWidth / Math.max(1, history.length - 1);
                const x = isSingle ? chartWidth / 2 : 20 + i * step;
                const y = projectTdccRatioToY(h.over1000Ratio, scales, chartHeight, padding);

                return (
                  <circle
                    key={`node-${h.date}`}
                    cx={x}
                    cy={y}
                    r={isSingle ? '5' : '3.5'}
                    fill="#a855f7"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>

          {/* 底部圖例與基準日說明 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c084fc' }} />
                千張大戶比 (%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38bdf8' }} />
                總股東人數
              </span>
              {hasChartGaps && (
                <span style={{ color: '#fbbf24' }} title="虛線區段代表集保歷史週次存在 >11 天間隔，系統背景將自動補齊">
                  ┄ 斷層缺口
                </span>
              )}
            </div>
            <span>{data.asOfDateText}</span>
          </div>
        </>
      )}
    </div>
  );
};
