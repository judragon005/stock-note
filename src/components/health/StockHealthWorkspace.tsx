import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HeartPulse,
  Search,
  Plus,
  Check,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { MarketType, HoldingPosition, TradeRecord } from '../../types/stock';
import type { HealthCheckCategoryResult, StockHealthDiagnosis } from '../../types/stockHealth';
import { computeStockHealthDiagnosis } from '../../utils/stockHealthDiagnosis';
import { loadOrFetchFinancialReport } from '../../engine/financialReportService';
import { HealthCard } from './HealthCard';
import { HealthReportModal } from './HealthReportModal';
import { logger } from '../../utils/logger';

interface StockHealthWorkspaceProps {
  holdings: HoldingPosition[];
  trades: TradeRecord[];
  currentPrices: Record<string, number>;
  fmpApiKey?: string;
  finmindToken?: string;
  usdToTwdRate?: number;
}

// 熱門權值個股快捷候選清單
const POPULAR_STOCKS = [
  { symbol: '2330', name: '台積電', market: 'TW' as const },
  { symbol: '2454', name: '聯發科', market: 'TW' as const },
  { symbol: '2317', name: '鴻海', market: 'TW' as const },
  { symbol: 'NVDA', name: '輝達', market: 'US' as const },
  { symbol: 'AAPL', name: '蘋果', market: 'US' as const },
  { symbol: 'IBM', name: 'IBM', market: 'US' as const },
];

// ETF 代碼識別器（台股 00 開頭、美股常見大盤 ETF）
export const isEtfSymbol = (sym: string): boolean => {
  const clean = sym.trim().toUpperCase();
  // 台股 ETF 通常以 00 開頭（如 0050, 0056, 00403A, 00878, 00919, 00929 等）
  if (/^00[0-9A-Z]+/i.test(clean)) return true;
  // 美股常見指數型與產業型 ETF
  const knownUsEtfs = new Set([
    'SPY', 'QQQ', 'VOO', 'VTI', 'IVV', 'IWM', 'SOXX', 'SMH', 'XLK', 'XLF', 'XLV',
    'ARKK', 'SCHD', 'JEPI', 'TLT', 'VT', 'EEM', 'VGK', 'DIA',
  ]);
  return knownUsEtfs.has(clean);
};

