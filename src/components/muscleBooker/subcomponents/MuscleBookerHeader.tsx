import React from 'react';
import {
  Flame,
  Search,
  RefreshCw,
  Database,
  Plus,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { AssetPoolType } from '../../../engine/muscleBookerEngine';
import { SyncState } from '../hooks/useMuscleBookerSync';
import { resolveOfficialSecurityName } from '../../../engine/stockNameResolver';

export interface MuscleBookerHeaderProps {
  universeSyncToast: { message: string; type: 'info' | 'success' | 'warn' } | null;
  universeStatusText: string;
  isCheckingUniverse: boolean;
  onManualCheckUniverse: () => void;
  selectedPool: AssetPoolType;
  onSelectPool: (pool: AssetPoolType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  syncState: SyncState;
  onTriggerManualSync: (forceRefresh?: boolean) => void;
  actionFilter: 'ALL' | 'BUY' | 'AVOID' | 'SELL';
  onActionFilterChange: (f: 'ALL' | 'BUY' | 'AVOID' | 'SELL') => void;
  counts: { all: number; buy: number; avoid: number; sell: number };
  watchlistSymbols: string[];
  customInputSymbol: string;
  customInputError: string | null;
  isAddingCustom: boolean;
  onCustomInputChange: (val: string) => void;
  onAddCustomSymbol: (e: React.FormEvent) => void;
  onToggleWatchlist: (sym: string) => void;
  // 即時診斷相關
  filteredCount: number;
  isAdHocLoading: boolean;
  adHocError: string | null;
  onRunAdHocScan: (symbol?: string) => void;
}

export const MuscleBookerHeader: React.FC<MuscleBookerHeaderProps> = ({
  universeSyncToast,
  universeStatusText,
  isCheckingUniverse,
  onManualCheckUniverse,
  selectedPool,
  onSelectPool,
  searchQuery,
  onSearchChange,
  syncState,
  onTriggerManualSync,
  actionFilter,
  onActionFilterChange,
  counts,
  watchlistSymbols,
  customInputSymbol,
  customInputError,
  isAddingCustom,
  onCustomInputChange,
  onAddCustomSymbol,
  onToggleWatchlist,
  filteredCount,
  isAdHocLoading,
  adHocError,
  onRunAdHocScan,
}) => {
  return (
    <>
      {/* 輕量 Toast 通知 */}
      {universeSyncToast && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background:
              universeSyncToast.type === 'warn'
                ? 'rgba(239, 68, 68, 0.95)'
                : universeSyncToast.type === 'success'
                ? 'rgba(34, 197, 94, 0.95)'
                : 'rgba(56, 189, 248, 0.95)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {universeSyncToast.message}
        </div>
      )}

      {/* 頂部 Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
            <Flame size={26} color="#4ade80" />
            肌肉書僮 · 動能雷達
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              短線動能操盤與箱子戰術量化矩陣
            </span>
            <span
              className="badge"
              style={{
                fontSize: '0.72rem',
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                cursor: 'pointer',
              }}
              onClick={onManualCheckUniverse}
              title="點擊手動強制校準最新官方成分股與存活探針"
            >
              {isCheckingUniverse ? <Loader2 size={12} className="animate-spin" /> : universeStatusText}
            </span>
          </div>
        </div>

        {/* 搜尋框與資產池切換 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="搜尋代碼 / 名稱..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRunAdHocScan();
                }
              }}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <select
            value={selectedPool}
            onChange={(e) => onSelectPool(e.target.value as AssetPoolType)}
            style={{
              padding: '6px 12px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <optgroup label="🇹🇼 台灣市場 (Taiwan Markets)">
              <option value="TW_ALL">🇹🇼 台灣上市櫃全量 (~2,280+ 檔)</option>
              <option value="TW50_CORE">🇹🇼 台灣五十藍籌 (TW50)</option>
              <option value="MID100_MOMENTUM">🚀 中型潛力動能 (Mid100)</option>
              <option value="TW_TOP_30_FOCUS">🔥 台股核心動能焦點 (Top 30)</option>
            </optgroup>

            <optgroup label="🇺🇸 美股四大市場 (US Markets & Indices)">
              <option value="US_SP500">🇺🇸 標普 500 (S&P 500 大型權值)</option>
              <option value="US_NASDAQ100">🇺🇸 那斯達克 100 (NASDAQ 100 科技旗艦)</option>
              <option value="US_DOW30">🇺🇸 道瓊工業 30 (Dow Jones 30 藍籌龍頭)</option>
              <option value="US_SOX30">🇺🇸 費城半導體 30 (PHLX SOX 晶片霸主)</option>
              <option value="US_MEGA_50_CORE">🇺🇸 美股大型核心 (Mega 50)</option>
            </optgroup>

            <optgroup label="💼 我的投資組合 (Portfolio)">
              <option value="HOLDINGS_ACTIVE">📦 在庫有效持股</option>
              <option value="CUSTOM_WATCHLIST">🌟 自訂精選觀察名單</option>
              <option value="HOLDINGS">💼 在庫全部標的</option>
              <option value="HOLDINGS_CLOSED">📜 歷史已平倉標的</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* 📊 本地日 K 快取與受控增量同步狀態列 */}
      <div
        className="card"
        style={{
          padding: '10px 16px',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '16px',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={15} color="#38bdf8" />
          <span style={{ color: 'var(--text-secondary)' }}>
            數據源：{syncState.isSyncing ? '日 K 增量水合中...' : '湖倉日 K 本地就緒'}
          </span>
          {syncState.isSyncing && (
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              ({syncState.current}/{syncState.total} {syncState.currentSymbol})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onTriggerManualSync(false)}
            disabled={syncState.isSyncing}
            className="btn btn-sm"
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              cursor: syncState.isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              fontSize: '0.78rem',
            }}
          >
            <RefreshCw size={12} className={syncState.isSyncing ? 'animate-spin' : ''} />
            {syncState.isSyncing ? '同步中' : '增量刷新'}
          </button>
        </div>
      </div>

      {/* 🚦 三色操作戰術導覽篩選列 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => onActionFilterChange('ALL')}
          className="btn btn-sm"
          style={{
            background: actionFilter === 'ALL' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)',
            color: actionFilter === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
            border: '1px solid ' + (actionFilter === 'ALL' ? 'rgba(56, 189, 248, 0.5)' : 'var(--border-color)'),
            fontWeight: 700,
          }}
        >
          全部標的 ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => onActionFilterChange('BUY')}
          className="btn btn-sm"
          style={{
            background: actionFilter === 'BUY' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(15, 23, 42, 0.6)',
            color: actionFilter === 'BUY' ? '#4ade80' : 'var(--text-secondary)',
            border: '1px solid ' + (actionFilter === 'BUY' ? 'rgba(34, 197, 94, 0.5)' : 'var(--border-color)'),
            fontWeight: 700,
          }}
        >
          🟢 建議買進 ({counts.buy})
        </button>

        <button
          type="button"
          onClick={() => onActionFilterChange('AVOID')}
          className="btn btn-sm"
          style={{
            background: actionFilter === 'AVOID' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(15, 23, 42, 0.6)',
            color: actionFilter === 'AVOID' ? '#facc15' : 'var(--text-secondary)',
            border: '1px solid ' + (actionFilter === 'AVOID' ? 'rgba(234, 179, 8, 0.5)' : 'var(--border-color)'),
            fontWeight: 700,
          }}
        >
          🟡 觀望不碰 ({counts.avoid})
        </button>

        <button
          type="button"
          onClick={() => onActionFilterChange('SELL')}
          className="btn btn-sm"
          style={{
            background: actionFilter === 'SELL' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(15, 23, 42, 0.6)',
            color: actionFilter === 'SELL' ? '#f87171' : 'var(--text-secondary)',
            border: '1px solid ' + (actionFilter === 'SELL' ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-color)'),
            fontWeight: 700,
          }}
        >
          🔴 建議賣出 ({counts.sell})
        </button>
      </div>

      {/* 🌟 自訂觀察清單管理列 (僅在 CUSTOM_WATCHLIST 顯示) */}
      {selectedPool === 'CUSTOM_WATCHLIST' && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            marginBottom: '18px',
          }}
        >
          <form onSubmit={onAddCustomSymbol} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>新增自訂標的：</span>
            <input
              type="text"
              placeholder="輸入代碼 (例: 2330 或 NVDA)"
              value={customInputSymbol}
              onChange={(e) => onCustomInputChange(e.target.value)}
              style={{
                padding: '5px 10px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={isAddingCustom || !customInputSymbol.trim()}
              className="btn btn-sm"
              style={{
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                cursor: isAddingCustom || !customInputSymbol.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 700,
              }}
            >
              <Plus size={14} />
              {isAddingCustom ? '檢查加入中...' : '加入清單'}
            </button>
          </form>

          {customInputError && (
            <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '6px' }}>{customInputError}</div>
          )}

          {watchlistSymbols.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>清單標的：</span>
              {watchlistSymbols.map((sym) => {
                const officialName = resolveOfficialSecurityName(sym, sym);
                return (
                  <span
                    key={sym}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 8px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>{sym}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{officialName}</span>
                    <button
                      type="button"
                      onClick={() => onToggleWatchlist(sym)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="從自訂名單移除"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ⚡ 查無本地標的引導橫幅 */}
      {searchQuery.trim() && filteredCount === 0 && !isAdHocLoading && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '12px 18px',
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#38bdf8" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              本地觀察池未找到「{searchQuery.trim().toUpperCase()}」，是否立即進行即時連線診斷？
            </span>
          </div>
          <button
            onClick={() => onRunAdHocScan()}
            className="btn btn-sm"
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            即時診斷此標的
          </button>
        </div>
      )}

      {/* ⚡ 即時診斷異常提示 */}
      {adHocError && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '10px 16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            fontSize: '0.82rem',
            marginBottom: '16px',
          }}
        >
          {adHocError}
        </div>
      )}

      {/* ⚡ 即時診斷載入中指示 */}
      {isAdHocLoading && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '12px 16px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          <span>正在連線外部資料源回補歷史日 K 並動態運算肌肉書僮指標...</span>
        </div>
      )}
    </>
  );
};
