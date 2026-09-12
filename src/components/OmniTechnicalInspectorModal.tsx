import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Activity,
  TrendingUp,
  Flame,
  Shield,
  BarChart3,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { MarketType, HoldingPosition } from '../types/stock';
import { OmniIndicatorReport } from '../types/omniIndicator';
import { fetchAndBuildOmniReport, generateOmniReportMarkdown } from '../engine/omniReportPipeline';
import { logger } from '../utils/logger';

interface OmniTechnicalInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  initialMarket?: MarketType;
  holdings?: HoldingPosition[];
}

export const OmniTechnicalInspectorModal: React.FC<OmniTechnicalInspectorModalProps> = ({
  isOpen,
  onClose,
  initialSymbol = '2330',
  initialMarket = 'TW',
  holdings = [],
}) => {
  const [symbolInput, setSymbolInput] = useState(initialSymbol);
  const [market, setMarket] = useState<MarketType>(initialMarket);
  const [report, setReport] = useState<OmniIndicatorReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeMatrixTab, setActiveMatrixTab] = useState<'ALL' | 'TREND' | 'MOMENTUM' | 'VOLATILITY' | 'VOLUME' | 'LEVELS'>('ALL');

  // 同步 initialSymbol 變更
  useEffect(() => {
    if (isOpen && initialSymbol) {
      setSymbolInput(initialSymbol);
      setMarket(initialMarket);
    }
  }, [isOpen, initialSymbol, initialMarket]);

  const loadReport = useCallback(
    async (sym: string, mkt: MarketType, forceRefresh = false) => {
      const clean = sym.trim().toUpperCase();
      if (!clean) return;
      setLoading(true);
      try {
        const res = await fetchAndBuildOmniReport(clean, mkt, { forceRefresh });
        setReport(res);
      } catch (err) {
        logger.error('[OmniModal] Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen && symbolInput) {
      loadReport(symbolInput, market);
    }
  }, [isOpen, loadReport]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReport(symbolInput, market, true);
  };

  const handleSelectHolding = (holding: HoldingPosition) => {
    setSymbolInput(holding.symbol);
    setMarket(holding.market);
    loadReport(holding.symbol, holding.market);
  };

  const handleCopyMarkdown = async () => {
    if (!report) return;
    try {
      const md = generateOmniReportMarkdown(report);
      await navigator.clipboard.writeText(md);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      logger.error('Copy markdown failed:', err);
    }
  };

  if (!isOpen) return null;

  const currencySymbol = market === 'TW' ? 'NT$' : '$';
  const confluenceColor =
    report && report.confluence.score >= 80
      ? 'var(--profit-color, #10b981)'
      : report && report.confluence.score >= 60
      ? '#3b82f6'
      : report && report.confluence.score >= 40
      ? '#f59e0b'
      : 'var(--loss-color, #ef4444)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-card, #131b2e)',
          borderRadius: '16px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--text-primary, #ffffff)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 頂部導覽列 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.25) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} style={{ color: '#60a5fa' }} />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                全市場個股全技術指標透視分析儀
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                15 大關鍵技術指標 × 多空共振量化評估 (Spec 0121)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. 標的搜尋與快速切換區 */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'rgba(15, 23, 42, 0.4)',
          }}
        >
          {/* 搜尋表單 */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 市場切換按鈕 */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                type="button"
                onClick={() => setMarket('TW')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: market === 'TW' ? '#2563eb' : 'transparent',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                台股 TW
              </button>
              <button
                type="button"
                onClick={() => setMarket('US')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: market === 'US' ? '#2563eb' : 'transparent',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                美股 US
              </button>
            </div>

            {/* 代碼輸入框 */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="輸入代碼 (例: 2330, NVDA)"
                style={{
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  width: '180px',
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              診斷
            </button>
          </form>

          {/* 在庫持股快速標籤 */}
          {holdings.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '480px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>在庫快速選取:</span>
              {holdings.slice(0, 6).map((h) => (
                <button
                  key={h.symbol}
                  onClick={() => handleSelectHolding(h)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: h.symbol === symbolInput ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: h.symbol === symbolInput ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 0, 0, 0.25)',
                    color: h.symbol === symbolInput ? '#93c5fd' : '#cbd5e1',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h.symbol}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. 內容捲動區 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading && !report ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#60a5fa' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>正在回補全量日 K 線並即時運算 15 大技術指標...</p>
            </div>
          ) : report ? (
            <div>
              {/* 核心看板：現價與多空共振評分總覽 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                {/* 標的與行情卡片 */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{report.symbol}</span>
                      <span style={{ fontSize: '1rem', color: '#cbd5e1' }}>{report.name}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: report.market === 'TW' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: report.market === 'TW' ? '#93c5fd' : '#6ee7b7',
                        }}
                      >
                        {report.market === 'TW' ? '台股' : '美股'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      基準日: {report.asOfDate} ｜ 日 K 數: {report.candleCount} 根
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                      {currencySymbol} {report.currentPrice.toLocaleString()}
                    </span>
                    {report.dailyChange !== undefined && (
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color:
                            report.dailyChange >= 0
                              ? 'var(--profit-color, #10b981)'
                              : 'var(--loss-color, #ef4444)',
                        }}
                      >
                        {report.dailyChange >= 0 ? '+' : ''}
                        {report.dailyChange} ({report.dailyChangePercent}% )
                      </span>
                    )}
                  </div>
                </div>

                {/* 多空共振量化計分儀 */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${confluenceColor}40`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                      🎯 多空共振量化評分
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: `${confluenceColor}20`,
                        color: confluenceColor,
                        border: `1px solid ${confluenceColor}50`,
                      }}
                    >
                      {report.confluence.rating}
                    </span>
                  </div>

                  <div style={{ margin: '8px 0', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 900, color: confluenceColor }}>
                      {report.confluence.score}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>/ 100 分</span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.78rem',
                      lineHeight: '1.4',
                      color: '#e2e8f0',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    💡 {report.confluence.actionAdvice}
                  </div>
                </div>
              </div>

              {/* 核心特徵與風險預警 */}
              <div
                style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>
                  ⚡ 當前盤勢關鍵特徵共振:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {report.confluence.primarySignals.map((sig, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#bfdbfe',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                    >
                      ✓ {sig}
                    </span>
                  ))}
                  {report.confluence.riskAlert && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#fca5a5',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <AlertTriangle size={12} /> {report.confluence.riskAlert}
                    </span>
                  )}
                </div>
              </div>

              {/* 維度過濾標籤 */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto' }}>
                {(
                  [
                    { key: 'ALL', label: '全部維度' },
                    { key: 'TREND', label: '1. 趨勢追蹤' },
                    { key: 'MOMENTUM', label: '2. 動能擺盪' },
                    { key: 'VOLATILITY', label: '3. 波動通道' },
                    { key: 'VOLUME', label: '4. 量能資金' },
                    { key: 'LEVELS', label: '5. 關鍵位階' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveMatrixTab(tab.key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: activeMatrixTab === tab.key ? '1px solid #3b82f6' : '1px solid transparent',
                      background: activeMatrixTab === tab.key ? 'rgba(59, 130, 246, 0.25)' : 'rgba(0, 0, 0, 0.2)',
                      color: activeMatrixTab === tab.key ? '#fff' : '#94a3b8',
                      fontSize: '0.78rem',
                      fontWeight: activeMatrixTab === tab.key ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 五大指標矩陣卡片 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* 1. 趨勢矩陣 */}
                {(activeMatrixTab === 'ALL' || activeMatrixTab === 'TREND') && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <TrendingUp size={16} style={{ color: '#60a5fa' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>1️⃣ 趨勢追蹤矩陣 (Trend)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>均線排列:</span>
                        <span style={{ fontWeight: 700, color: report.trend.maAlignment === 'BULLISH' ? '#10b981' : report.trend.maAlignment === 'BEARISH' ? '#ef4444' : '#f59e0b' }}>
                          {report.trend.maAlignment === 'BULLISH' ? '多頭排列 (強勢)' : report.trend.maAlignment === 'BEARISH' ? '空頭排列 (弱勢)' : '均線糾結整理'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>MA 均線群:</span>
                        <span>MA5: {report.trend.ma5 ?? '-'} ｜ MA20: {report.trend.ma20 ?? '-'} ｜ MA60: {report.trend.ma60 ?? '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>MACD 柱狀體:</span>
                        <span style={{ fontWeight: 700, color: report.trend.macd.hist >= 0 ? 'var(--profit-color, #10b981)' : 'var(--loss-color, #ef4444)' }}>
                          {report.trend.macd.hist} ({report.trend.macd.hist >= 0 ? '紅柱擴張' : '綠柱修正'})
                        </span>
                      </div>
                      {report.trend.dmiAdx && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>DMI/ADX 強度:</span>
                          <span>ADX: {report.trend.dmiAdx.adx} ({report.trend.dmiAdx.trendDirection})</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. 動能擺盪 */}
                {(activeMatrixTab === 'ALL' || activeMatrixTab === 'MOMENTUM') && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <Flame size={16} style={{ color: '#c084fc' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>2️⃣ 動能擺盪矩陣 (Momentum)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>RSI (14):</span>
                        <span style={{ fontWeight: 700 }}>{report.momentum.rsi14 ?? '-'} ({report.momentum.rsiStatus})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>KD (9, 3, 3):</span>
                        <span>K: {report.momentum.kd9.k} ｜ D: {report.momentum.kd9.d} ({report.momentum.kd9.status})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>CCI (20) 順勢:</span>
                        <span>{report.momentum.cci20 ?? '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Williams %R:</span>
                        <span>{report.momentum.williamsR14 ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. 波動通道 */}
                {(activeMatrixTab === 'ALL' || activeMatrixTab === 'VOLATILITY') && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <Sliders size={16} style={{ color: '#fbbf24' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>3️⃣ 波動通道矩陣 (Volatility)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>布林帶寬 Squeeze:</span>
                        <span style={{ fontWeight: 700, color: report.volatility.bollinger.isSqueeze ? '#fbbf24' : '#94a3b8' }}>
                          {report.volatility.bollinger.bandwidthPercent}% {report.volatility.bollinger.isSqueeze ? '(⚡極致壓縮變盤)' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>ATR (14) 移動防守價:</span>
                        <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                          {currencySymbol} {report.volatility.trailingDefensePrice}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>MA20 乖離率:</span>
                        <span style={{ fontWeight: 600 }}>{report.volatility.bias20Percent}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. 量能與資金流 */}
                {(activeMatrixTab === 'ALL' || activeMatrixTab === 'VOLUME') && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <BarChart3 size={16} style={{ color: '#34d399' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>4️⃣ 量能資金矩陣 (Volume/Flow)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>5日均量比:</span>
                        <span style={{ fontWeight: 700 }}>
                          {report.volumeFlow.volumeRatio5}x ({report.volumeFlow.isSurge ? '🔥放量' : report.volumeFlow.isDryUp ? '❄️量縮' : '持平'})
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>昨日量 / 20日均量:</span>
                        <span>{report.volumeFlow.yesterdayVolume.toLocaleString()} / {Math.round(report.volumeFlow.avgVolume20).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>OBV 能量潮趨勢:</span>
                        <span style={{ fontWeight: 700, color: report.volumeFlow.obv.trend === 'RISING' ? '#10b981' : report.volumeFlow.obv.trend === 'FALLING' ? '#ef4444' : '#94a3b8' }}>
                          {report.volumeFlow.obv.trend === 'RISING' ? '持續淨流入' : report.volumeFlow.obv.trend === 'FALLING' ? '持續淨流出' : '持平盤整'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. 關鍵支撐壓力 */}
                {(activeMatrixTab === 'ALL' || activeMatrixTab === 'LEVELS') && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(236, 72, 153, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <Shield size={16} style={{ color: '#f472b6' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>5️⃣ 關鍵位階 (Levels)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Darvas 箱頂 / 箱底:</span>
                        <span style={{ fontWeight: 700 }}>
                          {currencySymbol} {report.levels.darvasBox.upper} / {currencySymbol} {report.levels.darvasBox.lower}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Fib 0.618 強支撐:</span>
                        <span style={{ fontWeight: 600 }}>{currencySymbol} {report.levels.fibonacci.fib618}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>樞紐中軸 P / 阻力 R1:</span>
                        <span>{currencySymbol} {report.levels.pivotPoints.pivot} / {currencySymbol} {report.levels.pivotPoints.r1}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              請輸入代碼並點擊「診斷」以載入指標。
            </div>
          )}
        </div>

        {/* 4. 底部動作列 */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {report ? `已完成 ${report.candleCount} 根日 K 線指標萃取` : ''}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {report && (
              <button
                onClick={handleCopyMarkdown}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  background: copySuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                  color: copySuccess ? '#34d399' : '#93c5fd',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {copySuccess ? <Check size={15} /> : <Copy size={15} />}
                {copySuccess ? '已複製 Markdown 研報' : '📋 複製 Markdown 研報'}
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
