import React, { useState, useEffect } from 'react';
import { MarketBarData } from '../../types/aiForceDashboard';
import { ColorThemeMode, MarketType } from '../../types/stock';
import { Activity, ShieldAlert, Cpu, Radio, RefreshCw } from 'lucide-react';
import { cleanSymbolInput, inferMarketType } from './HeaderQueryBar';
import { TermTooltip } from '../common/TermTooltip';

export type SystemBadgeType = 'AI_SCAN' | 'MAIN_FORCE' | 'MARKET_STATUS' | 'VOLATILITY';

export interface SystemBadgeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotAnimate?: boolean;
}

/**
 * 格式化漲跌額與百分比色彩
 */
export function formatMarketChange(
  change?: number,
  changePercent?: number,
  theme: ColorThemeMode = 'taiwan'
): { changeText: string; percentText: string; color: string } {
  if (change === undefined || changePercent === undefined || isNaN(change) || isNaN(changePercent)) {
    return { changeText: '-', percentText: '-', color: '#94a3b8' };
  }


  const isZero = Math.abs(change) < 0.0001;
  if (isZero) {
    return { changeText: '0.00', percentText: '0.00%', color: '#94a3b8' };
  }

  const isPositive = change > 0;
  const changeText = `${isPositive ? '+' : ''}${change.toFixed(2)}`;
  const percentText = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;

  let color: string;
  if (theme === 'taiwan') {
    color = isPositive ? '#ef4444' : '#10b981';
  } else {
    color = isPositive ? '#10b981' : '#ef4444';
  }

  return { changeText, percentText, color };
}

/**
 * 取得系統狀態燈號之配置
 */
export function getSystemBadgeConfig(type: SystemBadgeType, active: boolean = true): SystemBadgeConfig {
  switch (type) {
    case 'AI_SCAN':
      return {
        label: 'AI 智慧掃描',
        color: active ? '#10b981' : '#64748b',
        bgColor: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(16, 185, 129, 0.35)' : 'rgba(100, 116, 139, 0.2)',
        dotAnimate: active,
      };
    case 'MAIN_FORCE':
      return {
        label: '主力行為追蹤',
        color: active ? '#38bdf8' : '#64748b',
        bgColor: active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(56, 189, 248, 0.35)' : 'rgba(100, 116, 139, 0.2)',
      };
    case 'MARKET_STATUS':
      return {
        label: '市場即時狀態',
        color: active ? '#818cf8' : '#64748b',
        bgColor: active ? 'rgba(129, 140, 248, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(129, 140, 248, 0.35)' : 'rgba(100, 116, 139, 0.2)',
      };
    case 'VOLATILITY':
      return {
        label: '波動異常預警',
        color: active ? '#ef4444' : '#64748b',
        bgColor: active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(239, 68, 68, 0.35)' : 'rgba(100, 116, 139, 0.2)',
        dotAnimate: active,
      };
  }
}

/**
 * 數值安全格式化
 */
export function formatMarketMetric(val?: number, fractionDigits: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '-';
  }
  return val.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * 核心常駐快速切換標籤 (Spec 0169 Ticket 05)
 */
export const QUICK_CHIPS: Array<{ symbol: string; name: string; market: MarketType }> = [
  { symbol: '0050', name: '元大台灣50', market: 'TW' },
  { symbol: '2330', name: '台積電', market: 'TW' },
  { symbol: '2454', name: '聯發科', market: 'TW' },
  { symbol: 'NVDA', name: '輝達', market: 'US' },
  { symbol: 'AAPL', name: '蘋果', market: 'US' },
];

/**
 * 本地備援模糊搜尋候選標的 (支援代碼與中文名稱)
 */
