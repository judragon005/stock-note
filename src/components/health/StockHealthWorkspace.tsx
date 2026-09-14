import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HeartPulse,
  Search,
  Plus,
  Check,
  HelpCircle,
  TrendingUp,
  RefreshCw,
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

export const StockHealthWorkspace: React.FC<StockHealthWorkspaceProps> = ({
  holdings,
  trades,
  currentPrices,
  fmpApiKey,
  finmindToken,
}) => {
  // 1. 預設選取持倉第一檔，若無持倉預設 '2330'
  const initialSymbol = useMemo(() => {
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
  const market: MarketType = selectedHolding?.market || (/^\d+$/.test(selectedSymbol) ? 'TW' : 'US');
  const stockName = selectedHolding?.name || selectedSymbol;
  const currentPrice = currentPrices[selectedSymbol] || selectedHolding?.currentPrice || 100;

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
      // 容錯防禦：即便外部 API 失敗亦計算備援診斷
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

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* 1. 頂部藍色導航橫幅 (對齊參考圖 Banner) */}
      {showBanner && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 text-white p-6 sm:p-8 shadow-lg shadow-blue-500/10">
          <div className="relative z-10 max-w-3xl space-y-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              歡迎使用股票健診幫手
            </h2>
            <p className="text-sm sm:text-base text-blue-50 leading-relaxed">
              我們設計了 7 個股票健診幫手，協助你快速了解公司是否值得投資。如果公司在下面的健診幫手表現都不錯，就值得作為優先研究標的。如果公司在某個健診表現不佳，就得注意：公司的財務是否出現了特定問題？
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleToggleBanner}
                className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 rounded-lg shadow-sm transition-colors focus:outline-none"
              >
                關閉說明
              </button>
            </div>
          </div>

          {/* 右側視覺插圖裝飾 */}
          <div className="absolute right-4 -bottom-6 sm:right-8 sm:top-1/2 sm:-translate-y-1/2 opacity-25 sm:opacity-90 pointer-events-none">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/40 shadow-inner">
              <HeartPulse className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* 2. 標的 Header 與搜尋切換列 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
        {/* 左側標的資訊 */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {stockName} <span className="text-slate-400 dark:text-slate-500 font-normal">({selectedSymbol})</span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {market === 'TW' ? '台股' : '美股'}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-sm mt-1">
              <span className="text-slate-500 dark:text-slate-400">收盤價</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {currentPrice.toFixed(2)} 元
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFollow}
            className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors ${
              isFollowed
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isFollowed ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" /> 已追蹤
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1" /> 追蹤
              </>
            )}
          </button>
        </div>

        {/* 右側：搜尋與快速切換 */}
        <div className="flex items-center space-x-2">
          {/* 持倉快速下拉 */}
          {holdings.length > 0 && (
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {holdings.map((h) => (
                <option key={h.symbol} value={h.symbol}>
                  {h.symbol} - {h.name || h.symbol}
                </option>
              ))}
            </select>
          )}

          {/* 搜尋自訂標的 */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="搜尋代碼 (如 IBM, AAPL, 2330)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-44 sm:w-56 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

          {/* 重新整理 */}
          <button
            type="button"
            onClick={loadDiagnosis}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
            title="重新評估健診"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. 主版面：左側健診卡片流 + 右側「深入了解」側邊欄 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左側 8 欄：4 大健診卡片流 */}
        <div className="lg:col-span-8 space-y-4">
          {isLoading && !diagnosis ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
              <p className="text-sm">正在深度分析 20 季歷史財務數據與指標...</p>
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

        {/* 右側 4 欄：深入了解側邊欄 (對齊參考圖右側欄) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
              <HelpCircle className="w-4 h-4 text-blue-500 mr-1.5" />
              深入了解
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Q1 */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    公司整體體質如何？
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === 'q1' ? null : 'q1')}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {activeFaq === 'q1' ? '收起' : '查看'}
                  </button>
                </div>
                {activeFaq === 'q1' && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    {diagnosis?.overallSummary ||
                      '整體健診利用 4 大核心幫手與 21 項量化指標，綜合檢驗現金流量真實度與估值區間。'}
                  </p>
                )}
              </div>

              {/* Q2 */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    健診指標有變化嗎？
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === 'q2' ? null : 'q2')}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {activeFaq === 'q2' ? '收起' : '查看'}
                  </button>
                </div>
                {activeFaq === 'q2' && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    指標依據最新 20 季財務報表滾動計算。若公司當季應收帳款天數或存貨天數出現異常攀升，排除地雷股指標將率先亮起未過標記。
                  </p>
                )}
              </div>

              {/* Q3 */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    長期持有要注意什麼？
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === 'q3' ? null : 'q3')}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {activeFaq === 'q3' ? '收起' : '查看'}
                  </button>
                </div>
                {activeFaq === 'q3' && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    長期持有首重「自由現金流持續為正」與「穩定股利發放」。若定存股健診連續 5 年配息中斷，或便宜股估值脫離區間，建議重新審視投資策略。
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 策略捷徑提示卡 */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-800/40 dark:to-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl p-5">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 text-emerald-500 mr-1.5" />
              四大核心幫手導航
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <li>• <strong>排除地雷</strong>：杜絕虛增獲利與塞貨假帳</li>
              <li>• <strong>定存首選</strong>：鎖定 6% 殖利率與連續配息</li>
              <li>• <strong>動能成長</strong>：追蹤近一季損益 YoY 爆發力</li>
              <li>• <strong>價值便宜</strong>：掌握 5 年低位分位數買點</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. 穿透式詳細報告彈窗 */}
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
