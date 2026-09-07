import React from 'react';
import {
  TrendingUp,
  PlusCircle,
  Upload,
  DollarSign,
  Palette,
  Sparkles,
  RefreshCw,
  Building2,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';
import { MarketType, ColorThemeMode, ExchangeRateQuote, AccountingView, BrokerAccount } from '../types/stock';

interface HeaderProps {
  currentMarket: 'ALL' | MarketType;
  onSelectMarket: (market: 'ALL' | MarketType) => void;
  accounts?: BrokerAccount[];
  selectedAccountId?: string;
  onSelectAccount?: (id: string) => void;
  usdToTwdRate: number;
  exchangeRateQuote?: ExchangeRateQuote;
  colorTheme: ColorThemeMode;
  onToggleColorTheme: () => void;
  accountingView?: AccountingView;
  onChangeAccountingView?: (view: AccountingView) => void;
  isRefreshing?: boolean;
  lastUpdated?: number | null;
  marketStatus?: { isTWOpen: boolean; isUSOpen: boolean; isAnyOpen: boolean };
  onRefreshAll?: () => void;
  onOpenTradeModal: () => void;
  onOpenScannerModal: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenImportModal?: () => void;
}

export function getColorThemeLabel(colorTheme: ColorThemeMode): string {
  return colorTheme === 'taiwan' ? '🔴 紅漲 🟢 綠跌' : '🟢 綠漲 🔴 紅跌';
}

export function getColorThemeTooltip(colorTheme: ColorThemeMode): string {
  return colorTheme === 'taiwan'
    ? '目前模式：台股習慣 (紅漲綠跌)\n點擊切換為：國際/美股習慣 (綠漲紅跌)'
    : '目前模式：國際/美股習慣 (綠漲紅跌)\n點擊切換為：台股習慣 (紅漲綠跌)';
}

export const Header: React.FC<HeaderProps> = ({
  currentMarket,
  onSelectMarket,
  accounts = [],
  selectedAccountId = 'ALL',
  onSelectAccount,
  usdToTwdRate,
  exchangeRateQuote,
  colorTheme,
  onToggleColorTheme,
  accountingView = 'BROKER',
  onChangeAccountingView,
  isRefreshing = false,
  lastUpdated = null,
  marketStatus,
  onRefreshAll,
  onOpenTradeModal,
  onOpenScannerModal,
  onExportJSON,
  onExportCSV,
  onImportFile,
  onOpenImportModal,
}) => {
  return (
    <header
      className="glass-card"
      style={{
        padding: '16px 22px',
        marginBottom: '20px',
        border: '1px solid rgba(51, 65, 85, 0.4)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.75) 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={22} color="#ffffff" />
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #080c14',
              }}
              className="pulse-dot-green"
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '800',
                  letterSpacing: '-0.025em',
                  margin: 0,
                  color: 'var(--text-primary)',
                  background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                股票交易紀錄與分析儀
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                PRO
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              雙市場精確會計 · 多券商分流 · XIRR 現金流 · 質押風控
            </p>
          </div>
        </div>

        {/* Central Filters: Market & Account & Accounting Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Market Filter Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(19, 29, 49, 0.8)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            {(['ALL', 'TW', 'US'] as const).map((m) => {
              const isSelected = currentMarket === m;
              return (
                <button
                  key={m}
                  onClick={() => onSelectMarket(m)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSelected
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                  }}
                >
                  {m === 'ALL' ? '全部市場' : m === 'TW' ? '🇹🇼 台股' : '🇺🇸 美股'}
                </button>
              );
            })}
          </div>

          {/* Account Selector */}
          {onSelectAccount && accounts.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(19, 29, 49, 0.8)',
                padding: '4px 10px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}
            >
              <Building2 size={13} color="var(--text-muted)" />
              <select
                value={selectedAccountId}
                onChange={(e) => onSelectAccount(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  outline: 'none',
                  paddingRight: '4px',
                }}
              >
                <option value="ALL" style={{ background: '#0f172a', color: '#ffffff' }}>
                  🏛️ 全部帳戶合併
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                    {acc.market === 'TW' ? '🇹🇼' : '🇺🇸'} {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Accounting View Mode Toggle */}
          {onChangeAccountingView && (
            <div
              style={{
                display: 'flex',
                background: 'rgba(19, 29, 49, 0.8)',
                padding: '3px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                onClick={() => onChangeAccountingView('BROKER')}
                title="券商核帳模式：不含息原始付出成本，市值預先扣除預估賣出證交稅與手續費（淨變現清算值），100% 對齊券商 App"
                style={{
                  padding: '5px 11px',
                  borderRadius: '7px',
                  border: 'none',
                  background: accountingView === 'BROKER'
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'transparent',
                  color: accountingView === 'BROKER' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: accountingView === 'BROKER' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  boxShadow: accountingView === 'BROKER' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                }}
              >
                <span>🏢 券商核帳</span>
                <span style={{ fontSize: '0.66rem', opacity: 0.8 }}>(淨清算)</span>
              </button>
              <button
                onClick={() => onChangeAccountingView('TOTAL_RETURN')}
                title="投資總報酬模式：牌面毛市值，損益加計歷年已領現金股利與已實現利得，展現真實存股複利績效"
                style={{
                  padding: '5px 11px',
                  borderRadius: '7px',
                  border: 'none',
                  background: accountingView === 'TOTAL_RETURN'
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'transparent',
                  color: accountingView === 'TOTAL_RETURN' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: accountingView === 'TOTAL_RETURN' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  boxShadow: accountingView === 'TOTAL_RETURN' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                }}
              >
                <span>📈 總報酬</span>
                <span style={{ fontSize: '0.66rem', opacity: 0.8 }}>(含息複利)</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Controls & Rate Config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Live Quote Refresh & Market Status */}
          {onRefreshAll && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onRefreshAll}
              disabled={isRefreshing}
              title="一鍵更新全場有效持股市價 (Yahoo Finance / TWSE 備援)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(59, 130, 246, 0.18) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontWeight: 700,
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin-animation' : ''} />
              <span>{isRefreshing ? '更新中...' : '⚡ 更新市價'}</span>
            </button>
          )}

          {/* Market Status & Time Chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(19, 29, 49, 0.7)',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
            }}
            title="開盤時段系統每 60 秒自動輪詢最新市價"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              {marketStatus?.isTWOpen ? (
                <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} className="pulse-dot-green" />
                  台股盤中
                </span>
              ) : marketStatus?.isUSOpen ? (
                <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} className="pulse-dot-green" />
                  美股盤中
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>⚪ 休市中</span>
              )}
            </span>
            {lastUpdated && (
              <span className="mono" style={{ color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: '6px' }}>
                {new Date(lastUpdated).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* Color Theme Toggle */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onToggleColorTheme}
            title={getColorThemeTooltip(colorTheme)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px' }}
          >
            <Palette size={13} color="var(--primary-color)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {getColorThemeLabel(colorTheme)}
            </span>
          </button>

          {/* Exchange Rate Badge */}
          {(() => {
            const statusLabel =
              exchangeRateQuote?.status === 'REALTIME'
                ? '🟢 即時匯率 (Yahoo Finance)'
                : exchangeRateQuote?.status === 'DELAYED'
                ? '🟢 盤中延遲匯率 (Yahoo Finance)'
                : exchangeRateQuote?.status === 'PREVIOUS_CLOSE'
                ? '🟡 昨日收盤匯率 (Yahoo Finance)'
                : exchangeRateQuote?.status === 'CACHED'
                ? '⚠️ 離線快取匯率 (LocalStorage)'
                : '基準預設匯率';

            const updateTimeStr = exchangeRateQuote?.updatedAt
              ? new Date(exchangeRateQuote.updatedAt).toLocaleTimeString('zh-TW', { hour12: false })
              : null;

            const changeStr =
              typeof exchangeRateQuote?.changePercent === 'number'
                ? ` (${exchangeRateQuote.changePercent >= 0 ? '+' : ''}${exchangeRateQuote.changePercent.toFixed(2)}%)`
                : '';

            const tooltipText = `USD/TWD 美金台幣匯率\n狀態：${statusLabel}${changeStr}${
              updateTimeStr ? `\n更新時間：${updateTimeStr}` : ''
            }`;

            return (
              <div
                title={tooltipText}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(19, 29, 49, 0.8)',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  cursor: 'help',
                  transition: 'all 0.2s ease',
                }}
              >
                <DollarSign
                  size={13}
                  color="#f59e0b"
                  style={{
                    animation: isRefreshing ? 'spin 1.5s linear infinite' : 'none',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>USD/TWD:</span>
                <span
                  className="mono"
                  style={{
                    color: '#f8fafc',
                    fontWeight: 700,
                  }}
                >
                  {usdToTwdRate > 0 ? usdToTwdRate.toFixed(2) : '32.50'}
                </span>
                {exchangeRateQuote?.status === 'PREVIOUS_CLOSE' && (
                  <span style={{ fontSize: '0.62rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 4px', borderRadius: '4px' }}>
                    昨收
                  </span>
                )}
                {exchangeRateQuote?.status === 'CACHED' && (
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.15)', padding: '1px 4px', borderRadius: '4px' }}>
                    快取
                  </span>
                )}
              </div>
            );
          })()}

          {/* Backup / Export Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onExportJSON}
              title="匯出完整 JSON 備份檔"
              style={{ padding: '5px 8px' }}
            >
              <FileJson size={13} />
              <span style={{ fontSize: '0.72rem' }}>JSON</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onExportCSV}
              title="匯出 CSV 試算表"
              style={{ padding: '5px 8px' }}
            >
              <FileSpreadsheet size={13} />
              <span style={{ fontSize: '0.72rem' }}>CSV</span>
            </button>
          </div>

          {/* Import file (JSON & CSV 智慧匯入精靈) */}
          {onOpenImportModal ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenImportModal}
              title="開啟增強型 CSV / JSON 智慧匯入精靈"
              style={{ padding: '5px 10px' }}
            >
              <Upload size={13} />
              <span style={{ fontSize: '0.75rem' }}>匯入</span>
            </button>
          ) : (
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', padding: '5px 10px' }} title="從 JSON 或 CSV 還原/匯入備份">
              <Upload size={13} />
              <span style={{ fontSize: '0.75rem' }}>匯入</span>
              <input type="file" accept=".json,.csv" onChange={onImportFile} style={{ display: 'none' }} value="" />
            </label>
          )}

          {/* Smart Corporate Action Scanner Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenScannerModal}
            title="智慧掃描持股除權息、減資與分割事件"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.45)',
              color: '#d8b4fe',
              fontWeight: 600,
              padding: '6px 12px',
            }}
          >
            <Sparkles size={14} color="#c084fc" />
            <span>智慧掃描</span>
          </button>

          {/* New Trade Record Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenTradeModal}
            style={{ padding: '6px 14px', fontWeight: 700 }}
          >
            <PlusCircle size={15} />
            <span>新增交易</span>
          </button>
        </div>
      </div>
    </header>
  );
};
