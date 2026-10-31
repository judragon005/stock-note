import React from 'react';
import type {
  MacroIndicatorSnapshot,
  MacroDualThermometerResult,
  MarketViewTab,
} from '../../types/macro';
import { getTwMarketStatus, getUsMarketStatus } from '../../engine/marketStatusEngine';

export interface MacroDualThermometerBarProps {
  macroSnapshot: MacroIndicatorSnapshot;
  dualThermometer: MacroDualThermometerResult;
  activeMarketTab: MarketViewTab;
  onMarketTabChange: (tab: MarketViewTab) => void;
  exDividendImpactPoints?: number;
}

export const MacroDualThermometerBar: React.FC<MacroDualThermometerBarProps> = ({
  macroSnapshot,
  dualThermometer,
  activeMarketTab,
  onMarketTabChange,
  exDividendImpactPoints = 0,
}) => {
  const twSession = getTwMarketStatus();
  const usSession = getUsMarketStatus();

  const { strategicRegime, tacticalSwing } = dualThermometer;

  const getStanceColor = (stance: 'DEFENSIVE' | 'NEUTRAL' | 'AGGRESSIVE') => {
    if (stance === 'AGGRESSIVE') return 'var(--gain-color)';
    if (stance === 'DEFENSIVE') return 'var(--loss-color)';
    return '#eab308';
  };

  const getSwingSignalColor = (
    signal: 'AGGRESSIVE_SWING' | 'PULLBACK_BUY' | 'OVERHEATED_TRIM' | 'DEFENSIVE_CASH'
  ) => {
    if (signal === 'AGGRESSIVE_SWING' || signal === 'PULLBACK_BUY') return 'var(--gain-color)';
    if (signal === 'DEFENSIVE_CASH') return 'var(--loss-color)';
    return '#f59e0b';
  };

  const formatSignedPct = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const getDeltaColor = (val?: number) => {
    if (val === undefined || val === null || isNaN(val) || val === 0) {
      return 'var(--text-secondary)';
    }
    return val > 0 ? 'var(--gain-color)' : 'var(--loss-color)';
  };

  const sourceBadge =
    macroSnapshot.sourceStatus === 'LIVE'
      ? { label: '🟢 線上權威最新', bg: 'rgba(16, 185, 129, 0.14)', color: '#34d399' }
      : macroSnapshot.sourceStatus === 'CALIBRATED'
        ? { label: '⚪ 手動校準快照', bg: 'rgba(56, 189, 248, 0.14)', color: '#38bdf8' }
        : { label: '🟡 本地湖倉快取', bg: 'rgba(234, 179, 8, 0.14)', color: '#facc15' };

  const breadth = macroSnapshot.twMarketBreadth;
  const spot = macroSnapshot.twInstitutionalSpot;
  const pctAbove20Ma = breadth?.pctAbove20MA ?? breadth?.pctAbove20Ma ?? (breadth as any)?.above20MaPercent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
      {/* 1. 跨時區開休市雙時鐘 + 資料新鮮度基準列 + 三視角切換器 */}
      <div
        className="card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <span
            className="badge"
            style={{
              background: twSession.isOpen ? 'rgba(16, 185, 129, 0.18)' : 'rgba(148, 163, 184, 0.15)',
              color: twSession.isOpen ? '#34d399' : 'var(--text-secondary)',
              fontSize: '0.74rem',
              padding: '4px 10px',
            }}
          >
            🇹🇼 台股 {twSession.statusLabel} ({twSession.marketTimeFormatted})
          </span>
          <span
            className="badge"
            style={{
              background: usSession.isOpen ? 'rgba(16, 185, 129, 0.18)' : 'rgba(148, 163, 184, 0.15)',
              color: usSession.isOpen ? '#34d399' : 'var(--text-secondary)',
              fontSize: '0.74rem',
              padding: '4px 10px',
            }}
          >
            🇺🇸 美股 {usSession.statusLabel} (美東 {usSession.marketTimeFormatted})
          </span>
          <span
            className="badge"
            style={{
              background: sourceBadge.bg,
              color: sourceBadge.color,
              fontSize: '0.73rem',
              padding: '4px 10px',
            }}
          >
            {sourceBadge.label} · 基準 {macroSnapshot.asOfTimestamp ? macroSnapshot.asOfTimestamp.slice(0, 16).replace('T', ' ') : macroSnapshot.date}
          </span>
        </div>

        {/* 三視角決策漏斗切換頁籤 (與頂部 Header 雙向連動) */}
        <div
          role="tablist"
          aria-label="宏觀戰情室市場視角切換"
          style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          }}
        >
          {(
            [
              { id: 'GLOBAL', label: '🌐 全球總經與跨市傳導' },
              { id: 'TW', label: '🇹🇼 台股波段與廣度籌碼' },
              { id: 'US', label: '🇺🇸 美股與費半動能' },
            ] as { id: MarketViewTab; label: string }[]
          ).map((tab) => {
            const isActive = activeMarketTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onMarketTabChange(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'var(--accent-color, #3b82f6)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 長線總經配置 × 短線波段戰術 雙溫度計 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '14px',
        }}
      >
        {/* 左軌：🧭 長線總經配置溫度計 */}
        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderLeft: `4px solid ${getStanceColor(strategicRegime.stance)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              🧭 長線總經配置溫度計 (Strategic Macro Regime)
            </span>
            <span
              className="mono"
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: getStanceColor(strategicRegime.stance),
              }}
            >
              {strategicRegime.score} / 100
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: getStanceColor(strategicRegime.stance),
              }}
            >
              {strategicRegime.label}
            </span>
            <span
              className="badge"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              建議總股票上限 ≤ {strategicRegime.recommendedEquityCapPercent}%
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {strategicRegime.drivers.slice(0, 3).join(' · ')}
          </div>
        </div>

        {/* 右軌：⚡ 短中期波段戰術溫度計 */}
        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderLeft: `4px solid ${getSwingSignalColor(tacticalSwing.signal)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              ⚡ 短中期波段戰術溫度計 (Tactical Swing Pulse)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {tacticalSwing.isNarrowTsmcTrap && (
                <span
                  className="badge"
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  ⚠️ 拉積盤警訊（賺指數賠價差）
                </span>
              )}
              <span
                className="mono"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: getSwingSignalColor(tacticalSwing.signal),
                }}
              >
                {tacticalSwing.score} / 100
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: getSwingSignalColor(tacticalSwing.signal),
              }}
            >
              {tacticalSwing.label}
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            <div>🇺🇸 {tacticalSwing.usSwingSummary}</div>
            <div>🇹🇼 {tacticalSwing.twSwingSummary}</div>
          </div>
        </div>
      </div>

      {/* 3. 台美費半跨市傳導核心四聯卡 (^SOX / TSM ADR 溢折價 / ^TWII 騰落廣度 / USD/TWD & 期現貨) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '12px',
        }}
      >
        {/* 卡 1: 費城半導體 (^SOX) */}
        <div className="card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              🔬 費城半導體指數 (^SOX)
            </span>
            <span
              className="badge"
              style={{
                fontSize: '0.68rem',
                background: macroSnapshot.soxAbove20Ma !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: macroSnapshot.soxAbove20Ma !== false ? 'var(--gain-color)' : 'var(--loss-color)',
              }}
            >
              {macroSnapshot.soxAbove20Ma !== false ? '站上 20MA 月線' : '跌破 20MA 月線'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {macroSnapshot.soxIndex ? macroSnapshot.soxIndex.toLocaleString() : '5,240.5'}
            </span>
            <span
              className="mono"
              style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                color: getDeltaColor(macroSnapshot.soxChangePercent),
              }}
            >
              {formatSignedPct(macroSnapshot.soxChangePercent ?? 0)}
            </span>
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            20MA 乖離率：<strong className="mono">{formatSignedPct(macroSnapshot.soxBias20Ma ?? 0)}</strong> · 60MA 季線：{macroSnapshot.soxAbove60Ma !== false ? '多頭支撐' : '季線下彎'}
          </div>
        </div>

        {/* 卡 2: 台積電 ADR (TSM) vs 2330 溢折價率 */}
        <div className="card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              🌉 台積電 ADR (TSM) 跨市溢折價
            </span>
            <span
              className="badge"
              style={{
                fontSize: '0.68rem',
                background: 'rgba(59, 130, 246, 0.15)',
                color: getDeltaColor(macroSnapshot.tsmAdrPremiumPercent),
              }}
            >
              {(macroSnapshot.tsmAdrPremiumPercent ?? 0) >= 0 ? '溢價領漲' : '折價壓抑'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              className="mono"
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: getDeltaColor(macroSnapshot.tsmAdrPremiumPercent),
              }}
            >
              {formatSignedPct(macroSnapshot.tsmAdrPremiumPercent ?? 0)}
            </span>
            <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              折合 NT${macroSnapshot.tsmAdrConvertedTwd ?? Math.round(((macroSnapshot.tsmAdrPrice ?? 195) * macroSnapshot.usdToTwd) / 5)}
            </span>
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            TSM: <strong className="mono">${macroSnapshot.tsmAdrPrice ?? 195}</strong> vs 2330: <strong className="mono">NT${macroSnapshot.tsmTwPrice ?? 1050}</strong>
          </div>
        </div>

        {/* 卡 3: 台股加權 (^TWII) 與大盤騰落廣度 */}
        <div className="card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              🇹🇼 台股加權 (^TWII) 與騰落廣度
            </span>
            <span
              className="badge"
              style={{
                fontSize: '0.68rem',
                background: 'rgba(148, 163, 184, 0.15)',
                color: 'var(--text-primary)',
              }}
            >
              站上月線 {typeof pctAbove20Ma === 'number' ? `${pctAbove20Ma.toFixed(0)}%` : '55%'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {macroSnapshot.taiexIndex ? macroSnapshot.taiexIndex.toLocaleString() : '23,150'}
            </span>
            <span
              className="mono"
              style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                color: getDeltaColor(macroSnapshot.taiexChangePercent),
              }}
            >
              {formatSignedPct(macroSnapshot.taiexChangePercent ?? 0)}
            </span>
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {breadth
              ? `漲 ${breadth.advancingCount} / 跌 ${breadth.decliningCount} 家`
              : `20MA 乖離 ${formatSignedPct(macroSnapshot.taiexBias20Ma ?? 0)}`}
            {exDividendImpactPoints > 0 && (
              <span style={{ marginLeft: '6px', color: '#38bdf8' }}>
                · 除息蒸發約 {exDividendImpactPoints} 點
              </span>
            )}
          </div>
        </div>

        {/* 卡 4: 三大法人期現貨雙向對照 */}
        <div className="card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              🏦 法人期現貨對照 & 匯率
            </span>
            <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              USD/TWD {(macroSnapshot.usdToTwd ?? 32.15).toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              className="mono"
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: getDeltaColor(spot?.totalNetTwdBillions ?? 0),
              }}
            >
              現貨 {typeof spot?.totalNetTwdBillions === 'number' ? `${spot.totalNetTwdBillions >= 0 ? '+' : ''}${spot.totalNetTwdBillions.toFixed(1)} 億` : '同步中'}
            </span>
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            外資期貨淨部位：<strong className="mono" style={{ color: getDeltaColor(macroSnapshot.twFuturesNetOi) }}>{(macroSnapshot.twFuturesNetOi ?? 0).toLocaleString()} 口</strong>
            {typeof spot?.trustNetTwdBillions === 'number' && ` · 投信 ${spot.trustNetTwdBillions >= 0 ? '+' : ''}${spot.trustNetTwdBillions.toFixed(1)} 億`}
          </div>
        </div>
      </div>
    </div>
  );
};

