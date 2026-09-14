import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Megaphone,
  HeartPulse,
  FileText,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Scale,
  Sparkles,
  Search,
  RefreshCw,
  AlertTriangle,
  Flame,
  Check,
  Plus,
} from 'lucide-react';
import type { MarketType, HoldingPosition, TradeRecord } from '../../types/stock';
import type { HealthCheckCategoryResult, StockHealthDiagnosis } from '../../types/stockHealth';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';
import { computeStockHealthDiagnosis } from '../../utils/stockHealthDiagnosis';
import { loadOrFetchFinancialReport } from '../../engine/financialReportService';
import { HealthCard } from '../health/HealthCard';
import { HealthReportModal } from '../health/HealthReportModal';
import { isEtfSymbol } from '../health/StockHealthWorkspace';
import { AnalysisMetricView } from './AnalysisMetricView';
import { logger } from '../../utils/logger';

// 8 大一級主題
export type PrimaryCategoryKey =
  | 'news'
  | 'health'
  | 'statements'
  | 'profitability'
  | 'solvency'
  | 'growth'
  | 'valuation'
  | 'key_metrics';

// 二級子項目定義契約
export interface SubCategoryItem {
  id: string;
  label: string;
  badge?: string;
}

export const CATEGORY_TOPOLOGY: Record<
  PrimaryCategoryKey,
  { label: string; icon: React.ReactNode; items: SubCategoryItem[] }
> = {
  news: {
    label: '最新動態',
    icon: <Megaphone size={18} />,
    items: [
      { id: 'news_feed', label: '即時重大訊息' },
      { id: 'news_events', label: '重大事件日曆' },
    ],
  },
  health: {
    label: '股票健診',
    icon: <HeartPulse size={18} />,
    items: [
      { id: 'health_overview', label: '四大健診總覽' },
      { id: 'health_radar', label: '21項量化指標' },
    ],
  },
  statements: {
    label: '財務報表',
    icon: <FileText size={18} />,
    items: [
      { id: 'eps', label: '每股盈餘' },
      { id: 'bvps', label: '每股淨值' },
      { id: 'income_statement', label: '損益表' },
      { id: 'total_assets', label: '總資產' },
      { id: 'liabilities_equity', label: '負債和股東權益' },
      { id: 'cash_flow', label: '現金流量表' },
      { id: 'dividend_policy', label: '股利政策' },
      { id: 'reports_pdf', label: '電子書' },
    ],
  },
  profitability: {
    label: '獲利能力',
    icon: <DollarSign size={18} />,
    items: [
      { id: 'margins_trio', label: '利潤比率' },
      { id: 'opex_breakdown', label: '營業費用率拆解' },
      { id: 'non_op_ratio', label: '業外佔稅前淨利比例' },
      { id: 'roe_roa', label: 'ROE / ROA' },
      { id: 'dupont', label: '杜邦分析' },
      { id: 'turnover_capability', label: '經營週轉能力' },
      { id: 'turnover_days', label: '營運週轉天數' },
      { id: 'dividend_payout', label: '現金股利發放率' },
    ],
  },
  solvency: {
    label: '安全性分析',
    icon: <ShieldCheck size={18} />,
    items: [
      { id: 'capital_structure', label: '財務結構比率' },
      { id: 'liquidity_ratios', label: '流速動比率' },
      { id: 'interest_coverage', label: '利息保障倍數' },
      { id: 'cashflow_safety', label: '現金流量分析' },
      { id: 'cfo_to_net_income', label: '營業現金流對淨利比' },
      { id: 'reinvestment_rate', label: '盈餘再投資比率' },
    ],
  },
  growth: {
    label: '成長力分析',
    icon: <TrendingUp size={18} />,
    items: [
      { id: 'revenue_growth', label: '營收成長率' },
      { id: 'gross_profit_growth', label: '毛利成長率' },
      { id: 'operating_profit_growth', label: '營業利益成長率' },
      { id: 'net_income_growth', label: '稅後淨利成長率' },
      { id: 'eps_growth', label: '每股盈餘成長率' },
    ],
  },
  valuation: {
    label: '價值評估',
    icon: <Scale size={18} />,
    items: [
      { id: 'pe_valuation', label: '本益比評價' },
      { id: 'pe_river', label: '本益比河流圖' },
      { id: 'pb_valuation', label: '股價淨值比評價' },
      { id: 'pb_river', label: '股價淨值比河流圖' },
      { id: 'dividend_yield', label: '現金股利殖利率' },
      { id: 'avg_dividend_yield', label: '平均現金股息殖利率' },
      { id: 'dividend_river', label: '平均現金股息河流圖' },
    ],
  },
  key_metrics: {
    label: '關鍵指標',
    icon: <Sparkles size={18} />,
    items: [
      { id: 'fcf_yield', label: '自由現金流報酬率' },
      { id: 'piotroski_f', label: 'Piotroski F 分數' },
      { id: 'debt_structure', label: '長短期金融借款' },
      { id: 'cash_conversion', label: '現金週轉循環' },
      { id: 'peter_lynch', label: '彼得林區評價' },
      { id: 'ddm_valuation', label: '股利折現評價' },
      { id: 'dcf_valuation', label: '現金流折現評價' },
    ],
  },
};

