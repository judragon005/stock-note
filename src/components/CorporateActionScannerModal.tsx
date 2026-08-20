import React, { useState, useEffect } from 'react';
import { TradeRecord } from '../types/stock';
import { scanCorporateActions, ScannedCorporateAction } from '../engine/corporateActionScanner';
import { X, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';

interface CorporateActionScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: TradeRecord[];
  onApplyActions: (newTrades: TradeRecord[]) => void;
}

export const CorporateActionScannerModal: React.FC<CorporateActionScannerModalProps> = ({
  isOpen,
  onClose,
  trades,
  onApplyActions,
}) => {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<ScannedCorporateAction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleScan = async () => {
    setLoading(true);
    try {
      const scanned = await scanCorporateActions(trades);
      setActions(scanned);

      // 預設全選尚未入帳之項目
      const initialSelected = new Set<string>();
      for (const item of scanned) {
        if (!item.isAlreadyRecorded) {
          initialSelected.add(item.id);
        }
      }
      setSelectedIds(initialSelected);
    } catch (err) {
      console.error('Failed to scan corporate actions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleScan();
    }
  }, [isOpen]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllUnrecorded = () => {
    const next = new Set<string>();
    for (const item of actions) {
      if (!item.isAlreadyRecorded) {
        next.add(item.id);
      }
    }
    setSelectedIds(next);
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    const selectedActions = actions.filter((a) => selectedIds.has(a.id));
    if (selectedActions.length === 0) return;

    const newTrades: TradeRecord[] = selectedActions.map((a) => {
      const isStockDiv = a.type === 'STOCK_DIVIDEND';
      const isSplit = a.type === 'STOCK_SPLIT';
      const isReduction = a.type === 'CAPITAL_REDUCTION';
      const isDiv = a.type === 'DIVIDEND';

      return {
        id: `auto-ca-${a.symbol}-${a.date}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date: a.date,
        symbol: a.symbol,
        name: a.name,
        market: a.market,
        currency: a.currency,
        type: a.type,
        shares: isStockDiv ? a.estimatedSharesChange :
                isReduction ? Math.abs(a.estimatedSharesChange) :
                isSplit ? 0 : a.sharesHeldOnDate,
        price: isDiv || isReduction ? (a.price || 0) : 0,
        fee: 0,
        tax: 0,
        ratio: a.ratio,
        cashAmount: a.estimatedCashAmount > 0 ? a.estimatedCashAmount : undefined,
        exDate: a.date,
        tags: ['智慧自動補登', '公司行動'],
        note: `【智慧補登】基準日持股 ${a.sharesHeldOnDate} 股。${a.description}`,
        createdAt: Date.now(),
      };
    });

    onApplyActions(newTrades);
    onClose();
  };

  if (!isOpen) return null;

  const unrecordedCount = actions.filter((a) => !a.isAlreadyRecorded).length;
  const selectedCount = selectedIds.size;

  // 預估統計加總
  const selectedItems = actions.filter((a) => selectedIds.has(a.id));
  const totalTwdCash = selectedItems.filter((a) => a.currency === 'TWD').reduce((sum, a) => sum + a.estimatedCashAmount, 0);
  const totalUsdCash = selectedItems.filter((a) => a.currency === 'USD').reduce((sum, a) => sum + a.estimatedCashAmount, 0);
  const totalStockDivShares = selectedItems.filter((a) => a.type === 'STOCK_DIVIDEND').reduce((sum, a) => sum + a.estimatedSharesChange, 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '780px',
          padding: '28px',
          position: 'relative',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(139, 92, 246, 0.4)',
            }}
          >
            <Sparkles size={22} color="#a78bfa" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              ✨ 智慧掃描公司行動 (除權息 / 減資 / 分割)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              自動向金融資料源比對歷史持有區間，依基準日當日持股試算配息與配股，一鍵批次補登。
            </p>
          </div>
        </div>

        {/* Status Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(30, 41, 59, 0.5)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            margin: '14px 0',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
            {loading ? (
              <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} className="animate-spin" /> 正向官方與金融資料庫掃描比對中...
              </span>
            ) : (
              <span>
                掃描完成：共發現 <strong style={{ color: '#fff' }}>{actions.length}</strong> 個事件，
                其中 <strong style={{ color: '#f59e0b' }}>{unrecordedCount}</strong> 筆待補登。
              </span>
            )}
          </div>

          {!loading && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleSelectAllUnrecorded}
                style={{ padding: '3px 8px', fontSize: '0.725rem' }}
              >
                全選待補登 ({unrecordedCount})
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleClearAll}
                style={{ padding: '3px 8px', fontSize: '0.725rem' }}
              >
                清空選取
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleScan}
                style={{ padding: '3px 8px', fontSize: '0.725rem' }}
              >
                <RefreshCw size={12} /> 重新掃描
              </button>
            </div>
          )}
        </div>

        {/* Action List */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', minHeight: '260px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#60a5fa' }} />
              <div>正在分析持股時序與查詢除權息歷史...</div>
            </div>
          ) : actions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 12px auto', color: '#10b981' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                太棒了！您的所有持股公司行動皆已完整入帳
              </div>
              <div style={{ fontSize: '0.8rem' }}>目前持股期間內沒有遺漏的除權息或減資事件。</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {actions.map((act) => {
                const isSelected = selectedIds.has(act.id);
                const isDiv = act.type === 'DIVIDEND';
                const isStockDiv = act.type === 'STOCK_DIVIDEND';
                const isSplit = act.type === 'STOCK_SPLIT';
                const isReduction = act.type === 'CAPITAL_REDUCTION';

                return (
                  <div
                    key={act.id}
                    onClick={() => !act.isAlreadyRecorded && toggleSelect(act.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: act.isAlreadyRecorded
                        ? 'rgba(30, 41, 59, 0.25)'
                        : isSelected
                        ? 'rgba(59, 130, 246, 0.12)'
                        : 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${
                        act.isAlreadyRecorded
                          ? 'rgba(51, 65, 85, 0.3)'
                          : isSelected
                          ? '#3b82f6'
                          : 'var(--border-color)'
                      }`,
                      cursor: act.isAlreadyRecorded ? 'default' : 'pointer',
                      opacity: act.isAlreadyRecorded ? 0.6 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Left: Checkbox & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={act.isAlreadyRecorded}
                        onChange={() => toggleSelect(act.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span className="mono" style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                            {act.symbol}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.name}</span>
                          <span
                            className={`badge ${
                              isDiv ? 'badge-dividend' :
                              isStockDiv ? 'badge-stock-div' :
                              isSplit ? 'badge-split' :
                              'badge-reduction'
                            }`}
                            style={{ padding: '1px 6px', fontSize: '0.65rem' }}
                          >
                            {isDiv ? '除息' : isStockDiv ? '除權配股' : isSplit ? '股票分割' : '減資'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {act.date} 基準日持股：<strong>{act.sharesHeldOnDate.toLocaleString()}</strong> 股 · {act.description}
                        </div>
                      </div>
                    </div>

                    {/* Right: Estimated Payout & Status */}
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '0.875rem', color: isDiv ? '#fbbf24' : isStockDiv ? '#c084fc' : '#38bdf8' }}>
                        {isDiv && `+${act.currency} ${Math.round(act.estimatedCashAmount).toLocaleString()}`}
                        {isStockDiv && `+${act.estimatedSharesChange.toLocaleString()} 股`}
                        {isSplit && `${act.ratio}x 分割`}
                        {isReduction && `+${act.currency} ${Math.round(act.estimatedCashAmount).toLocaleString()}`}
                      </div>
                      <div style={{ fontSize: '0.7rem' }}>
                        {act.isAlreadyRecorded ? (
                          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <CheckCircle2 size={11} /> 已入帳
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b' }}>✨ 待補登</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary & Action Buttons */}
        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            已選取 <strong style={{ color: '#fff' }}>{selectedCount}</strong> 項
            {totalTwdCash > 0 && <span> · 預估入帳 <strong>NT$ {totalTwdCash.toLocaleString()}</strong></span>}
            {totalUsdCash > 0 && <span> · 預估入帳 <strong>${totalUsdCash.toFixed(2)}</strong></span>}
            {totalStockDivShares > 0 && <span> · 預估配股 <strong>+{totalStockDivShares.toLocaleString()} 股</strong></span>}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              關閉
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={selectedCount === 0}
              onClick={handleApply}
              style={{
                opacity: selectedCount === 0 ? 0.5 : 1,
                cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Sparkles size={14} /> 一鍵補登選取項目 ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
