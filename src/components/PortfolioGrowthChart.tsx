import React, { useState, useMemo } from 'react';
import {
  PortfolioDailySnapshot,
  TimeRangeFilter,
  PortfolioPerformanceMetrics,
  Currency,
  CashTransaction,
  BenchmarkType,
} from '../types/stock';
import {
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Scale,
  Zap,
  Activity,
  Compass,
  HelpCircle,
} from 'lucide-react';
import { filterNavSeriesByRange, calculatePerformanceMetrics } from '../engine/historicalNav';
import {
  getBenchmarkDailyPrices,
  alignBenchmarkTimeSeries,
  calculateNormalizedGrowth,
  calculate5050BalancedGrowth,
} from '../engine/benchmarkData';
import { calculateQuantMetrics, getQuantMetricDiagnosis } from '../engine/quantMetrics';
import { QuantMetricId } from '../types/stock';

interface PortfolioGrowthChartProps {
  series: PortfolioDailySnapshot[];
  cashTransactions?: CashTransaction[];
  baseCurrency?: Currency;
  isSyncing?: boolean;
  syncProgressText?: string;
  onRefreshHistory?: () => void;
  onInspectXirr?: () => void;
}

export const PortfolioGrowthChart: React.FC<PortfolioGrowthChartProps> = ({
  series,
  cashTransactions = [],
  baseCurrency = 'TWD',
  isSyncing = false,
  syncProgressText = '',
  onRefreshHistory,
  onInspectXirr,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [benchmarkType, setBenchmarkType] = useState<BenchmarkType>('NONE');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeTooltipMetric, setActiveTooltipMetric] = useState<QuantMetricId | null>(null);

  // 曲線顯示開關
  const [visibleLines, setVisibleLines] = useState({
    nav: true,
    costBasis: true,
    stockValue: false,
    cash: false,
    loan: false,
  });

  // 依時間維度篩選後的序列
  const filteredSeries = useMemo(() => {
    return filterNavSeriesByRange(series, timeRange);
  }, [series, timeRange]);

  // 績效指標計算 (含 XIRR)
  const metrics: PortfolioPerformanceMetrics = useMemo(() => {
    return calculatePerformanceMetrics(filteredSeries, cashTransactions, baseCurrency);
  }, [filteredSeries, cashTransactions, baseCurrency]);

  // 大盤基準與量化指標計算 (Alpha, Beta, Sharpe, MDD)
  const { benchmarkGrowth, quantMetrics, benchmarkLabel } = useMemo(() => {
    const dates = filteredSeries.map((s) => s.date);
    const navPrices = filteredSeries.map((s) => s.totalNAV);
    const pGrowth = calculateNormalizedGrowth(navPrices);

    if (filteredSeries.length === 0 || benchmarkType === 'NONE') {
      return {
        benchmarkGrowth: [],
        quantMetrics: calculateQuantMetrics(pGrowth, [], 1.5),
        benchmarkLabel: '',
      };
    }

    let bGrowth: number[] = [];
    let label = '';

    if (benchmarkType === '0050') {
      label = '🇹🇼 0050 元大台灣50';
      const raw = getBenchmarkDailyPrices('0050');
      const aligned = alignBenchmarkTimeSeries(dates, raw);
      bGrowth = calculateNormalizedGrowth(aligned);
    } else if (benchmarkType === 'SPY') {
      label = '🇺🇸 SPY 標普500 ETF';
      const raw = getBenchmarkDailyPrices('SPY');
      const aligned = alignBenchmarkTimeSeries(dates, raw);
      bGrowth = calculateNormalizedGrowth(aligned);
    } else if (benchmarkType === 'BALANCED_50_50') {
      label = '⚖️ 50/50 台美股債平衡';
      const raw0050 = getBenchmarkDailyPrices('0050');
      const rawSPY = getBenchmarkDailyPrices('SPY');
      const g0050 = calculateNormalizedGrowth(alignBenchmarkTimeSeries(dates, raw0050));
      const gSPY = calculateNormalizedGrowth(alignBenchmarkTimeSeries(dates, rawSPY));
      bGrowth = calculate5050BalancedGrowth(g0050, gSPY);
    }

    const qMetrics = calculateQuantMetrics(pGrowth, bGrowth, 1.5);

    return {
      benchmarkGrowth: bGrowth,
      quantMetrics: qMetrics,
      benchmarkLabel: label,
    };
  }, [filteredSeries, benchmarkType]);

  // 5 大量化指標之深度原理與即時診斷
  const quantDiagnosis = useMemo(() => {
    return getQuantMetricDiagnosis(quantMetrics, benchmarkLabel);
  }, [quantMetrics, benchmarkLabel]);

  // 當前 Hover 的數據點 (若無 Hover 則預設最新一筆)
  const activeSnapshot = useMemo(() => {
    if (filteredSeries.length === 0) return null;
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < filteredSeries.length) {
      return filteredSeries[hoverIndex];
    }
    return filteredSeries[filteredSeries.length - 1];
  }, [filteredSeries, hoverIndex]);

  // 計算 SVG 座標與比例
  const { pathNav, pathCost, pathStock, pathCash, pathLoan, pathBenchmark, areaNav, minVal, maxVal, width, height, padding } =
    useMemo(() => {
      const w = 1000;
      const h = 400;
      const pad = { top: 30, right: 30, bottom: 40, left: 70 };

      if (filteredSeries.length === 0) {
        return {
          pathNav: '',
          pathCost: '',
          pathStock: '',
          pathCash: '',
          pathLoan: '',
          pathBenchmark: '',
          areaNav: '',
          minVal: 0,
          maxVal: 100,
          width: w,
          height: h,
          padding: pad,
        };
      }

      let min = Infinity;
      let max = -Infinity;

      filteredSeries.forEach((pt) => {
        if (visibleLines.nav) {
          min = Math.min(min, pt.totalNAV);
          max = Math.max(max, pt.totalNAV);
        }
        if (visibleLines.costBasis) {
          min = Math.min(min, pt.netCostBasis);
          max = Math.max(max, pt.netCostBasis);
        }
        if (visibleLines.stockValue) {
          min = Math.min(min, pt.stockMarketValue);
          max = Math.max(max, pt.stockMarketValue);
        }
        if (visibleLines.cash) {
          min = Math.min(min, pt.cashBalance);
          max = Math.max(max, pt.cashBalance);
        }
        if (visibleLines.loan) {
          min = Math.min(min, pt.loanBalance);
          max = Math.max(max, pt.loanBalance);
        }
      });

      if (min === Infinity || max === -Infinity || min === max) {
        min = Math.min(0, min);
        max = max === -Infinity ? 100000 : max * 1.1;
      } else {
        const span = max - min;
        min = Math.max(0, min - span * 0.05);
        max = max + span * 0.08;
      }

      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;

      const getX = (index: number) => {
        if (filteredSeries.length === 1) return pad.left + plotW / 2;
        return pad.left + (index / (filteredSeries.length - 1)) * plotW;
      };

      const getY = (val: number) => {
        const ratio = (val - min) / (max - min);
        return pad.top + plotH - ratio * plotH;
      };

      const buildPath = (values: number[]) => {
        return values
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`)
          .join(' ');
      };

      // 產生基準折線 (若是基準模式，將基準等比對齊自身 NAV 起始高度繪製)
      let pBenchmark = '';
      if (benchmarkType !== 'NONE' && benchmarkGrowth.length > 0) {
        const initialNav = filteredSeries[0]?.totalNAV || 1;
        const bScaled = benchmarkGrowth.map((g) => (g / 100) * initialNav);
        pBenchmark = buildPath(bScaled);
      }

      return {
        pathNav: buildPath(filteredSeries.map((d) => d.totalNAV)),
        pathCost: buildPath(filteredSeries.map((d) => d.netCostBasis)),
        pathStock: buildPath(filteredSeries.map((d) => d.stockMarketValue)),
        pathCash: buildPath(filteredSeries.map((d) => d.cashBalance)),
        pathLoan: buildPath(filteredSeries.map((d) => d.loanBalance)),
        pathBenchmark: pBenchmark,
        areaNav:
          filteredSeries.length > 0
            ? `${buildPath(filteredSeries.map((d) => d.totalNAV))} L ${getX(filteredSeries.length - 1).toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`
            : '',
        minVal: min,
        maxVal: max,
        width: w,
        height: h,
        padding: pad,
      };
    }, [filteredSeries, visibleLines, benchmarkType, benchmarkGrowth]);


  if (series.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <TrendingUp size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>尚無足夠的歷史淨值數據</h3>
        <p style={{ fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
          當您在系統中新增買賣交易或現金出入金記錄後，系統將自動為您繪製全歷史的每日資產淨值（NAV）走勢折線圖。
        </p>
      </div>
    );
  }

  const currencySymbol = baseCurrency === 'USD' ? '$' : 'NT$';

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* 1. 頂部標題列與操作按鈕 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              資產成長與全歷史淨值 (NAV)
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              公式口徑：持股市值 + 現金餘額 - 借貸負債
            </span>
          </div>
        </div>

        {/* 週期篩選器與同步按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* 基準對照選單 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(30, 41, 59, 0.6)',
              padding: '3px 6px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={13} color="#a855f7" /> 基準:
            </span>
            {(
              [
                { key: 'NONE', label: '無' },
                { key: '0050', label: '🇹🇼 0050' },
                { key: 'SPY', label: '🇺🇸 SPY' },
                { key: 'BALANCED_50_50', label: '⚖️ 50/50' },
              ] as const
            ).map((b) => (
              <button
                key={b.key}
                onClick={() => setBenchmarkType(b.key)}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: benchmarkType === b.key ? '#a855f7' : 'transparent',
                  color: benchmarkType === b.key ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              background: 'rgba(30, 41, 59, 0.6)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            {(['1M', '3M', '6M', '1Y', 'YTD', 'ALL'] as TimeRangeFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: timeRange === r ? 'var(--primary-color)' : 'transparent',
                  color: timeRange === r ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {onRefreshHistory && (
            <button
              onClick={onRefreshHistory}
              disabled={isSyncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid var(--border-color)',
                color: isSyncing ? '#94a3b8' : '#38bdf8',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
              }}
              title="重新同步最新歷史日 K 收盤價與匯率"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? syncProgressText || '同步中...' : '同步日 K'}
            </button>
          )}
        </div>
      </div>

      {/* 2. 關鍵統計指標卡片欄 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* 當前總淨值 (NAV) */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {activeSnapshot ? `${activeSnapshot.date} 淨資產 (NAV)` : '當前淨資產 (NAV)'}
          </div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>
            {currencySymbol}
            {activeSnapshot ? activeSnapshot.totalNAV.toLocaleString() : metrics.currentNAV.toLocaleString()}
          </div>
          {activeSnapshot && activeSnapshot.dailyPnL !== undefined && (
            <div
              style={{
                fontSize: '0.75rem',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: activeSnapshot.dailyPnL >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
              }}
            >
              {activeSnapshot.dailyPnL >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>
                {activeSnapshot.dailyPnL >= 0 ? '+' : ''}
                {activeSnapshot.dailyPnL.toLocaleString()} ({activeSnapshot.dailyReturnPercent}%)
              </span>
            </div>
          )}
        </div>

        {/* 累計投入本金 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>累計投入本金</div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b' }}>
            {currencySymbol}
            {activeSnapshot ? activeSnapshot.netCostBasis.toLocaleString() : metrics.netCostBasis.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            本金超額比率: {activeSnapshot && activeSnapshot.netCostBasis > 0
              ? `${((activeSnapshot.totalNAV / activeSnapshot.netCostBasis) * 100).toFixed(1)}%`
              : '-'}
          </div>
        </div>

        {/* 累計總報酬與報酬率 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>全期累計總損益</div>
          <div
            className="mono"
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: (activeSnapshot?.cumulativeReturnPnL || 0) >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
            }}
          >
            {(activeSnapshot?.cumulativeReturnPnL || 0) >= 0 ? '+' : ''}
            {currencySymbol}
            {activeSnapshot ? activeSnapshot.cumulativeReturnPnL.toLocaleString() : metrics.totalProfitPnL.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: (activeSnapshot?.cumulativeReturnPercent || 0) >= 0 ? 'var(--gain-color)' : 'var(--loss-color)', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {(activeSnapshot?.cumulativeReturnPercent || 0) >= 0 ? '+' : ''}
              {activeSnapshot ? activeSnapshot.cumulativeReturnPercent.toFixed(2) : metrics.totalReturnPercent.toFixed(2)}%
            </span>
            {metrics.xirrPercent !== undefined && (
              <span style={{ fontSize: '0.72rem', color: metrics.xirrPercent >= 0 ? 'var(--gain-color)' : 'var(--loss-color)' }}>
                XIRR: {metrics.xirrPercent >= 0 ? '+' : ''}{metrics.xirrPercent.toFixed(2)}%
                {!metrics.isXirrAnnualized && <span style={{ color: '#f59e0b', marginLeft: '2px' }} title="未滿 30 天非年化">*</span>}
              </span>
            )}
          </div>
        </div>

        {/* 歷史最高 (ATH) 與最大回撤 (MDD) */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            最高淨值 (ATH) / 最大回撤 (MDD)
          </div>
          <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
            {currencySymbol}{metrics.allTimeHighNAV.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '4px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>最大回撤: -{metrics.maxDrawdownPercent.toFixed(1)}%</span>
            {onInspectXirr && (
              <button
                onClick={onInspectXirr}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="點擊透視此週期之歷史現金流"
              >
                透視金流
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 曲線顯示切換開關 (Toggles) */}
      <div
        style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '14px',
          fontSize: '0.8rem',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>曲線顯示:</span>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#10b981', fontWeight: 700 }}>
          <input
            type="checkbox"
            checked={visibleLines.nav}
            onChange={(e) => setVisibleLines((v) => ({ ...v, nav: e.target.checked }))}
          />
          <span style={{ width: '10px', height: '3px', background: '#10b981', display: 'inline-block', borderRadius: '2px' }} />
          總資產淨值 (NAV)
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#f59e0b', fontWeight: 700 }}>
          <input
            type="checkbox"
            checked={visibleLines.costBasis}
            onChange={(e) => setVisibleLines((v) => ({ ...v, costBasis: e.target.checked }))}
          />
          <span style={{ width: '10px', height: '3px', background: '#f59e0b', display: 'inline-block', borderRadius: '2px' }} />
          累計投入本金 (Cost Basis)
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#3b82f6', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={visibleLines.stockValue}
            onChange={(e) => setVisibleLines((v) => ({ ...v, stockValue: e.target.checked }))}
          />
          <span style={{ width: '10px', height: '3px', background: '#3b82f6', display: 'inline-block', borderRadius: '2px' }} />
          純持股市值
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#06b6d4', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={visibleLines.cash}
            onChange={(e) => setVisibleLines((v) => ({ ...v, cash: e.target.checked }))}
          />
          <span style={{ width: '10px', height: '3px', background: '#06b6d4', display: 'inline-block', borderRadius: '2px' }} />
          現金水位
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#f43f5e', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={visibleLines.loan}
            onChange={(e) => setVisibleLines((v) => ({ ...v, loan: e.target.checked }))}
          />
          <span style={{ width: '10px', height: '3px', background: '#f43f5e', display: 'inline-block', borderRadius: '2px' }} />
          借貸負債
        </label>
      </div>

      {/* 4. 向量 SVG 折線圖主體 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: 'rgba(10, 15, 29, 0.6)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const plotW = width - padding.left - padding.right;
            const relativeX = (mouseX / rect.width) * width - padding.left;
            const ratio = Math.max(0, Math.min(1, relativeX / plotW));
            const idx = Math.round(ratio * (filteredSeries.length - 1));
            setHoverIndex(idx);
          }}
        >
          <defs>
            <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="navStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* 網格背景線 */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => {
            const y = padding.top + (height - padding.top - padding.bottom) * r;
            const val = maxVal - (maxVal - minVal) * r;
            return (
              <g key={r}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(51, 65, 85, 0.3)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* X 軸日期刻度 */}
          {filteredSeries.length > 0 &&
            [0, 0.25, 0.5, 0.75, 1].map((r) => {
              const idx = Math.min(
                filteredSeries.length - 1,
                Math.floor(r * (filteredSeries.length - 1))
              );
              const pt = filteredSeries[idx];
              const plotW = width - padding.left - padding.right;
              const x = padding.left + (idx / Math.max(1, filteredSeries.length - 1)) * plotW;
              return (
                <text
                  key={r}
                  x={x}
                  y={height - 12}
                  fill="#64748b"
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {pt?.date.slice(5)}
                </text>
              );
            })}

          {/* 曲線陰影填充 */}
          {visibleLines.nav && areaNav && <path d={areaNav} fill="url(#navGradient)" />}

          {/* 基準對照折線 (紫金色虛線) */}
          {benchmarkType !== 'NONE' && pathBenchmark && (
            <path
              d={pathBenchmark}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              strokeOpacity="0.9"
            />
          )}

          {/* 各條折線 */}
          {visibleLines.stockValue && pathStock && (
            <path d={pathStock} fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.8" />
          )}
          {visibleLines.cash && pathCash && (
            <path d={pathCash} fill="none" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.8" />
          )}
          {visibleLines.loan && pathLoan && (
            <path d={pathLoan} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" strokeOpacity="0.8" />
          )}
          {visibleLines.costBasis && pathCost && (
            <path d={pathCost} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 5" />
          )}
          {visibleLines.nav && pathNav && (
            <path d={pathNav} fill="none" stroke="url(#navStroke)" strokeWidth="3.5" strokeLinecap="round" />
          )}

          {/* 十字準心 Hover Crosshair */}
          {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < filteredSeries.length && (
            <g>
              {(() => {
                const plotW = width - padding.left - padding.right;
                const x = padding.left + (hoverIndex / Math.max(1, filteredSeries.length - 1)) * plotW;
                const pt = filteredSeries[hoverIndex];
                const plotH = height - padding.top - padding.bottom;
                const navY = padding.top + plotH - ((pt.totalNAV - minVal) / (maxVal - minVal)) * plotH;

                return (
                  <>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    {visibleLines.nav && (
                      <circle cx={x} cy={navY} r="5" fill="#10b981" stroke="#fff" strokeWidth="2" />
                    )}
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* 4.1 當日事件標籤與備註 (常駐置頂) */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '8px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
          📅 {activeSnapshot ? activeSnapshot.date : '當前'} 當日異動事件 ({activeSnapshot?.events ? activeSnapshot.events.length : 0})：
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {activeSnapshot?.events && activeSnapshot.events.length > 0 ? (
            activeSnapshot.events.map((ev, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-color)',
                  color: '#e2e8f0',
                }}
              >
                {ev}
              </span>
            ))
          ) : (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: '#94a3b8',
              }}
            >
              無
            </span>
          )}
        </div>
      </div>

      {/* 4.2 機構級量化風控看板 (常駐置底 & 混合智能模式) */}
      {quantMetrics && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="#c084fc" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3e8ff' }}>
                {quantMetrics.hasBenchmark
                  ? `🏆 機構級量化風控與超額報酬看板 (對照 ${benchmarkLabel})`
                  : '🏆 機構級量化風控看板 (目前未設定基準對照)'}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#a855f7' }}>
              {quantMetrics.hasBenchmark
                ? `紫虛線：${benchmarkLabel} 走勢對照`
                : '提示：切換上方 🇹🇼 0050 / 🇺🇸 SPY 可解鎖 Alpha & Beta 超額指標'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
            }}
            onClick={() => setActiveTooltipMetric(null)}
          >
            {/* 1. Alpha */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: activeTooltipMetric === 'alpha' ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(16, 185, 129, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTooltipMetric === 'alpha' ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none',
              }}
              onMouseEnter={() => setActiveTooltipMetric('alpha')}
              onMouseLeave={() => setActiveTooltipMetric((prev) => (prev === 'alpha' ? null : prev))}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTooltipMetric((prev) => (prev === 'alpha' ? null : 'alpha'));
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={13} color="#10b981" /> 詹森阿爾法 (Alpha)
                </span>
                <HelpCircle size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: quantMetrics.alpha !== null ? (quantMetrics.alpha >= 0 ? 'var(--gain-color)' : 'var(--loss-color)') : 'var(--text-muted)',
                }}
              >
                {quantMetrics.alpha !== null ? `${quantMetrics.alpha >= 0 ? '+' : ''}${quantMetrics.alpha.toFixed(2)}%` : '無對應'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {quantMetrics.hasBenchmark ? '超越基準之超額年化報酬' : '需設定大盤基準'}
              </div>

              {/* Alpha Tooltip (靠左防溢出) */}
              {activeTooltipMetric === 'alpha' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '0',
                    width: '290px',
                    background: 'rgba(15, 23, 42, 0.97)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    zIndex: 100,
                    pointerEvents: 'none',
                    textAlign: 'left',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  {/* 上層：原理層 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f3e8ff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Award size={14} color="#10b981" /> {quantDiagnosis.alpha.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {quantDiagnosis.alpha.formula}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '6px' }}>
                    {quantDiagnosis.alpha.definition}
                  </div>
                  {quantDiagnosis.alpha.benchmarkNote && (
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.04)', padding: '3px 6px', borderRadius: '4px', marginBottom: '8px' }}>
                      📌 {quantDiagnosis.alpha.benchmarkNote}
                    </div>
                  )}

                  {/* 分隔線 */}
                  <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '6px 0' }} />

                  {/* 下層：即時診斷層 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: quantDiagnosis.alpha.badgeColor,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {quantDiagnosis.alpha.levelBadge}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#f1f5f9', lineHeight: '1.35', fontWeight: 600 }}>
                      {quantDiagnosis.alpha.summary}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginTop: '6px', lineHeight: '1.35' }}>
                    💡 <span style={{ fontWeight: 600 }}>策略建議：</span>{quantDiagnosis.alpha.suggestion}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Beta */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: activeTooltipMetric === 'beta' ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(59, 130, 246, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTooltipMetric === 'beta' ? '0 0 12px rgba(59, 130, 246, 0.25)' : 'none',
              }}
              onMouseEnter={() => setActiveTooltipMetric('beta')}
              onMouseLeave={() => setActiveTooltipMetric((prev) => (prev === 'beta' ? null : prev))}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTooltipMetric((prev) => (prev === 'beta' ? null : 'beta'));
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Scale size={13} color="#60a5fa" /> 貝塔係數 (Beta)
                </span>
                <HelpCircle size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: quantMetrics.beta !== null ? '#60a5fa' : 'var(--text-muted)',
                }}
              >
                {quantMetrics.beta !== null ? quantMetrics.beta.toFixed(2) : '無對應'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {quantMetrics.correlation !== null
                  ? `相關度 r = ${quantMetrics.correlation.toFixed(2)}`
                  : '相關度 r = 無對應'}
              </div>

              {/* Beta Tooltip (居中) */}
              {activeTooltipMetric === 'beta' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '290px',
                    background: 'rgba(15, 23, 42, 0.97)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    zIndex: 100,
                    pointerEvents: 'none',
                    textAlign: 'left',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  {/* 上層：原理層 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f3e8ff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Scale size={14} color="#60a5fa" /> {quantDiagnosis.beta.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {quantDiagnosis.beta.formula}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '6px' }}>
                    {quantDiagnosis.beta.definition}
                  </div>
                  {quantDiagnosis.beta.benchmarkNote && (
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.04)', padding: '3px 6px', borderRadius: '4px', marginBottom: '8px' }}>
                      📌 {quantDiagnosis.beta.benchmarkNote}
                    </div>
                  )}

                  {/* 分隔線 */}
                  <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '6px 0' }} />

                  {/* 下層：即時診斷層 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: quantDiagnosis.beta.badgeColor,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {quantDiagnosis.beta.levelBadge}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#f1f5f9', lineHeight: '1.35', fontWeight: 600 }}>
                      {quantDiagnosis.beta.summary}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginTop: '6px', lineHeight: '1.35' }}>
                    💡 <span style={{ fontWeight: 600 }}>策略建議：</span>{quantDiagnosis.beta.suggestion}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Sharpe Ratio */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: activeTooltipMetric === 'sharpe' ? '1px solid rgba(245, 158, 11, 0.6)' : '1px solid rgba(245, 158, 11, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTooltipMetric === 'sharpe' ? '0 0 12px rgba(245, 158, 11, 0.25)' : 'none',
              }}
              onMouseEnter={() => setActiveTooltipMetric('sharpe')}
              onMouseLeave={() => setActiveTooltipMetric((prev) => (prev === 'sharpe' ? null : prev))}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTooltipMetric((prev) => (prev === 'sharpe' ? null : 'sharpe'));
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={13} color="#fbbf24" /> 夏普值 (Sharpe)
                </span>
                <HelpCircle size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: quantMetrics.sharpeRatio >= 1 ? '#34d399' : '#fbbf24',
                }}
              >
                {quantMetrics.sharpeRatio !== 0 ? quantMetrics.sharpeRatio.toFixed(2) : '無'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                無風險利率基準 1.5%
              </div>

              {/* Sharpe Tooltip (居中) */}
              {activeTooltipMetric === 'sharpe' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '290px',
                    background: 'rgba(15, 23, 42, 0.97)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    zIndex: 100,
                    pointerEvents: 'none',
                    textAlign: 'left',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  {/* 上層：原理層 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f3e8ff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Zap size={14} color="#fbbf24" /> {quantDiagnosis.sharpe.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {quantDiagnosis.sharpe.formula}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '6px' }}>
                    {quantDiagnosis.sharpe.definition}
                  </div>
                  {quantDiagnosis.sharpe.benchmarkNote && (
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.04)', padding: '3px 6px', borderRadius: '4px', marginBottom: '8px' }}>
                      📌 {quantDiagnosis.sharpe.benchmarkNote}
                    </div>
                  )}

                  {/* 分隔線 */}
                  <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '6px 0' }} />

                  {/* 下層：即時診斷層 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: quantDiagnosis.sharpe.badgeColor,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {quantDiagnosis.sharpe.levelBadge}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#f1f5f9', lineHeight: '1.35', fontWeight: 600 }}>
                      {quantDiagnosis.sharpe.summary}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginTop: '6px', lineHeight: '1.35' }}>
                    💡 <span style={{ fontWeight: 600 }}>策略建議：</span>{quantDiagnosis.sharpe.suggestion}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Max Drawdown */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: activeTooltipMetric === 'mdd' ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(239, 68, 68, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTooltipMetric === 'mdd' ? '0 0 12px rgba(239, 68, 68, 0.25)' : 'none',
              }}
              onMouseEnter={() => setActiveTooltipMetric('mdd')}
              onMouseLeave={() => setActiveTooltipMetric((prev) => (prev === 'mdd' ? null : prev))}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTooltipMetric((prev) => (prev === 'mdd' ? null : 'mdd'));
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendingUp size={13} color="#f87171" /> 最大回撤 (MDD)
                </span>
                <HelpCircle size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />
              </div>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>
                -{quantMetrics.portfolioMaxDrawdown.toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {quantMetrics.benchmarkMaxDrawdown !== null
                  ? `基準回撤: -${quantMetrics.benchmarkMaxDrawdown.toFixed(2)}%`
                  : '基準回撤: 無對應'}
              </div>

              {/* MDD Tooltip (居中) */}
              {activeTooltipMetric === 'mdd' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '290px',
                    background: 'rgba(15, 23, 42, 0.97)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    zIndex: 100,
                    pointerEvents: 'none',
                    textAlign: 'left',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  {/* 上層：原理層 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f3e8ff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <TrendingUp size={14} color="#f87171" /> {quantDiagnosis.mdd.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {quantDiagnosis.mdd.formula}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '6px' }}>
                    {quantDiagnosis.mdd.definition}
                  </div>
                  {quantDiagnosis.mdd.benchmarkNote && (
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.04)', padding: '3px 6px', borderRadius: '4px', marginBottom: '8px' }}>
                      📌 {quantDiagnosis.mdd.benchmarkNote}
                    </div>
                  )}

                  {/* 分隔線 */}
                  <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '6px 0' }} />

                  {/* 下層：即時診斷層 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: quantDiagnosis.mdd.badgeColor,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {quantDiagnosis.mdd.levelBadge}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#f1f5f9', lineHeight: '1.35', fontWeight: 600 }}>
                      {quantDiagnosis.mdd.summary}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginTop: '6px', lineHeight: '1.35' }}>
                    💡 <span style={{ fontWeight: 600 }}>策略建議：</span>{quantDiagnosis.mdd.suggestion}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Volatility */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: activeTooltipMetric === 'volatility' ? '1px solid rgba(6, 182, 212, 0.6)' : '1px solid rgba(6, 182, 212, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTooltipMetric === 'volatility' ? '0 0 12px rgba(6, 182, 212, 0.25)' : 'none',
              }}
              onMouseEnter={() => setActiveTooltipMetric('volatility')}
              onMouseLeave={() => setActiveTooltipMetric((prev) => (prev === 'volatility' ? null : prev))}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTooltipMetric((prev) => (prev === 'volatility' ? null : 'volatility'));
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={13} color="#06b6d4" /> 年化波動度
                </span>
                <HelpCircle size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />
              </div>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06b6d4' }}>
                {quantMetrics.annualizedVolatility.toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                252 交易日標準差
              </div>

              {/* Volatility Tooltip (靠右防溢出) */}
              {activeTooltipMetric === 'volatility' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    right: '0',
                    left: 'auto',
                    width: '290px',
                    background: 'rgba(15, 23, 42, 0.97)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    zIndex: 100,
                    pointerEvents: 'none',
                    textAlign: 'left',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  {/* 上層：原理層 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f3e8ff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Activity size={14} color="#06b6d4" /> {quantDiagnosis.volatility.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {quantDiagnosis.volatility.formula}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '6px' }}>
                    {quantDiagnosis.volatility.definition}
                  </div>
                  {quantDiagnosis.volatility.benchmarkNote && (
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.04)', padding: '3px 6px', borderRadius: '4px', marginBottom: '8px' }}>
                      📌 {quantDiagnosis.volatility.benchmarkNote}
                    </div>
                  )}

                  {/* 分隔線 */}
                  <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '6px 0' }} />

                  {/* 下層：即時診斷層 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: quantDiagnosis.volatility.badgeColor,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {quantDiagnosis.volatility.levelBadge}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#f1f5f9', lineHeight: '1.35', fontWeight: 600 }}>
                      {quantDiagnosis.volatility.summary}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginTop: '6px', lineHeight: '1.35' }}>
                    💡 <span style={{ fontWeight: 600 }}>策略建議：</span>{quantDiagnosis.volatility.suggestion}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