// 熱門權值快捷候選標的
const POPULAR_STOCKS = [
  { symbol: '2330', name: '台積電', market: 'TW' as const },
  { symbol: '2454', name: '聯發科', market: 'TW' as const },
  { symbol: '2317', name: '鴻海', market: 'TW' as const },
  { symbol: 'NVDA', name: '輝達', market: 'US' as const },
  { symbol: 'AAPL', name: '蘋果', market: 'US' as const },
  { symbol: 'IBM', name: 'IBM', market: 'US' as const },
];

interface StockAnalysisWorkspaceProps {
  holdings: HoldingPosition[];
  trades: TradeRecord[];
  currentPrices: Record<string, number>;
  fmpApiKey?: string;
  finmindToken?: string;
  usdToTwdRate?: number;
}

export const StockAnalysisWorkspace: React.FC<StockAnalysisWorkspaceProps> = ({
  holdings,
  trades,
  currentPrices,
  fmpApiKey,
  finmindToken,
}) => {
  // 1. 預設標的優先選擇非 ETF 普通股
  const initialSymbol = useMemo(() => {
    const normalHolding = holdings.find((h) => !isEtfSymbol(h.symbol));
    if (normalHolding) return normalHolding.symbol;
    if (holdings.length > 0) return holdings[0].symbol;
    return '2330';
  }, [holdings]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [searchInput, setSearchInput] = useState<string>('');

  // 雙層選單導航狀態
  const [primaryTab, setPrimaryTab] = useState<PrimaryCategoryKey>('statements');
  const [subTab, setSubTab] = useState<string>('eps');

  // 健診與財報數據狀態
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [diagnosis, setDiagnosis] = useState<StockHealthDiagnosis | null>(null);
  const [financialRecords, setFinancialRecords] = useState<QuarterlyFinancialRecord[]>([]);
  const [activeModalResult, setActiveModalResult] = useState<HealthCheckCategoryResult | null>(null);

  // 追蹤清單狀態
  const [watchList, setWatchList] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('stock_analysis_watchlist') || '[]');
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
      localStorage.setItem('stock_analysis_watchlist', JSON.stringify(next));
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

  // 載入財報數據
  const loadData = useCallback(async () => {
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
      setFinancialRecords(records);

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
      logger.error('StockAnalysisWorkspace loadData failed', err);
      setFinancialRecords([]);
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
    loadData();
  }, [loadData]);

  // 標的搜尋切換提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (clean) {
      setSelectedSymbol(clean);
      setSearchInput('');
    }
  };

  // 當切換一級分類時，預設選取該分類的第一個二級項目
  const handlePrimaryTabChange = (key: PrimaryCategoryKey) => {
    setPrimaryTab(key);
    const firstSub = CATEGORY_TOPOLOGY[key].items[0];
    if (firstSub) {
      setSubTab(firstSub.id);
    }
  };

  // 統合快捷膠囊 (持倉 + 熱門標的，嚴格 Set 去重)
  const quickPills = useMemo(() => {
    const pills: Array<{ symbol: string; name: string; isHolding?: boolean }> = [];
    const seen = new Set<string>();

    holdings.forEach((h) => {
      if (!seen.has(h.symbol)) {
        seen.add(h.symbol);
        pills.push({ symbol: h.symbol, name: h.name || h.symbol, isHolding: true });
      }
    });

    POPULAR_STOCKS.forEach((p) => {
      if (!seen.has(p.symbol)) {
        seen.add(p.symbol);
        pills.push(p);
      }
    });

    return pills;
  }, [holdings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '48px' }}>
      {/* 1. 快捷標的膠囊列 (Stock Pills) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
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

      {/* 2. 標的 Header (原生深色毛玻璃卡片) */}
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

        {/* 右側：持倉快速選單、代碼搜尋與重新整理 */}
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

          <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="搜尋代碼 (如 2330, NVDA, IBM)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '190px',
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

          <button
            type="button"
            onClick={loadData}
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
            title="重新載入財報"
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

      {/* 3. ETF 智慧防呆橫幅 */}
      {isCurrentEtf && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '12px',
            padding: '14px 18px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <AlertTriangle size={22} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b', marginBottom: '2px' }}>
              ⚠️ 注意：{stockName} ({selectedSymbol}) 為指數型基金 (ETF)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              ETF 本身為一籃子投資組合，不具備一般企業損益表與資產負債表。建議點擊切換至個股檢視深度財務報表與量化估值：
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {POPULAR_STOCKS.slice(0, 4).map((stk) => (
                <button
                  key={stk.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(stk.symbol)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.18)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#f59e0b',
                    cursor: 'pointer',
                  }}
                >
                  切換至 {stk.name} ({stk.symbol})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. 核心雙層導航工作台佈局 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '110px 170px minmax(0, 1fr)',
          gap: '16px',
          alignItems: 'start',
          minHeight: '680px',
        }}
      >
        {/* Tier 1: 第一層側邊欄 (8 大主題) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '8px 6px',
          }}
        >
          {(Object.keys(CATEGORY_TOPOLOGY) as PrimaryCategoryKey[]).map((catKey) => {
            const cat = CATEGORY_TOPOLOGY[catKey];
            const isSelected = primaryTab === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => handlePrimaryTabChange(catKey)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px 4px',
                  borderRadius: '10px',
                  border: isSelected
                    ? '1px solid var(--accent-primary, #3b82f6)'
                    : '1px solid transparent',
                  background: isSelected
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'transparent',
                  color: isSelected
                    ? 'var(--accent-primary, #3b82f6)'
                    : 'var(--text-secondary)',
                  fontWeight: isSelected ? 800 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* 側邊高亮發光條 */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '2px',
                      top: '20%',
                      bottom: '20%',
                      width: '3px',
                      borderRadius: '2px',
                      background: 'var(--accent-primary, #3b82f6)',
                    }}
                  />
                )}
                <div>{cat.icon}</div>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tier 2: 第二層側邊欄 (二級子清單) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '10px 8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--text-secondary)',
              padding: '6px 10px 10px 10px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '6px',
            }}
          >
            {CATEGORY_TOPOLOGY[primaryTab].label}
          </div>

          {CATEGORY_TOPOLOGY[primaryTab].items.map((subItem) => {
            const isSubSelected = subTab === subItem.id;
            return (
              <button
                key={subItem.id}
                type="button"
                onClick={() => setSubTab(subItem.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: isSubSelected
                    ? '1px solid var(--accent-primary, #3b82f6)'
                    : '1px solid transparent',
                  background: isSubSelected
                    ? 'rgba(59, 130, 246, 0.12)'
                    : 'transparent',
                  color: isSubSelected
                    ? 'var(--accent-primary, #3b82f6)'
                    : 'var(--text-primary)',
                  fontWeight: isSubSelected ? 700 : 500,
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{subItem.label}</span>
                {isSubSelected && (
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: 'var(--accent-primary, #3b82f6)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 主視圖區域 (Main Viewport) */}
        <div style={{ minWidth: 0 }}>
          {/* A. 股票健診子分頁 (無縫複用 4 大幫手與 21 項指標) */}
          {primaryTab === 'health' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          ) : (
            /* B. 其他維度之圖表與分析掛載容器 (Ticket 03~07 將在此處渲染專屬視覺模組) */
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '24px',
                boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.08))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    {CATEGORY_TOPOLOGY[primaryTab].label} ·{' '}
                    {
                      CATEGORY_TOPOLOGY[primaryTab].items.find((i) => i.id === subTab)
                        ?.label
                    }
                  </h2>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {stockName} ({selectedSymbol}) 20 季歷史深度量化模型分析
                  </p>
                </div>
              </div>

              {/* 渲染深度指標與量化估值視圖 */}
              <AnalysisMetricView
                primaryTab={primaryTab}
                subTab={subTab}
                records={financialRecords}
                currentPrice={currentPrice}
                annualDividends={annualDividends}
                stockName={stockName}
                symbol={selectedSymbol}
              />
            </div>
          )}
        </div>
      </div>

      {/* 5. 穿透式詳細健診報告彈窗 */}
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
