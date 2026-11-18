import React, { useState } from 'react';
import type { MacroPortfolioShield } from '../../types/macro';
import type { LookThroughReport } from '../../hooks/useWarRoomPortfolioMetrics';

export interface PortfolioShieldAndAmmoCardProps {
  shield: MacroPortfolioShield;
  privacyMode?: boolean;
  currentUsdToTwdRate?: number;
  isDoubleCold?: boolean;
  lookThroughReport?: LookThroughReport;
  onOpenMarginStressModal?: () => void;
  recommendedEquityCapPercent?: number;
  pinnedEquityCapPercent?: number;
  currentEquityPercent?: number;
}

export const PortfolioShieldAndAmmoCard: React.FC<PortfolioShieldAndAmmoCardProps> = ({
  shield,
  privacyMode = false,
  currentUsdToTwdRate = 32.15,
  isDoubleCold = false,
  lookThroughReport,
  onOpenMarginStressModal,
  recommendedEquityCapPercent,
  pinnedEquityCapPercent,
  currentEquityPercent,
}) => {
  const [showLookThroughDrawer, setShowLookThroughDrawer] = useState(false);
  const [activeStressDrop, setActiveStressDrop] = useState<-10 | -20 | -30>(-10);

  const maskMoney = (amount: number) =>
    privacyMode ? 'NT$******' : `NT$ ${Math.round(amount).toLocaleString()}`;

  const rawFreeAmmo =
    shield.freeDeployableCashTWD !== undefined
      ? shield.freeDeployableCashTWD
      : shield.cashBalanceTWD;
  const freeAmmo = Math.max(0, rawFreeAmmo);

  const pendingOutflow = shield.pendingSettlementOutflowTWD ?? 0;
  const dcaCommitment = shield.upcoming7dDcaCommitmentTWD ?? 0;

  return (
    <div
      className="card"
      style={{
        padding: '16px 18px',
        marginBottom: '18px',
        border: '1px solid rgba(56, 189, 248, 0.22)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75))',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>🛡️</span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            個人部位防禦護欄、真·自由子彈與穿透曝險 (Portfolio Macro Shield 3.0)
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            實質總淨值 (Effective NAV)：
            <strong className="mono" style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>
              {maskMoney(shield.totalNavTWD)}
            </strong>
          </span>
          {onOpenMarginStressModal && (
            <button
              type="button"
              onClick={onOpenMarginStressModal}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.74rem', padding: '4px 10px', cursor: 'pointer' }}
            >
              質押黑天鵝壓力測試 ➔
            </button>
          )}
        </div>
      </div>

      {isDoubleCold && (
        <div
          data-testid="double-cold-alert"
          style={{
            padding: '10px 14px',
            marginBottom: '14px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.16)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          🚨 總經與波段雙指標共振偏弱（雙冷體制）：建議優先確保質押維持率 ≥ 166% 並回收波段部位，嚴禁左側抄底。
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {/* 1. 真·自由可動用子彈 (扣除 T+2 在途交割與近 7 日 DCA) */}
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            🎯 真·自由可動用子彈 (Free Deployable Ammo)
          </div>
          <div
            className="mono"
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--gain-color)',
              marginTop: '4px',
            }}
          >
            {maskMoney(freeAmmo)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
            帳面已交割：{maskMoney(shield.cashBalanceTWD)} ({shield.cashRatioPercent}%)
            {(pendingOutflow > 0 || dcaCommitment > 0) && (
              <div>
                已扣除 T+2 待交割 {maskMoney(pendingOutflow)} · 7日 DCA 預留 {maskMoney(dcaCommitment)}
              </div>
            )}
          </div>
        </div>

        {/* 2. ETF 穿透真實台積電與半導體權重 × 費半壓力測試 */}
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            🔬 ETF 穿透真實半導體與台積電曝險
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              半導體 {(shield.semiLookThroughWeightPercent ?? 0).toFixed(1)}%
            </span>
            <span className="mono" style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>
              (台積電 {(shield.tsmcLookThroughWeightPercent ?? 0).toFixed(1)}%)
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            費半 (^SOX) 波動 ±3% 敏感度：
            <strong className="mono" style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>
              ±{maskMoney(shield.soxStressImpact3PctTWD ?? 0)}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setShowLookThroughDrawer((v) => !v)}
            style={{
              marginTop: '6px',
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showLookThroughDrawer ? '▲ 收合穿透前五大明細' : '▼ 展開穿透前五大明細'}
          </button>
        </div>

        {/* 3. 質押維持率與安全緩衝 (無借款時誠實顯示零槓桿) */}
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            🏦 質押槓桿與追繳安全緩衝
          </div>
          {!shield.hasLoans || shield.marginMaintenanceRatio === null ? (
            <>
              <div
                style={{
                  fontSize: '1.02rem',
                  fontWeight: 800,
                  color: '#34d399',
                  marginTop: '6px',
                }}
              >
                無質押負債 (零槓桿)
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                100% 自有資金持倉，免疫斷頭追繳風險
              </div>
            </>
          ) : (
            <>
              <div
                className="mono"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color:
                    shield.marginStatus === 'SAFE'
                      ? 'var(--gain-color)'
                      : shield.marginStatus === 'WARNING'
                        ? '#f59e0b'
                        : 'var(--loss-color)',
                  marginTop: '4px',
                }}
              >
                維持率 {shield.marginMaintenanceRatio}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                距 130% 追繳安全耐受跌幅：
                <strong className="mono" style={{ marginLeft: '4px' }}>
                  {shield.maxDropToleranceTo130Percent !== undefined
                    ? `-${(shield.maxDropToleranceTo130Percent * 100).toFixed(1)}%`
                    : '充裕'}
                </strong>
              </div>
            </>
          )}
        </div>

        {/* 4. 再平衡偏離度、動態 VaR 與美股匯差緩衝墊 */}
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ⚖️ 再平衡偏離度、VaR 與匯差緩衝
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              偏離 {(shield.maxAllocationDriftPercent ?? 0).toFixed(1)}%
            </span>
            <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              95% VaR: {maskMoney(shield.valueAtRisk95TWD ?? 0)}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {shield.usWeightedCostFxRate && shield.usWeightedCostFxRate > 0 ? (
              <>
                美股成本匯率 <strong className="mono">{(shield.usWeightedCostFxRate ?? 32).toFixed(2)}</strong> vs 現價{' '}
                <strong className="mono">{(currentUsdToTwdRate ?? 32.15).toFixed(2)}</strong> (匯差{' '}
                <strong
                  className="mono"
                  style={{
                    color: (shield.usFxCushionTWD ?? 0) >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                  }}
                >
                  {(shield.usFxCushionTWD ?? 0) >= 0 ? '+' : ''}
                  {maskMoney(shield.usFxCushionTWD ?? 0)}
                </strong>
                )
              </>
            ) : (
              <>匯率敏感度 (FX Delta ±1 TWD)：±{maskMoney(shield.fxDeltaTWD ?? 0)}</>
            )}
          </div>
        </div>
      </div>

      {/* 實際股票水位 vs 建議 / AI 釘選上限對照警示 */}
      {currentEquityPercent !== undefined && (recommendedEquityCapPercent !== undefined || pinnedEquityCapPercent !== undefined) && (() => {
        const cap = pinnedEquityCapPercent ?? recommendedEquityCapPercent ?? 70;
        const overweightPct = Math.max(0, Number((currentEquityPercent - cap).toFixed(1)));
        const overweightTwd = Math.round((shield.totalNavTWD * overweightPct) / 100);
        return (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: overweightPct > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${overweightPct > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.25)'}`,
              fontSize: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span>
              實際股票倉位 <strong className="mono">{currentEquityPercent.toFixed(1)}%</strong> vs{' '}
              {pinnedEquityCapPercent !== undefined ? 'AI 釘選上限' : '建議上限'}{' '}
              <strong className="mono">{cap}%</strong>
            </span>
            {overweightPct > 0 ? (
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                ⚠️ 超配 +{overweightPct}%（建議減碼 {maskMoney(overweightTwd)}）
              </span>
            ) : (
              <span style={{ color: 'var(--gain-color)', fontWeight: 700 }}>✔ 水位合規於建議上限內</span>
            )}
          </div>
        );
      })()}

      {/* ETF 穿透前五大成分股展開抽屜 */}
      {showLookThroughDrawer && lookThroughReport && lookThroughReport.exposures.length > 0 && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.72)',
            border: '1px solid rgba(56, 189, 248, 0.22)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            穿透前五大個股曝險明細（直接 + ETF 間接加總）
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {lookThroughReport.exposures.slice(0, 5).map((exp) => (
              <div
                key={exp.symbol}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  fontSize: '0.72rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>{exp.symbol} {exp.name || ''}</span>
                  <span className="mono" style={{ color: '#38bdf8' }}>{exp.portfolioWeightPercent.toFixed(1)}%</span>
                </div>
                <div className="mono" style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  總曝險 {maskMoney(exp.totalEffectiveValue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 內嵌 -10% / -20% / -30% 急速黑天鵝壓力測試切換條 */}
      {shield.quickStressTest && shield.quickStressTest.length > 0 && (() => {
        const activeScenario =
          shield.quickStressTest.find((s) => s.dropPercent === activeStressDrop) || shield.quickStressTest[0];
        return (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.55)',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'inline-flex', gap: '4px' }}>
              {([-10, -20, -30] as const).map((drop) => (
                <button
                  key={drop}
                  type="button"
                  onClick={() => setActiveStressDrop(drop)}
                  className={`btn btn-sm ${activeStressDrop === drop ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                >
                  {drop === -10 ? '-10% 震盪' : drop === -20 ? '-20% 回檔' : '-30% 崩盤'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <span>
                壓力後擔保品：<strong className="mono">{maskMoney(activeScenario.stressedCollateralTWD)}</strong>
              </span>
              {shield.hasLoans && (
                <span>
                  試算維持率：<strong className="mono">{activeScenario.stressedMarginRatioPercent}%</strong>
                </span>
              )}
              {activeScenario.marginCallShortfallTWD > 0 ? (
                <span style={{ color: 'var(--loss-color)', fontWeight: 700 }}>
                  ⚠️ 需補繳缺口：{maskMoney(activeScenario.marginCallShortfallTWD)}
                </span>
              ) : (
                <span style={{ color: 'var(--gain-color)', fontWeight: 700 }}>
                  ✔ {shield.hasLoans ? '高於 130% 斷頭線' : '零負債免疫追繳'}
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