export function searchCandidateSymbols(
  query: string,
  extraList?: Array<{ symbol: string; name: string; market: MarketType }>
): Array<{ symbol: string; name: string; market: MarketType }> {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  const pool = [
    ...QUICK_CHIPS,
    { symbol: '2317', name: '鴻海', market: 'TW' as const },
    { symbol: '0056', name: '元大高股息', market: 'TW' as const },
    { symbol: '00878', name: '國泰永續高股息', market: 'TW' as const },
    { symbol: '2308', name: '台達電', market: 'TW' as const },
    { symbol: '2382', name: '廣達', market: 'TW' as const },
    { symbol: '2603', name: '長榮', market: 'TW' as const },
    { symbol: 'TSLA', name: '特斯拉', market: 'US' as const },
    { symbol: 'MSFT', name: '微軟', market: 'US' as const },
    ...(extraList || []),
  ];

  const seen = new Set<string>();
  const results: Array<{ symbol: string; name: string; market: MarketType }> = [];
  for (const item of pool) {
    if (seen.has(item.symbol)) continue;
    if (
      item.symbol.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q)
    ) {
      seen.add(item.symbol);
      results.push(item);
    }
  }
  return results.slice(0, 8);
}

export interface HeaderMarketBarProps {
  data: MarketBarData;
  colorTheme?: ColorThemeMode;
  currentSymbol?: string;
  currentName?: string;
  isLoading?: boolean;
  onAnalyze?: (symbol: string, market: MarketType) => void;
}

