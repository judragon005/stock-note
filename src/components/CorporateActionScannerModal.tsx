import React, { useState, useEffect, useRef } from 'react';
import { TradeRecord } from '../types/stock';
import { scanCorporateActions, ScannedCorporateAction, ScanProgress } from '../engine/corporateActionScanner';
import { estimatePaymentDate } from '../engine/receivableDividendEngine';
import { X, Sparkles, CheckCircle2, RefreshCw, Square, Play, AlertCircle } from 'lucide-react';
import { logger } from '../utils/logger';
import { formatCurrencyAmount, formatSharesCount, normalizeCurrencyPrecision } from '../utils/formatters';

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
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<ScannedCorporateAction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<ScanProgress>({
    current: 0,
    total: 0,
    foundEventsCount: 0,
    status: 'completed',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isScanningRef = useRef(false);
  const completedSymbolsRef = useRef<Set<string>>(new Set());

  // 取得目前帳本內所有歷史持股代碼
  const allSymbols = Array.from(new Set(trades.map((t) => t.symbol.toUpperCase()))).sort();

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isScanningRef.current = false;
    setLoading(false);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isScanningRef.current = false;
    setLoading(false);
    setProgress((prev) => ({ ...prev, status: 'paused' }));
  };

  const handleScan = async (symbolsToRun?: string[], forceRefresh: boolean = false) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!symbolsToRun || forceRefresh) {
      completedSymbolsRef.current.clear();
      setActions([]);
      setSelectedIds(new Set());
    }

    try {
      const scanned = await scanCorporateActions(trades, undefined, {
        concurrency: 2,
        signal: controller.signal,
        symbolsToScan: symbolsToRun,
        forceRefresh,
        onProgress: (p) => {
          setProgress(p);
          if (p.currentSymbol) {
            completedSymbolsRef.current.add(p.currentSymbol.toUpperCase());
          }
        },
      });

      // 合併既有與新掃描的事件
      setActions((prev) => {
        const map = new Map<string, ScannedCorporateAction>();
        prev.forEach((a) => map.set(a.id, a));
        scanned.forEach((a) => map.set(a.id, a));
        return Array.from(map.values()).sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.symbol.localeCompare(b.symbol);
        });
      });

      // 預設全選尚未入帳的行動
      const unrecordedIds = new Set<string>();
      scanned.forEach((a) => {
        if (!a.isAlreadyRecorded) {
          unrecordedIds.add(a.id);
        }
      });
      setSelectedIds((prev) => new Set([...prev, ...unrecordedIds]));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        logger.error('Corporate Action scan failed:', err);
      }
    } finally {
      isScanningRef.current = false;
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleScan(undefined, false);
    } else {
      handleAbort();
    }
    return () => {
      handleAbort();
    };
  }, [isOpen]);

  const handleResume = () => {
    const remaining = allSymbols.filter((s) => !completedSymbolsRef.current.has(s));
    if (remaining.length > 0) {
      handleScan(remaining, false);
    }
  };

  const handleFullRescan = () => {
    handleAbort();
    completedSymbolsRef.current.clear();
    setActions([]);
    setSelectedIds(new Set());
    setProgress({
      current: 0,
      total: allSymbols.length,
      foundEventsCount: 0,
      status: 'scanning',
    });
    // 透過微小延遲讓 React 渲染刷新載入動畫，隨後發起全新全量重掃
    setTimeout(() => {
      handleScan(undefined, true);
    }, 50);
  };

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
      const effectivePayDate = isDiv ? (a.payDate || estimatePaymentDate(a.date, a.market)) : undefined;

      return {
        id: `auto-ca-${a.symbol}-${a.date}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date: a.date,
        symbol: a.symbol,
        name: a.name,
        market: a.market,
        currency: a.currency,
        type: a.type,
        accountId: a.market === 'US' ? 'broker-us-default' : 'broker-tw-default',
        shares: isStockDiv ? a.estimatedSharesChange :
                isReduction ? Math.abs(a.estimatedSharesChange) :
                isSplit ? 0 : a.sharesHeldOnDate,
        price: isDiv || isReduction ? (a.price || 0) : 0,
        fee: 0,
        tax: a.taxDeduction || 0,
        ratio: a.ratio,
        cashAmount: a.estimatedCashAmount > 0 ? normalizeCurrencyPrecision(a.estimatedCashAmount, a.currency) : undefined,
        exDate: a.date,
        payDate: effectivePayDate,
        tags: ['智慧自動補登', '公司行動'],
        note: `【智慧補登】基準日持股 ${formatSharesCount(a.sharesHeldOnDate, a.market)} 股${effectivePayDate ? ` (預計 ${effectivePayDate} 發放入帳)` : ''}。${a.description}`,
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

  const remainingCount = allSymbols.filter((s) => !completedSymbolsRef.current.has(s)).length;
  const progressPercent = progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 100;
  const isPaused = !loading && progress.status === 'paused' && remainingCount > 0;

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
          maxWidth: '820px',
          padding: '26px',
          position: 'relative',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.15)',
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

        {/* Progress Bar & Live Status Indicator */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            margin: '12px 0 8px 0',
          }}
        >
          {/* Progress Bar Track */}
          <div
            style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: loading
                  ? 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)'
                  : isPaused
                  ? '#f59e0b'
                  : 'linear-gradient(90deg, #10b981, #06b6d4)',
                borderRadius: '3px',
                transition: 'width 0.3s ease-out',
                boxShadow: loading ? '0 0 10px rgba(139, 92, 246, 0.5)' : 'none',
              }}
            />
          </div>

          {/* Status Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loading ? (
                <span style={{ color: '#93c5fd', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={13} className="animate-spin" />
                  正在比對：<strong style={{ color: '#fff' }}>{progress.currentSymbol || '初始化中'}</strong> {progress.currentName && `(${progress.currentName})`} ({progress.current}/{progress.total} 檔 · {progressPercent}%)
                </span>
              ) : isPaused ? (
                <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> 掃描已中止（已完成 {completedSymbolsRef.current.size}/{allSymbols.length} 檔）
                </span>
              ) : (
                <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} /> 全市場掃描完成（共 {allSymbols.length} 檔比對完畢，發現 {actions.length} 筆公司行動）
                </span>
              )}
            </div>

            {/* Live Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {loading && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-sm btn-secondary"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.725rem',
                    color: '#f87171',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    background: 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <Square size={11} fill="#f87171" /> 中止掃描
                </button>
              )}

              {isPaused && (
                <button
                  type="button"
                  onClick={handleResume}
                  className="btn btn-sm btn-primary"
                  style={{
                    padding: '2px 10px',
                    fontSize: '0.725rem',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderColor: '#f59e0b',
                  }}
                >
                  <Play size={11} fill="#fff" /> 接續掃描剩餘 ({remainingCount} 檔)
                </button>
              )}

              {!loading && (
                <button
                  type="button"
                  onClick={handleFullRescan}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="清空 24H 快取並強制重新發送線上 API 查詢"
                >
                  <RefreshCw size={11} /> <span>{isPaused ? '強制全量重掃' : '強制清除快取重掃'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selection Action Toolbar */}
        {!loading && actions.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 4px 8px 4px',
              fontSize: '0.775rem',
            }}
          >
            <div style={{ color: 'var(--text-secondary)' }}>
              共發現 <strong style={{ color: '#fff' }}>{actions.length}</strong> 個事件，
              其中 <strong style={{ color: '#f59e0b' }}>{unrecordedCount}</strong> 筆待補登
              <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#10b981' }}>
                (⚡ 已啟用受控節流與 24H 實體快取)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleSelectAllUnrecorded}
                style={{ padding: '2px 8px', fontSize: '0.725rem' }}
              >
                全選待補登 ({unrecordedCount})
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleClearAll}
                style={{ padding: '2px 8px', fontSize: '0.725rem' }}
              >
                清空選取
              </button>
            </div>
          </div>
        )}


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
                          除息日 {act.date} · 基準日持股：<strong>{act.sharesHeldOnDate.toLocaleString()}</strong> 股{act.payDate ? ` · 預計發放：${act.payDate}` : ''} · {act.description}
                        </div>
                      </div>
                    </div>

                    {/* Right: Estimated Payout & Status */}
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '0.875rem', color: isDiv ? '#fbbf24' : isStockDiv ? '#c084fc' : '#38bdf8' }}>
                        {isDiv && `+${formatCurrencyAmount(act.estimatedCashAmount, act.currency)}`}
                        {isStockDiv && `+${formatSharesCount(act.estimatedSharesChange, act.market)} 股`}
                        {isSplit && `${act.ratio}x 分割`}
                        {isReduction && `+${formatCurrencyAmount(act.estimatedCashAmount, act.currency)}`}
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
            {totalTwdCash > 0 && <span> · 預估入帳 <strong>{formatCurrencyAmount(totalTwdCash, 'TWD')}</strong></span>}
            {totalUsdCash > 0 && <span> · 預估入帳 <strong>{formatCurrencyAmount(totalUsdCash, 'USD')}</strong></span>}
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
