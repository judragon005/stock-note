import React from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import type { DualMomentumSignal, MomentumAssetMetric, MomentumUniverseConfig } from '../../types/momentum';
import type { MarketType } from '../../types/stock';

export interface DualMomentumRotationCardProps {
  universes: MomentumUniverseConfig[];
  selectedUniverseId: string;
  onSelectUniverse: (id: string) => void;
  momentumSignal: DualMomentumSignal;
  asOfDate: string;
  daysUntilMonthEnd: number;
  effectiveRiskFreeRate: number;
  holdingMatchingSymbol?: string;
  holdingWeightMap?: Record<string, number>;
  onInspectTechnical?: (symbol: string, market: MarketType) => void;
  onOpenTradeModal?: (symbol: string, market: MarketType) => void;
}

const isMomentumHydrating = (item: MomentumAssetMetric) =>
  item.returns12M <= -900 || item.momentumScore <= -900;

const inferMarket = (item: MomentumAssetMetric): MarketType =>
  item.market === 'TW' || item.symbol.endsWith('.TW') ? 'TW' : 'US';

export const DualMomentumRotationCard: React.FC<DualMomentumRotationCardProps> = ({
  universes,
  selectedUniverseId,
  onSelectUniverse,
  momentumSignal,
  asOfDate,
  daysUntilMonthEnd,
  effectiveRiskFreeRate,
  holdingMatchingSymbol,
  holdingWeightMap = {},
  onInspectTechnical,
  onOpenTradeModal,
}) => {
  const isTopHydrating =
    momentumSignal.leaderboard.length > 0 && isMomentumHydrating(momentumSignal.leaderboard[0]);

  return (
    <div className="card">
      <div className="warroom-section-header">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
            雙重動能跨資產輪動排行榜 (Dual Momentum Rotation)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Gary Antonacci 經典模型 · 12-1M 滾動加權動能 · 絕對動能避風港安全閥
            </span>
            <span
              className="badge"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--gain-color)',
                fontSize: '0.72rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              🟢 SQLite 湖倉真實日 K 驅動 · 基準日: {asOfDate}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {universes.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelectUniverse(u.id)}
              className="btn btn-sm"
              style={{
                background: selectedUniverseId === u.id ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: selectedUniverseId === u.id ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedUniverseId === u.id ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {u.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      <div
        className="warroom-banner-tip"
        style={{
          background: isTopHydrating
            ? 'rgba(100, 116, 139, 0.12)'
            : momentumSignal.safeHavenTriggered
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(59, 130, 246, 0.12)',
          border:
            '1px solid ' +
            (isTopHydrating
              ? 'rgba(100, 116, 139, 0.3)'
              : momentumSignal.safeHavenTriggered
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(59, 130, 246, 0.3)'),
          color: isTopHydrating
            ? 'var(--text-secondary)'
            : momentumSignal.safeHavenTriggered
              ? 'var(--loss-color)'
              : 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={16} />
            <span>
              <strong>當前建議行動：</strong>
              {isTopHydrating ? (
                <span style={{ color: 'var(--text-muted)' }}>⏳【湖倉日 K 水合中】</span>
              ) : (
                <>
                  {momentumSignal.actionHeadline}：
                  {momentumSignal.topAsset ? `【${momentumSignal.topAsset.symbol} ${momentumSignal.topAsset.name || ''}】` : '退守避風港'}
                </>
              )}
            </span>
          </div>
          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            📆 距月結調倉尚有 {daysUntilMonthEnd} 天
          </span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          💡 {isTopHydrating ? '正在載入全歷史量價數據，暫緩執行月結輪動。' : momentumSignal.actionAdvice}
          {!isTopHydrating &&
            holdingMatchingSymbol &&
            momentumSignal.topAsset &&
            !holdingMatchingSymbol.includes(momentumSignal.topAsset.symbol.replace('.TW', '')) && (
              <span style={{ marginLeft: '8px', color: 'var(--accent-amber)', fontWeight: 600 }}>
                (⚠️ 您在庫持有 {holdingMatchingSymbol}，非動能榜首，建議於月結日評估是否換倉)
              </span>
            )}
        </div>
      </div>

      <div className="warroom-table-container">
        <table className="warroom-table">
          <thead>
            <tr>
              <th style={{ width: '56px' }}>排名</th>
              <th>代號 / 標的名稱</th>
              <th style={{ textAlign: 'right' }}>12-1M 加權分數</th>
              <th style={{ textAlign: 'right' }}>12M 報酬</th>
              <th style={{ textAlign: 'right' }}>6M 報酬</th>
              <th style={{ textAlign: 'right' }}>3M 報酬</th>
              <th style={{ textAlign: 'center' }}>絕對動能 (vs {(effectiveRiskFreeRate * 100).toFixed(1)}%)</th>
              <th style={{ textAlign: 'right' }}>一鍵執行</th>
            </tr>
          </thead>
          <tbody>
            {momentumSignal.leaderboard.map((item, idx) => {
              const isHydrating = isMomentumHydrating(item);
              const cleanSym = item.symbol.replace('.TW', '');
              const weightPct = holdingWeightMap[item.symbol] ?? holdingWeightMap[cleanSym];
              const mkt = inferMarket(item);

              return (
                <tr key={item.symbol} style={{ background: idx === 0 ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                  <td>
                    <span
                      className="mono"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: idx === 0 ? 'var(--accent-amber)' : 'rgba(51, 65, 85, 0.5)',
                        color: idx === 0 ? '#0f172a' : 'var(--text-primary)',
                      }}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {item.symbol}
                      </span>
                      {weightPct !== undefined && weightPct > 0 && (
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            background: 'rgba(56, 189, 248, 0.16)',
                            color: '#38bdf8',
                            fontWeight: 700,
                          }}
                        >
                          在庫 {weightPct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {isHydrating ? (
                      <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        ⏳ 水合中
                      </span>
                    ) : (
                      `${item.momentumScore.toFixed(1)}%`
                    )}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {isHydrating ? '--' : `${item.returns12M.toFixed(1)}%`}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {isHydrating ? '--' : `${item.returns6M.toFixed(1)}%`}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {isHydrating ? '--' : `${item.returns3M.toFixed(1)}%`}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isHydrating ? (
                      <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.4)', color: 'var(--text-muted)' }}>
                        待同步
                      </span>
                    ) : item.isAboveRiskFree ? (
                      <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)', border: '1px solid var(--gain-border)' }}>
                        勝出基準
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.4)', color: 'var(--text-muted)' }}>
                        弱於現金
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      {onInspectTechnical && (
                        <button
                          type="button"
                          onClick={() => onInspectTechnical(cleanSym, mkt)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.7rem', padding: '2px 7px', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
                        >
                          📈 技術面
                        </button>
                      )}
                      {onOpenTradeModal && (
                        <button
                          type="button"
                          onClick={() => onOpenTradeModal(cleanSym, mkt)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.7rem', padding: '2px 7px', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
                        >
                          ⚡ 下單換倉
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
