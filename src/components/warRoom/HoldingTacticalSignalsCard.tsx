import React, { useState } from 'react';
import type { MacroHoldingSignalInput } from '../../types/macro';

export interface HoldingTacticalSignalsCardProps {
  signals: MacroHoldingSignalInput[];
  fomoChasingWarning?: string | null;
  onInspectTechnical?: (symbol: string) => void;
  onOpenAiForce?: (symbol: string) => void;
  onOpenTradeModal?: (symbol: string, market?: 'TW' | 'US') => void;
  privacyMode?: boolean;
  defaultFilter?: 'ACTIONABLE' | 'ALL';
}

export const HoldingTacticalSignalsCard: React.FC<HoldingTacticalSignalsCardProps> = ({
  signals,
  fomoChasingWarning,
  onInspectTechnical,
  onOpenAiForce,
  onOpenTradeModal,
  privacyMode = false,
  defaultFilter,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ACTIONABLE' | 'ALL'>(defaultFilter || 'ACTIONABLE');

  // 將「需立即關注（突破買進 BUY / 破線賣出 SELL / 避開 AVOID / 觸及自訂停損停利 / 處置注意股）」與「正常箱型續抱 HOLD」分流
  const actionableSignals = signals.filter(
    (s) =>
      s.action !== 'HOLD' ||
      (s.planRiskStatus && s.planRiskStatus !== 'NORMAL') ||
      (s.dispositionStatus && s.dispositionStatus !== 'NORMAL')
  );
  const normalSignals = signals.filter(
    (s) =>
      s.action === 'HOLD' &&
      (!s.planRiskStatus || s.planRiskStatus === 'NORMAL') &&
      (!s.dispositionStatus || s.dispositionStatus === 'NORMAL')
  );

  const displayedSignals = activeFilter === 'ALL'
    ? [...actionableSignals, ...normalSignals]
    : actionableSignals;

  const getActionBadge = (action: MacroHoldingSignalInput['action']) => {
    if (action === 'BUY') {
      return {
        label: '🔥 箱頂突破加碼',
        bg: 'rgba(16, 185, 129, 0.16)',
        color: 'var(--gain-color)',
      };
    }
    if (action === 'SELL') {
      return {
        label: '🚨 跌破防守減碼',
        bg: 'rgba(239, 68, 68, 0.16)',
        color: 'var(--loss-color)',
      };
    }
    if (action === 'AVOID') {
      return {
        label: '⚠️ 弱勢破位觀望',
        bg: 'rgba(245, 158, 11, 0.16)',
        color: '#f59e0b',
      };
    }
    return {
      label: '🟢 箱型穩定續抱',
      bg: 'rgba(148, 163, 184, 0.14)',
      color: 'var(--text-secondary)',
    };
  };

  const getPlanRiskBadge = (status?: MacroHoldingSignalInput['planRiskStatus']) => {
    if (!status || status === 'NORMAL') return null;
    if (status === 'STOP_LOSS_TRIGGERED') {
      return { label: '🚨 觸及自訂停損', bg: 'rgba(239, 68, 68, 0.25)', color: 'var(--loss-color)' };
    }
    if (status === 'NEAR_STOP_LOSS') {
      return { label: '⚠️ 逼近自訂停損(≤3%)', bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' };
    }
    if (status === 'TAKE_PROFIT_TRIGGERED') {
      return { label: '🎯 達標自訂停利', bg: 'rgba(16, 185, 129, 0.22)', color: 'var(--gain-color)' };
    }
    if (status === 'NEAR_TAKE_PROFIT') {
      return { label: '💡 逼近自訂停利', bg: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' };
    }
    return null;
  };

  return (
    <div className="card" style={{ padding: '18px 20px', marginBottom: '18px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            🎯 在倉持股波段戰術雷達與一鍵執行閉環 (Holding Tactical Signals)
          </h3>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            整合 Darvas 箱子突破/破底 × 自訂停損停利觸價 × 處置股警示 · 異常優先展開（需行動 {actionableSignals.length} 檔 / 穩定續抱 {normalSignals.length} 檔）
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'ACTIONABLE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('ACTIONABLE')}
            style={{
              fontSize: '0.76rem',
              padding: '4px 10px',
              fontWeight: activeFilter === 'ACTIONABLE' ? 700 : 500,
            }}
          >
            🚨 需行動 ({actionableSignals.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('ALL')}
            style={{
              fontSize: '0.76rem',
              padding: '4px 10px',
              fontWeight: activeFilter === 'ALL' ? 700 : 500,
            }}
          >
            📑 全部在倉 ({signals.length})
          </button>
        </div>
      </div>

      {/* 波段正乖離過熱時之個人化 FOMO 追高歷史勝率煞車提醒 */}
      {fomoChasingWarning && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '12px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.14)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          {fomoChasingWarning}
        </div>
      )}

      {signals.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
          目前尚無在倉持股訊號。
        </div>
      ) : displayedSignals.length === 0 ? (
        <div
          data-testid="all-clear-shield"
          style={{
            padding: '20px',
            textAlign: 'center',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: 'var(--gain-color)',
            fontSize: '0.86rem',
            fontWeight: 700,
          }}
        >
          🛡️ 當前在倉持股全數處於正常箱型結構或安全防守水位，無須緊急減碼或調倉。
        </div>
      ) : (
        <div className="warroom-table-container">
          <table className="warroom-table" style={{ fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>標的代號 / 名稱</th>
                <th style={{ textAlign: 'right' }}>權重 / 現價</th>
                <th style={{ textAlign: 'right' }}>未實現損益%</th>
                <th style={{ textAlign: 'right' }}>箱底防守 / 停損價</th>
                <th>多空戰術與風控燈號</th>
                <th style={{ textAlign: 'right' }}>一鍵戰術跳轉</th>
              </tr>
            </thead>
            <tbody>
              {displayedSignals.map((s) => {
                const actionBadge = getActionBadge(s.action);
                const planBadge = getPlanRiskBadge(s.planRiskStatus);
                const pnlPct = s.unrealizedPnlPercent ?? 0;

                return (
                  <tr key={s.symbol}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong className="mono" style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {s.symbol}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {s.name || ''}
                        </span>
                        {s.dispositionStatus === 'DISPOSITION' && (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(239, 68, 68, 0.25)',
                              color: 'var(--loss-color)',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}
                          >
                            🔒 處置股
                          </span>
                        )}
                        {s.dispositionStatus === 'ATTENTION' && (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(245, 158, 11, 0.22)',
                              color: '#fbbf24',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}
                          >
                            ⚠️ 注意股
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.weightPercent ?? 0}%
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        {privacyMode
                          ? `$${(s.currentPrice ?? 0).toFixed(2)}`
                          : `$${(s.currentPrice ?? 0).toFixed(2)} (NT$ ${Math.round(s.marketValueTWD ?? 0).toLocaleString()})`}
                      </div>
                    </td>
                    <td
                      className="mono"
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: pnlPct >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                      }}
                    >
                      {pnlPct >= 0 ? '+' : ''}
                      {pnlPct.toFixed(1)}%
                    </td>
                    <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {s.stopLossPrice
                        ? `$${s.stopLossPrice.toFixed(2)}`
                        : s.boxBottom
                          ? `$${s.boxBottom.toFixed(2)} (箱底)`
                          : '動態移動'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <span
                          className="badge"
                          style={{
                            background: actionBadge.bg,
                            color: actionBadge.color,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {actionBadge.label}
                        </span>
                        {planBadge && (
                          <span
                            className="badge"
                            style={{
                              background: planBadge.bg,
                              color: planBadge.color,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            {planBadge.label}
                          </span>
                        )}
                        {s.bias20MA !== undefined && (
                          <span
                            className="badge"
                            style={{
                              background: s.bias20MA > 6 ? 'rgba(245, 158, 11, 0.22)' : 'rgba(51, 65, 85, 0.4)',
                              color: s.bias20MA > 6 ? '#fbbf24' : 'var(--text-secondary)',
                              fontSize: '0.7rem',
                              fontWeight: s.bias20MA > 6 ? 700 : 500,
                              border: s.bias20MA > 6 ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
                            }}
                          >
                            {s.bias20MA > 6
                              ? `🔥 乖離過熱 +${s.bias20MA.toFixed(1)}%`
                              : `月線乖離 ${s.bias20MA >= 0 ? '+' : ''}${s.bias20MA.toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {onInspectTechnical && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onInspectTechnical(s.symbol)}
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            title={`開啟 ${s.symbol} 全息技術面診斷`}
                          >
                            📈 技術面
                          </button>
                        )}
                        {onOpenAiForce && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onOpenAiForce(s.symbol)}
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            title={`跳轉 ${s.symbol} 個股 AI 主力戰情室`}
                          >
                            🤖 AI戰情
                          </button>
                        )}
                        {onOpenTradeModal && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onOpenTradeModal(s.symbol, s.market)}
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            title={`快速新增 ${s.symbol} 買賣交易紀錄`}
                          >
                            ⚡ 下單紀錄
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
      )}
    </div>
  );
};
