import React from 'react';
import { TrendingUp, PlusCircle, Download, Upload, DollarSign, Palette, Sparkles, RefreshCw } from 'lucide-react';
import { MarketType, ColorThemeMode, ExchangeRateQuote, AccountingView } from '../types/stock';

interface HeaderProps {
  currentMarket: 'ALL' | MarketType;
  onSelectMarket: (market: 'ALL' | MarketType) => void;
  usdToTwdRate: number;
  exchangeRateQuote?: ExchangeRateQuote;
  colorTheme: ColorThemeMode;
  onToggleColorTheme: () => void;
  accountingView?: AccountingView;
  onChangeAccountingView?: (view: AccountingView) => void;
  brokerFeeDiscount?: number;
  onChangeBrokerFeeDiscount?: (discount: number) => void;
  isRefreshing?: boolean;
  lastUpdated?: number | null;
  marketStatus?: { isTWOpen: boolean; isUSOpen: boolean; isAnyOpen: boolean };
  onRefreshAll?: () => void;
  onOpenTradeModal: () => void;
  onOpenScannerModal: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMarket,
  onSelectMarket,
  usdToTwdRate,
  exchangeRateQuote,
  colorTheme,
  onToggleColorTheme,
  accountingView = 'BROKER',
  onChangeAccountingView,
  brokerFeeDiscount = 1.0,
  onChangeBrokerFeeDiscount,
  isRefreshing = false,
  lastUpdated = null,
  marketStatus,
  onRefreshAll,
  onOpenTradeModal,
  onOpenScannerModal,
  onExportJSON,
  onExportCSV,
  onImportFile,
}) => {


  return (
    <header className="glass-card" style={{ padding: '18px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
          }}>
            <TrendingUp size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
              股票交易紀錄與分析儀
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              美股 · 台股 雙市場精確會計與資產配置
            </p>
          </div>
        </div>

        {/* Market Filter Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(30, 41, 59, 0.7)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}>
          {(['ALL', 'TW', 'US'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onSelectMarket(m)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: currentMarket === m ? '#10b981' : 'transparent',
                color: currentMarket === m ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: currentMarket === m ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {m === 'ALL' ? '全部市場' : m === 'TW' ? '🇹🇼 台股 (TWD)' : '🇺🇸 美股 (USD)'}
            </button>
          ))}
        </div>

        {/* Accounting View Mode Toggle */}
        {onChangeAccountingView && (
          <div
            style={{
              display: 'flex',
              background: 'rgba(30, 41, 59, 0.7)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => onChangeAccountingView('BROKER')}
              title="券商核帳模式：不含息原始付出成本，市值預先扣除預估賣出證交稅與手續費（淨變現清算值），100% 對齊券商 App"
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: accountingView === 'BROKER' ? '#3b82f6' : 'transparent',
                color: accountingView === 'BROKER' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: accountingView === 'BROKER' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
              }}
            >
              <span>🏢 券商核帳</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>(不含息·含稅)</span>
            </button>
            <button
              onClick={() => onChangeAccountingView('TOTAL_RETURN')}
              title="投資總報酬模式：牌面毛市值，損益加計歷年已領現金股利與已實現利得，展現真實存股複利績效"
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: accountingView === 'TOTAL_RETURN' ? '#10b981' : 'transparent',
                color: accountingView === 'TOTAL_RETURN' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: accountingView === 'TOTAL_RETURN' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
              }}
            >
              <span>📈 總報酬</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>(含息·毛市值)</span>
            </button>
          </div>
        )}

        {/* Broker Fee Discount Selector (僅在券商核帳模式下呈現) */}
        {accountingView === 'BROKER' && onChangeBrokerFeeDiscount && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(30, 41, 59, 0.7)',
              padding: '3px 8px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
            title="券商預扣手續費折讓率：1.0 為標準牌告全額 (100% 對齊券商 App 標準口徑)，亦可切換為 6折 或 2.8折"
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>賣出手續費:</span>
            <select
              value={brokerFeeDiscount.toString()}
              onChange={(e) => onChangeBrokerFeeDiscount(parseFloat(e.target.value))}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#60a5fa',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="1" style={{ background: '#1e293b', color: '#ffffff' }}>1.0 全額 (券商預設)</option>
              <option value="0.6" style={{ background: '#1e293b', color: '#ffffff' }}>0.6 (6折)</option>
              <option value="0.28" style={{ background: '#1e293b', color: '#ffffff' }}>0.28 (2.8折)</option>
              <option value="0.2" style={{ background: '#1e293b', color: '#ffffff' }}>0.2 (2折)</option>
              <option value="0" style={{ background: '#1e293b', color: '#ffffff' }}>0.0 (免手續費)</option>
            </select>
          </div>
        )}

        {/* Action Controls & Rate Config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontWeight: 600,
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
              background: 'rgba(30, 41, 59, 0.5)',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
            }}
            title="開盤時段系統每 60 秒自動輪詢最新市價"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {marketStatus?.isTWOpen ? (
                <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 台股盤中</span>
              ) : marketStatus?.isUSOpen ? (
                <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 美股盤中</span>
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
            title="切換漲跌色彩模式 (台股紅漲綠跌 / 國際綠漲紅跌)"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
          >
            <Palette size={13} color="var(--primary-color)" />
            <span style={{ fontSize: '0.75rem' }}>
              {colorTheme === 'taiwan' ? '🔴 紅漲 🟢 綠跌' : '🟢 綠漲 🔴 跌'}
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
                  gap: '6px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  cursor: 'help',
                  transition: 'all 0.2s ease',
                }}
              >
                <DollarSign
                  size={14}
                  color="#f59e0b"
                  style={{
                    animation: isRefreshing ? 'spin 1.5s linear infinite' : 'none',
                  }}
                />
                <span>USD/TWD:</span>
                <span
                  className="mono"
                  style={{
                    color: '#f8fafc',
                    fontWeight: 600,
                  }}
                >
                  {usdToTwdRate > 0 ? usdToTwdRate.toFixed(2) : '32.50'}
                </span>
                {exchangeRateQuote?.status === 'PREVIOUS_CLOSE' && (
                  <span style={{ fontSize: '0.65rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 4px', borderRadius: '4px' }}>
                    昨收
                  </span>
                )}
                {exchangeRateQuote?.status === 'CACHED' && (
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.15)', padding: '1px 4px', borderRadius: '4px' }}>
                    快取
                  </span>
                )}
              </div>
            );
          })()}


          {/* Backup / Export Buttons */}
          <button className="btn btn-secondary btn-sm" onClick={onExportJSON} title="匯出完整 JSON 備份檔">
            <Download size={14} /> JSON
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onExportCSV} title="匯出 CSV 試算表">
            <Download size={14} /> CSV
          </button>

          {/* Import file (JSON & CSV) */}
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }} title="從 JSON 或 CSV 還原/匯入備份">
            <Upload size={14} /> 匯入
            <input type="file" accept=".json,.csv" onChange={onImportFile} style={{ display: 'none' }} value="" />
          </label>

          {/* Smart Corporate Action Scanner Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenScannerModal}
            title="智慧掃描持股除權息、減資與分割事件"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#c084fc',
            }}
          >
            <Sparkles size={14} color="#c084fc" /> 智慧掃描
          </button>

          {/* New Trade Record Button */}
          <button className="btn btn-primary" onClick={onOpenTradeModal}>
            <PlusCircle size={16} /> 新增交易
          </button>
        </div>
      </div>
    </header>
  );
};
