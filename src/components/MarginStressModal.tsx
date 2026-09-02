import React, { useState, useMemo } from 'react';
import { X, TrendingDown, RefreshCw, CheckCircle, Info, Calculator, ShieldCheck } from 'lucide-react';
import { HoldingPosition, LoanRecord } from '../types/stock';
import { calculateMarginStress } from '../engine/marginStressEngine';

interface MarginStressModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  usdToTwdRate: number;
}

export const MarginStressModal: React.FC<MarginStressModalProps> = ({
  isOpen,
  onClose,
  holdings,
  loans,
  usdToTwdRate,
}) => {
  const [sliderDropPct, setSliderDropPct] = useState<number>(0); // 0 ~ 50
  const [customDrops, setCustomDrops] = useState<Record<string, number>>({});
  const [targetRecoveryRatio, setTargetRecoveryRatio] = useState<130 | 160>(160);

  const stressResult = useMemo(() => {
    return calculateMarginStress({
      holdings,
      loans,
      usdToTwdRate,
      generalMarketDropPercent: sliderDropPct / 100,
      customDropPercents: customDrops,
    });
  }, [holdings, loans, usdToTwdRate, sliderDropPct, customDrops]);

  if (!isOpen) return null;

  const {
    hasLoans,
    totalLoanDebtTWD,
    currentCollateralValueTWD,
    currentMaintenanceRatio,
    currentStatusInfo,
    stressedCollateralValueTWD,
    stressedMaintenanceRatio,
    stressedStatusInfo,
    maxDropTolerancePercent,
    pointsToMarginCall,
    requiredCashFor130TWD,
    requiredCashFor160TWD,
    pledgedHoldings,
  } = stressResult;

  const requiredCash = targetRecoveryRatio === 130 ? requiredCashFor130TWD : requiredCashFor160TWD;

  const handleCustomDropChange = (symbol: string, valueStr: string) => {
    const val = parseFloat(valueStr);
    setCustomDrops((prev) => {
      const next = { ...prev };
      if (isNaN(val) || val === 0) {
        delete next[symbol];
      } else {
        next[symbol] = Math.max(0, Math.min(100, val)) / 100;
      }
      return next;
    });
  };

  const resetAll = () => {
    setSliderDropPct(0);
    setCustomDrops({});
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Modal 標頭 */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingDown size={22} color="#ef4444" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
                質押維持率極端壓力測試模擬器
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
                模擬大盤黑天鵝暴跌情境 · 逆運算斷頭安全邊際與追繳補足現金款
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal 內容區 */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!hasLoans ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '12px',
                border: '1px dashed var(--border-color, rgba(255,255,255,0.15))',
              }}
            >
              <ShieldCheck size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                當前帳戶無任何股票質押借款
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
                您處於 100% 無負債安全狀態，無須擔憂大盤波動引發追繳或強制斷頭平倉。
              </p>
            </div>
          ) : (
            <>
              {/* 頂部雙指標對比儀表：當前 vs 壓力情境 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* 1. 當前靜態維持率 */}
                <div
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                      當前靜態維持率
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid',
                      }}
                      className={currentStatusInfo.badgeColor}
                    >
                      {currentStatusInfo.label}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                    {currentMaintenanceRatio.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                    擔保品: NT${Math.round(currentCollateralValueTWD).toLocaleString()} · 借款: NT${Math.round(totalLoanDebtTWD).toLocaleString()}
                  </div>
                </div>

                {/* 2. 模擬壓力後維持率 */}
                <div
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `1px solid ${stressedMaintenanceRatio < 130 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                      情境模擬維持率 {sliderDropPct > 0 && `(跌 ${sliderDropPct}%)`}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid',
                      }}
                      className={stressedStatusInfo.badgeColor}
                    >
                      {stressedStatusInfo.label}
                    </span>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 800,
                      color: stressedMaintenanceRatio < 130 ? '#f43f5e' : stressedMaintenanceRatio < 160 ? '#fbbf24' : '#38bdf8',
                    }}
                  >
                    {stressedMaintenanceRatio.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                    模擬市值: NT${Math.round(stressedCollateralValueTWD).toLocaleString()}
                  </div>
                </div>

                {/* 3. 最大耐受跌幅 */}
                <div
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                      最大耐受跌幅 (至 130%)
                    </span>
                    <Info size={14} color="#94a3b8" />
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 800,
                      color: maxDropTolerancePercent > 0.25 ? '#10b981' : maxDropTolerancePercent > 0.15 ? '#fbbf24' : '#ef4444',
                    }}
                  >
                    -{(maxDropTolerancePercent * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                    距離追繳警戒線尚有 <strong className="mono">{pointsToMarginCall.toFixed(1)}%</strong> 緩衝
                  </div>
                </div>
              </div>

              {/* 動態壓力模擬滑桿控制區 */}
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingDown size={18} color="#f43f5e" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                      全市場極端下跌壓力滑桿
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f43f5e' }}>
                      -{sliderDropPct}%
                    </span>
                    <button
                      onClick={resetAll}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: '#94a3b8',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <RefreshCw size={12} /> 重置
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={sliderDropPct}
                  onChange={(e) => setSliderDropPct(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    accentColor: '#f43f5e',
                    cursor: 'pointer',
                    marginBottom: '12px',
                  }}
                />

                {/* 快捷情境按鈕 */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: '平盤 (0%)', pct: 0 },
                    { label: '回檔 (-10%)', pct: 10 },
                    { label: '修正 (-20%)', pct: 20 },
                    { label: '黑天鵝 (-30%)', pct: 30 },
                    { label: '金融海嘯 (-40%)', pct: 40 },
                    { label: '極限測試 (-50%)', pct: 50 },
                  ].map((item) => (
                    <button
                      key={item.pct}
                      onClick={() => setSliderDropPct(item.pct)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: sliderDropPct === item.pct ? 700 : 500,
                        backgroundColor: sliderDropPct === item.pct ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${sliderDropPct === item.pct ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`,
                        color: sliderDropPct === item.pct ? '#f43f5e' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 追繳補足金額逆運算試算看板 */}
              <div
                style={{
                  backgroundColor: requiredCash > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: `1px solid ${requiredCash > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calculator size={18} color={requiredCash > 0 ? '#ef4444' : '#10b981'} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                      追繳與安全水位保證金逆運算 (Margin Call Calculator)
                    </span>
                  </div>

                  {/* 目標水位切換 */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setTargetRecoveryRatio(160)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: targetRecoveryRatio === 160 ? '#0284c7' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: '#f8fafc',
                        cursor: 'pointer',
                      }}
                    >
                      恢復安全水位 (160%)
                    </button>
                    <button
                      onClick={() => setTargetRecoveryRatio(130)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: targetRecoveryRatio === 130 ? '#dc2626' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: '#f8fafc',
                        cursor: 'pointer',
                      }}
                    >
                      解除追繳門檻 (130%)
                    </button>
                  </div>
                </div>

                {requiredCash > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
                        在此情境下，若欲使維持率恢復至 <strong>{targetRecoveryRatio}%</strong>：
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <div
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          flex: 1,
                          minWidth: '200px',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>方案 A: 匯入現金補足差額</div>
                        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                          NT$ {requiredCash.toLocaleString()}
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          flex: 1,
                          minWidth: '200px',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>方案 B: 加補等值擔保品股票</div>
                        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                          NT$ {requiredCash.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>市值</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.875rem' }}>
                    <CheckCircle size={18} />
                    <span>在此情境下維持率仍高於 {targetRecoveryRatio}%，無需補繳任何保證金。</span>
                  </div>
                )}
              </div>

              {/* 質押標的明細與個股自訂跌幅 */}
              {pledgedHoldings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                    質押擔保品標的清單與個別跌幅自訂
                  </div>
                  <div
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>標的代碼/名稱</th>
                          <th style={{ padding: '8px 12px' }}>質押股數</th>
                          <th style={{ padding: '8px 12px' }}>當前現價</th>
                          <th style={{ padding: '8px 12px' }}>基準市值</th>
                          <th style={{ padding: '8px 12px' }}>個別跌幅 (%)</th>
                          <th style={{ padding: '8px 12px' }}>壓力情境市值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pledgedHoldings.map((item) => (
                          <tr
                            key={item.symbol}
                            style={{
                              borderTop: '1px solid rgba(255,255,255,0.05)',
                              backgroundColor: 'rgba(30, 41, 59, 0.4)',
                            }}
                          >
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f8fafc' }}>
                              {item.symbol} <span style={{ color: '#94a3b8', fontWeight: 400 }}>{item.name}</span>
                            </td>
                            <td className="mono" style={{ padding: '8px 12px' }}>
                              {item.shares.toLocaleString()}
                            </td>
                            <td className="mono" style={{ padding: '8px 12px' }}>
                              ${item.currentPrice.toFixed(2)}
                            </td>
                            <td className="mono" style={{ padding: '8px 12px' }}>
                              NT${Math.round(item.baselineValueTWD).toLocaleString()}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder={`${sliderDropPct}%`}
                                value={customDrops[item.symbol] !== undefined ? customDrops[item.symbol] * 100 : ''}
                                onChange={(e) => handleCustomDropChange(item.symbol, e.target.value)}
                                style={{
                                  width: '60px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(0,0,0,0.3)',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  color: '#f8fafc',
                                  fontSize: '0.75rem',
                                  textAlign: 'right',
                                }}
                              />
                            </td>
                            <td className="mono" style={{ padding: '8px 12px', color: '#38bdf8' }}>
                              NT${Math.round(item.stressedValueTWD).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal 底部關閉按鈕 */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#f8fafc',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