export const StockHealthWorkspace: React.FC<StockHealthWorkspaceProps> = ({
  holdings,
  trades,
  currentPrices,
  fmpApiKey,
  finmindToken,
}) => {
  // 1. 預設選取持倉第一檔普通股，若庫存全為 ETF 或無持倉則預設 '2330'
  const initialSymbol = useMemo(() => {
    const normalHolding = holdings.find((h) => !isEtfSymbol(h.symbol));
    if (normalHolding) return normalHolding.symbol;
    if (holdings.length > 0) return holdings[0].symbol;
    return '2330';
  }, [holdings]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [searchInput, setSearchInput] = useState<string>('');
  const [showBanner, setShowBanner] = useState<boolean>(() => {
    return localStorage.getItem('stock_health_banner_closed') !== 'true';
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [diagnosis, setDiagnosis] = useState<StockHealthDiagnosis | null>(null);
  const [activeModalResult, setActiveModalResult] = useState<HealthCheckCategoryResult | null>(null);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  // 追蹤清單狀態
  const [watchList, setWatchList] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('stock_health_watchlist') || '[]');
    } catch {
      return [];
    }
  });

  const isFollowed = watchList.includes(selectedSymbol);

  const toggleFollow = () => {
    setWatchList((prev) => {
      const next = prev.includes(selectedSymbol)
        ? prev.filter((s) => s !== selectedSymbol)
        : [...prev, selectedSymbol];
      localStorage.setItem('stock_health_watchlist', JSON.stringify(next));
      return next;
    });
  };

  const handleToggleBanner = () => {
    setShowBanner((prev) => {
      const next = !prev;
      localStorage.setItem('stock_health_banner_closed', (!next).toString());
      return next;
    });
  };

  // 當前標的市場類別判定
  const selectedHolding = holdings.find((h) => h.symbol === selectedSymbol);
  const popularMatch = POPULAR_STOCKS.find((p) => p.symbol === selectedSymbol);
  const market: MarketType =
    selectedHolding?.market ||
    popularMatch?.market ||
    (/^\d+$/.test(selectedSymbol) || selectedSymbol.startsWith('00') ? 'TW' : 'US');
  const stockName = selectedHolding?.name || popularMatch?.name || selectedSymbol;
  const currentPrice = currentPrices[selectedSymbol] || selectedHolding?.currentPrice || 100;
  const isCurrentEtf = isEtfSymbol(selectedSymbol);

  // 歷史配息整理
  const annualDividends = useMemo(() => {
    const symbolTrades = trades.filter(
      (t) => t.symbol === selectedSymbol && t.type === 'DIVIDEND'
    );
    const divByYear = new Map<number, number>();
    for (const t of symbolTrades) {
      const y = new Date(t.date).getFullYear();
      const amt = t.price * t.shares;
      divByYear.set(y, (divByYear.get(y) || 0) + amt);
    }
    return Array.from(divByYear.entries()).map(([year, amount]) => ({ year, amount }));
  }, [trades, selectedSymbol]);

  // 載入財報數據並執行純函式診斷
  const loadDiagnosis = useCallback(async () => {
    setIsLoading(true);
    try {
      const report = await loadOrFetchFinancialReport(
        selectedSymbol,
        market,
        stockName,
        {
          fmpApiKey,
          finmindToken,
          forceRefresh: false,
        }
      );

      const records = report?.historicalRecords || [];
      const res = computeStockHealthDiagnosis({
        symbol: selectedSymbol,
        name: stockName,
        market,
        industryAttribute: report?.industryAttribute || 'STANDARD',
        records,
        currentPrice,
        changeRate: 0,
        annualDividends,
      });
      setDiagnosis(res);
    } catch (err) {
      logger.error('StockHealthWorkspace loadDiagnosis failed', err);
      const fallback = computeStockHealthDiagnosis({
        symbol: selectedSymbol,
        name: stockName,
        market,
        records: [],
        currentPrice,
        annualDividends,
      });
      setDiagnosis(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol, market, stockName, fmpApiKey, finmindToken, currentPrice, annualDividends]);

  useEffect(() => {
    loadDiagnosis();
  }, [loadDiagnosis]);

  // 標的搜尋/切換提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (clean) {
      setSelectedSymbol(clean);
      setSearchInput('');
    }
  };

  // 統合快捷膠囊 (持倉非 ETF 優先 + 熱門權值標的)
  const quickPills = useMemo(() => {
    const pills: Array<{ symbol: string; name: string; isHolding?: boolean }> = [];
    // 1. 持倉標的
    holdings.forEach((h) => {
      pills.push({ symbol: h.symbol, name: h.name || h.symbol, isHolding: true });
    });
    // 2. 熱門推薦
    POPULAR_STOCKS.forEach((p) => {
      if (!pills.some((item) => item.symbol === p.symbol)) {
        pills.push(p);
      }
    });
    return pills;
  }, [holdings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '48px' }}>
      {/* 1. 頂部科技藍導航橫幅 */}
      {showBanner ? (
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%)',
            color: '#ffffff',
            padding: '24px 28px',
            boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.25)',
          }}
        >
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <HeartPulse size={24} style={{ color: '#93c5fd' }} />
              <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                歡迎使用股票健診幫手
              </h2>
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#e0f2fe', margin: '0 0 16px 0' }}>
              我們設計了 4 大核心健診幫手與 21 項量化指標，協助你快速了解公司是否值得投資。如果公司在各項健診表現優異，即值得作為優先研究標的；若特定項目亮起紅燈，代表需深入探究其財務與營業真實體質。
            </p>
            <div>
              <button
                type="button"
                onClick={handleToggleBanner}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1d4ed8',
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.15s ease',
                }}
              >
                收起說明
              </button>
            </div>
          </div>

          {/* 右側視覺心跳裝飾圖示 */}
          <div
            style={{
              position: 'absolute',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.2,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '4px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              <HeartPulse size={72} color="#ffffff" />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px' }}>
          <button
            type="button"
            onClick={handleToggleBanner}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <HelpCircle size={14} /> 展開健診幫手說明
          </button>
        </div>
      )}

      {/* 2. 快捷標的膠囊列 (Stock Pills) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'thin',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            paddingRight: '4px',
          }}
        >
          <Flame size={14} style={{ color: '#f59e0b' }} /> 快捷標的:
        </span>
        {quickPills.map((pill) => {
          const isCurrent = pill.symbol === selectedSymbol;
          return (
            <button
              key={pill.symbol}
              type="button"
              onClick={() => setSelectedSymbol(pill.symbol)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: isCurrent ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                background: isCurrent ? 'var(--accent-primary, #3b82f6)' : 'var(--bg-card)',
                color: isCurrent ? '#ffffff' : 'var(--text-primary)',
                border: isCurrent
                  ? '1px solid var(--accent-primary, #3b82f6)'
                  : '1px solid var(--border-color)',
                boxShadow: isCurrent ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
              }}
            >
              <span>{pill.name}</span>
              <span
                style={{
                  fontSize: '10px',
                  opacity: 0.8,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {pill.symbol}
              </span>
              {pill.isHolding && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isCurrent ? '#a7f3d0' : '#10b981',
                  }}
                  title="持倉中"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. 標的 Header 與搜尋切換列 (原生深色毛玻璃卡片) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.08))',
        }}
      >
        {/* 左側標的資訊 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {stockName}{' '}
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                    fontSize: '18px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  ({selectedSymbol})
                </span>
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {market === 'TW' ? '台股' : '美股'}
              </span>
              {isCurrentEtf && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  ETF 指數基金
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
                fontSize: '13px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>即時收盤價</span>
              <span
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--text-primary)',
                }}
              >
                {currentPrice.toFixed(2)} {market === 'TW' ? '元' : 'USD'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFollow}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: '1px solid',
              background: isFollowed ? 'var(--bg-secondary)' : 'var(--accent-primary, #3b82f6)',
              borderColor: isFollowed ? 'var(--border-color)' : 'var(--accent-primary, #3b82f6)',
              color: isFollowed ? 'var(--text-primary)' : '#ffffff',
            }}
          >
            {isFollowed ? (
              <>
                <Check size={14} style={{ color: '#10b981' }} /> 已追蹤
              </>
            ) : (
              <>
                <Plus size={14} /> 追蹤標的
              </>
            )}
          </button>
        </div>

        {/* 右側：持倉快速選單與搜尋 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {holdings.length > 0 && (
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                fontSize: '13px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '7px 10px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {holdings.map((h) => (
                <option key={h.symbol} value={h.symbol}>
                  {h.symbol} - {h.name || h.symbol}
                </option>
              ))}
            </select>
          )}

          {/* 搜尋自訂標的 */}
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="搜尋代碼 (如 2330, NVDA, IBM)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '200px',
                fontSize: '13px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '7px 12px 7px 32px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
              }}
            />
          </form>

          {/* 重新整理 */}
          <button
            type="button"
            onClick={loadDiagnosis}
            disabled={isLoading}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="重新評估健診"
          >
            <RefreshCw
              size={15}
              style={{
                animation: isLoading ? 'spin 1s linear infinite' : 'none',
                color: isLoading ? 'var(--accent-primary, #3b82f6)' : 'inherit',
              }}
            />
          </button>
        </div>
      </div>

      {/* 4. ETF 智慧防呆橫幅 (Amber Warning Banner) */}
      {isCurrentEtf && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '12px',
            padding: '16px 20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <AlertTriangle size={24} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b', marginBottom: '4px' }}>
              ⚠️ 注意：{stockName} ({selectedSymbol}) 為指數型基金 (ETF)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              本健診系統的 4 大核心幫手（包含營收毛利、自由現金流、營業利益率與資產負債）是針對「一般營運企業」的季報與年報量化分析。ETF 本身為一籃子投資組合，不具備傳統企業損益表與負債表，故財報數據可能顯示為無或無法適用。建議切換至個股檢驗真實營運體質：
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {POPULAR_STOCKS.slice(0, 4).map((stk) => (
                <button
                  key={stk.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(stk.symbol)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '5px 12px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.18)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  切換至 {stk.name} ({stk.symbol})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. 主版面：左側健診卡片流 (8) + 右側「深入了解」側邊欄 (4) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* 左側欄：4 大健診卡片流 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {isLoading && !diagnosis ? (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <RefreshCw
                size={32}
                style={{
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px auto',
                  color: 'var(--accent-primary, #3b82f6)',
                }}
              />
              <p style={{ fontSize: '14px', margin: 0 }}>正在深度分析歷史財務數據與量化指標...</p>
            </div>
          ) : (
            diagnosis?.categories.map((cat) => (
              <HealthCard
                key={cat.category}
                result={cat}
                onOpenReport={(res) => setActiveModalResult(res)}
              />
            ))
          )}
        </div>

        {/* 右側欄：深入了解 Q&A 側邊欄 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.08))',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <HelpCircle size={18} style={{ color: 'var(--accent-primary, #3b82f6)' }} />
              深入了解
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Q1 */}
              <div
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    公司整體體質如何？
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === 'q1' ? null : 'q1')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {activeFaq === 'q1' ? (
                      <>
                        收起 <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        查看 <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
                {activeFaq === 'q1' && (
                  <p
                    style={{
                      margin: '10px 0 0 0',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {diagnosis?.overallSummary ||
                      '整體健診利用 4 大核心幫手與 21 項量化指標，綜合檢驗現金流量真實度與估值區間。'}
                  </p>
                )}
              </div>

              {/* Q2 */}
              <div
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    健診指標有變化嗎？
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === 'q2' ? null : 'q2')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {activeFaq === 'q2' ? (
                      <>
                        收起 <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        查看 <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
                {activeFaq === 'q2' && (
                  <p
                    style={{
                      margin: '10px 0 0 0',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    指標依據最新滾動財務報表計算。若公司當季應收帳款天數或存貨天數出現異常攀升，排除地雷股指標將率先亮起紅燈警戒。
                  </p>
                )}
              </div>

              {/* Q3 */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    長期持有要注意什麼？
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === 'q3' ? null : 'q3')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {activeFaq === 'q3' ? (
                      <>
                        收起 <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        查看 <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
                {activeFaq === 'q3' && (
                  <p
                    style={{
                      margin: '10px 0 0 0',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    長期持有首重「自由現金流持續為正」與「穩定股利發放」。若定存股健診連續 5 年配息中斷，或便宜股估值脫離安全區間，建議重新審視資金配置。
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 四大核心幫手導航提示卡 */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '18px 20px',
            }}
          >
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: '0 0 10px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <TrendingUp size={16} style={{ color: '#10b981' }} />
              四大核心健診導航
            </h4>
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 16px',
                fontSize: '12px',
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
              }}
            >
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>排除地雷</strong>：杜絕虛增獲利與塞貨假帳
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>定存首選</strong>：鎖定殖利率與連續配息紀錄
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>動能成長</strong>：追蹤近一季損益 YoY 爆發力
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>價值便宜</strong>：掌握本益比 5 年低位分位數
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 6. 穿透式詳細報告彈窗 */}
      <HealthReportModal
        isOpen={activeModalResult !== null}
        onClose={() => setActiveModalResult(null)}
        result={activeModalResult}
        symbol={selectedSymbol}
        stockName={stockName}
      />
    </div>
  );
};

