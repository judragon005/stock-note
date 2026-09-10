import React, { useState, useMemo } from 'react';
import { HoldingPosition, TradeRecord } from '../types/stock';
import {
  parseBrokerSnapshotText,
  reconcileWithBrokerSnapshot,
  generateAuditAdjustmentTrade,
} from '../engine/reconciliationEngine';
import { ReconciliationReport, ReconciliationDiscrepancy } from '../types/reconciliation';
import { inferMarketFromSymbol, inferCurrencyFromMarket } from '../utils/formatters';

export interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: HoldingPosition[];
  onAddTrade: (trade: TradeRecord) => void;
  colorTheme?: 'taiwan' | 'international';
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  holdings,
  onAddTrade,
}) => {
  const [brokerName, setBrokerName] = useState('國泰證券');
  const [rawText, setRawText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const parsedSnapshot = useMemo(() => {
    return parseBrokerSnapshotText(rawText);
  }, [rawText]);

  const report: ReconciliationReport | null = useMemo(() => {
    if (parsedSnapshot.length === 0) return null;
    return reconcileWithBrokerSnapshot(holdings, parsedSnapshot, brokerName);
  }, [holdings, parsedSnapshot, brokerName]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApplyAdjustment = (item: ReconciliationDiscrepancy) => {
    if (item.diffShares === 0) return;
    const market = inferMarketFromSymbol(item.symbol);
    const currency = inferCurrencyFromMarket(market);
    const adjTrade = generateAuditAdjustmentTrade(
      item.symbol,
      item.diffShares,
      market,
      currency,
      `${item.broker} 對賬校準`
    );
    onAddTrade(adjTrade);
    showToast(`✅ 已自動生成 ${item.symbol} 調整單 (${item.diffShares > 0 ? '+' : ''}${item.diffShares} 股)`);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="modal-content glass-card"
        style={{
          width: '90%',
          maxWidth: '860px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card, #1e293b)',
          color: 'var(--text-main, #f8fafc)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題與關閉按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📑</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>跨券商持倉對賬審計與衝突消解</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                比對真實券商庫存快照，自動識別股數落差並產生無損 ADJUSTMENT 調整單
              </p>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Toast 提示 */}
        {toastMessage && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* 券商選擇與輸入區 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>對賬券商帳戶：</label>
            <input
              type="text"
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              placeholder="例如：國泰證券、富邦證券、Firstrade"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff',
                fontSize: '14px',
                flex: 1,
              }}
            />
          </div>

          <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            貼上券商 App / 網頁持倉表格文字（支援 Excel / Tab / CSV 複製貼上）：
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
            placeholder={`代碼\t股票名稱\t庫存股數\t現價\n2330\t台積電\t1000\t950\n0050\t元大台灣50\t2005\t170`}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: '13px',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
            <span>已成功解析 {parsedSnapshot.length} 檔券商持倉數據</span>
            {rawText && (
              <button
                type="button"
                onClick={() => setRawText('')}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                清空文字
              </button>
            )}
          </div>
        </div>

        {/* 對賬統計看板 */}
        {report && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>比對標的總數</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{report.totalComparedSymbols} 檔</div>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: '#34d399' }}>完全吻合</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{report.matchedCount} 檔</div>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: report.discrepancyCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                  border: report.discrepancyCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: report.discrepancyCount > 0 ? '#f87171' : '#94a3b8' }}>存在差異</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: report.discrepancyCount > 0 ? '#ef4444' : '#94a3b8' }}>
                  {report.discrepancyCount} 檔
                </div>
              </div>
            </div>

            {/* 比對明細清單 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {report.items.map((item) => {
                const isMatch = item.discrepancyType === 'MATCH';
                const isDiff = item.discrepancyType === 'DIFF_SHARES';
                const isMissing = item.discrepancyType === 'MISSING_IN_SYSTEM';
                const isOrphan = item.discrepancyType === 'ORPHAN_IN_SYSTEM';

                let badgeColor = '#10b981';
                let badgeText = '吻合';
                if (isDiff) {
                  badgeColor = '#f59e0b';
                  badgeText = '股數差異';
                } else if (isMissing) {
                  badgeColor = '#3b82f6';
                  badgeText = '系統遺漏';
                } else if (isOrphan) {
                  badgeColor = '#64748b';
                  badgeText = '系統多出';
                }

                return (
                  <div
                    key={item.symbol}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: `1px solid ${isMatch ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.3)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: `${badgeColor}22`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}66`,
                        }}
                      >
                        {badgeText}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{item.symbol}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          系統計算: {item.expectedShares.toLocaleString()} 股 ➔ 券商實際:{' '}
                          <span style={{ color: '#fff', fontWeight: 600 }}>{item.actualShares.toLocaleString()} 股</span>
                          {item.diffShares !== 0 && (
                            <span style={{ marginLeft: '8px', color: item.diffShares > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                              ({item.diffShares > 0 ? '+' : ''}
                              {item.diffShares.toLocaleString()} 股)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isMatch && (
                      <button
                        type="button"
                        onClick={() => handleApplyAdjustment(item)}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                        }}
                      >
                        自動校準差異
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 底部關閉按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