export const HeaderMarketBar: React.FC<HeaderMarketBarProps> = ({
  data,
  colorTheme = 'taiwan',
  currentSymbol = '0050',
  currentName = '元大台灣50',
  isLoading = false,
  onAnalyze,
}) => {
  const [inputVal, setInputVal] = useState(currentSymbol);
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string; market: MarketType }>>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(currentSymbol);
  }, [currentSymbol]);

  // 監聽全域點擊事件，點擊外部時關閉下拉選單 (Ticket 05 UX 強化)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  // 30ms 防抖搜尋下拉補全 (Ticket 05)
  useEffect(() => {
    let isCancelled = false;
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/symbols?q=${encodeURIComponent(trimmed)}`);
        if (res.ok && !isCancelled) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setSuggestions(
              list.slice(0, 8).map((s: any) => ({
                symbol: s.symbol,
                name: s.name,
                market: (s.market as MarketType) || inferMarketType(s.symbol),
              }))
            );
            return;
          }
        }
      } catch {
        // 忽略網路錯誤，降級使用本地備援搜尋
      }

      if (!isCancelled) {
        // 本地模糊匹配
        const fallbackList = searchCandidateSymbols(trimmed);
        setSuggestions(fallbackList);
      }
    }, 30);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [inputVal]);

  const changeMeta = formatMarketChange(data.change, data.changePercent, colorTheme);

  const scanBadge = getSystemBadgeConfig('AI_SCAN', data.statusBadges.aiScanActive);
  const mainForceBadge = getSystemBadgeConfig('MAIN_FORCE', data.statusBadges.mainForceTracking);
  const marketBadge = getSystemBadgeConfig('MARKET_STATUS', true);
  const volBadge = getSystemBadgeConfig('VOLATILITY', data.statusBadges.volatilityAlert);

  const handleSelectSymbol = (sym: string, mkt: MarketType) => {
    setInputVal(sym);
    setIsDropdownOpen(false);
    onAnalyze?.(sym, mkt);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    const clean = cleanSymbolInput(inputVal);
    if (!clean || !onAnalyze) return;
    const inferred = inferMarketType(clean);
    onAnalyze(clean, inferred);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '10px 16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(20, 30, 55, 0.9) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. 第一層：股票搜尋操作、處置/注意警示與 4 大狀態指示燈 (Ticket 03: 單行清爽化) */}
      <div
        data-testid="header-market-bar-row1"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '16px',
          width: '100%',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* 左側：股票代號輸入框、即時下拉提示與分析按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div ref={searchContainerRef} style={{ position: 'relative' }}>
            <form
              onSubmit={handleSearchSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
                padding: '4px 12px 4px 8px',
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.45)',
                boxShadow: '0 0 12px rgba(59, 130, 246, 0.15)',
              }}
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="代號/中文"
                aria-label="股票代號"
                style={{
                  minWidth: '95px',
                  maxWidth: '140px',
                  width: `${Math.max(6, inputVal.length + 1)}ch`,
                  padding: '0 4px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#38bdf8',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  letterSpacing: '0.8px',
                }}
              />
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                {currentName}
              </span>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {isLoading ? <RefreshCw size={12} className="animate-spin" /> : <span>分析</span>}
              </button>
            </form>

            {/* 即時搜尋下拉補全卡片 (Ticket 05) */}
            {isDropdownOpen && suggestions.length > 0 && (
              <div
                data-testid="search-autocomplete-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: '280px',
                  background: '#0f172a',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                {suggestions.map((item) => (
                  <div
                    key={`${item.market}-${item.symbol}`}
                    data-testid={`suggestion-item-${item.symbol}`}
                    onClick={() => handleSelectSymbol(item.symbol, item.market)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.9rem' }}>
                        {item.symbol}
                      </span>
                      <span style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{item.name}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: item.market === 'US' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: item.market === 'US' ? '#34d399' : '#60a5fa',
                      }}
                    >
                      {item.market}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 處置/注意股票警示徽章 (Ticket 13) */}
        {data.marketStatusTag === 'DISPOSITION' && (
          <span
            data-testid="market-disposition-badge"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.22)',
              color: '#f87171',
              border: '1px solid #ef4444',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)',
              flexShrink: 0,
            }}
          >
            🚨 處置股票 (分盤撮合)
          </span>
        )}
        {data.marketStatusTag === 'ATTENTION' && (
          <span
            data-testid="market-attention-badge"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.22)',
              color: '#fbbf24',
              border: '1px solid #f59e0b',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)',
              flexShrink: 0,
            }}
          >
            ⚠️ 注意股票
          </span>
        )}

        {/* 右側：4 大全繁體中文科技感狀態指示燈 (Ticket 03: 單行不折行保護) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', flexShrink: 0 }}>
          {/* 1. AI 智慧掃描 */}
          <TermTooltip termId="aiConfidence" underline={false}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '7px',
                background: scanBadge.bgColor,
                border: `1px solid ${scanBadge.borderColor}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: scanBadge.color,
                letterSpacing: '0.3px',
              }}
            >
              <Cpu size={13} />
              <span>{scanBadge.label}</span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: scanBadge.color,
                  boxShadow: `0 0 6px ${scanBadge.color}`,
                }}
              />
            </div>
          </TermTooltip>

          {/* 2. 主力行為追蹤 */}
          <TermTooltip termId="mainForceAction" underline={false}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '7px',
                background: mainForceBadge.bgColor,
                border: `1px solid ${mainForceBadge.borderColor}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: mainForceBadge.color,
              }}
            >
              <Radio size={13} />
              <span>{mainForceBadge.label}</span>
            </div>
          </TermTooltip>

          {/* 3. 市場即時狀態 */}
          <TermTooltip termId="shortTermState" underline={false}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '7px',
                background: marketBadge.bgColor,
                border: `1px solid ${marketBadge.borderColor}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: marketBadge.color,
              }}
            >
              <Activity size={13} />
              <span>{marketBadge.label}</span>
            </div>
          </TermTooltip>

          {/* 4. 波動異常預警 */}
          <TermTooltip termId="radarVolatility" underline={false}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '7px',
                background: volBadge.bgColor,
                border: `1px solid ${volBadge.borderColor}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: volBadge.color,
              }}
            >
              <ShieldAlert size={13} />
              <span>{volBadge.label}</span>
            </div>
          </TermTooltip>
        </div>
      </div>

      {/* 2. 第二層：寬幅即時行情大面板 (10 大 KPI 舒展橫排，徹底告別緊縮) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          width: '100%',
          fontSize: '0.85rem',
          paddingTop: '2px',
        }}
      >
        {/* 今日收盤價 / 前日收盤價 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TermTooltip termId="closePrice">
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {data.isSettled === false ? '前日收盤價' : '今日收盤價'}
              </span>
            </TermTooltip>
            {data.isSettled === false && (
              <span
                data-testid="market-unsettled-badge"
                style={{
                  fontSize: '0.62rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(245, 158, 11, 0.18)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
                title={data.settlementReason || '市場尚未收盤結算，以確定之前日收盤數據為準'}
              >
                ⚠️ 盤中未結算
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
              {formatMarketMetric(data.currentPrice, 2)}
            </span>
            {data.currency && (
              <span
                data-testid="market-currency-badge"
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                }}
              >
                {data.currency}
              </span>
            )}
            {data.isSettled === false && data.intradayQuote && (
              <span
                data-testid="market-intraday-reference"
                style={{
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
                title="盤中即時行情參考，不參與歷史量化模型運算"
              >
                盤中即時:{' '}
                <span
                  style={{
                    color:
                      data.intradayQuote.change > 0
                        ? (colorTheme === 'international' ? '#10b981' : '#ef4444')
                        : data.intradayQuote.change < 0
                        ? (colorTheme === 'international' ? '#ef4444' : '#10b981')
                        : '#94a3b8',
                    fontWeight: 700,
                  }}
                >
                  {formatMarketMetric(data.intradayQuote.price, 2)} (
                  {data.intradayQuote.changePercent >= 0 ? '+' : ''}
                  {data.intradayQuote.changePercent.toFixed(2)}%)
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 今日漲跌 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <TermTooltip termId="closePrice">
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {data.isSettled === false ? '前日漲跌' : '今日漲跌'}
            </span>
          </TermTooltip>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: changeMeta.color }}>
            {changeMeta.changeText}
          </span>
        </div>

        {/* 今日漲幅 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <TermTooltip termId="closePrice">
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {data.isSettled === false ? '前日漲幅' : '今日漲幅'}
            </span>
          </TermTooltip>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: changeMeta.color }}>
            {changeMeta.percentText}
          </span>
        </div>

        <div style={{ width: '1px', height: '26px', background: 'rgba(255,255,255,0.12)' }} />

        {/* 成交量 (張/股) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <TermTooltip termId="volumeShares">
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {data.isSettled === false
                ? `前日成交量(${data.volumeUnit ?? (data.currency === 'USD' ? '股' : '張')})`
                : `成交量(${data.volumeUnit ?? (data.currency === 'USD' ? '股' : '張')})`}
            </span>
          </TermTooltip>
          <span style={{ fontSize: '1.02rem', fontWeight: 700, color: '#38bdf8' }}>
            {formatMarketMetric(data.volumeShares, 0)}
          </span>
        </div>

        {/* 成交筆數 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <TermTooltip termId="transactionCount">
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {data.isSettled === false ? '前日筆數' : '成交筆數'}
            </span>
          </TermTooltip>
          <span style={{ fontSize: '1.02rem', fontWeight: 700, color: '#f1f5f9' }}>
            {formatMarketMetric(data.transactionCount, 0)}
          </span>
        </div>

        {/* 開盤 / 最高 / 最低 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <TermTooltip termId="openPrice">
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>開盤</span>
          </TermTooltip>
          <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#e2e8f0' }}>
            {formatMarketMetric(data.openPrice, 2)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <TermTooltip termId="highPrice">
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>最高</span>
          </TermTooltip>
          <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f87171' }}>
            {formatMarketMetric(data.highPrice, 2)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <TermTooltip termId="lowPrice">
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>最低</span>
          </TermTooltip>
          <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#34d399' }}>
            {formatMarketMetric(data.lowPrice, 2)}
          </span>
        </div>

        <div style={{ width: '1px', height: '26px', background: 'rgba(255,255,255,0.12)' }} />

        {/* 最新交易日 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {data.isSettled === false ? '定錨基準日' : '最新交易日'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: data.isSettled === false ? '#fbbf24' : '#94a3b8',
              }}
            >
              {data.latestTradingDate}
            </span>
            {data.isSettled === false && (
              <span style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 700 }}>
                [前日收盤]
              </span>
            )}
          </div>
        </div>

        {/* 資料筆數 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>資料筆數</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>
            {data.dataPointsCount} 日
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeaderMarketBar;
