import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Activity,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Target,
  Zap,
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
  const [activeMainTab, setActiveMainTab] = useState<'RADAR' | 'ALL_INDICATORS' | 'REPORT'>('RADAR');
  const [activeMatrixTab, setActiveMatrixTab] = useState<'ALL' | 'TREND' | 'MOMENTUM' | 'VOLATILITY' | 'VOLUME' | 'LEVELS'>('ALL');

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

  const matrix = report?.confluence.actionMatrix;

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
          maxWidth: '1080px',
          maxHeight: '94vh',
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
                全能技術指標透視分析儀 (Omni Regime Brain)
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                15大指標 × 市場狀態機 × 實戰作戰階梯矩陣 (Spec 0122)
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

          {/* 在庫快速切換 */}
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
              <p style={{ margin: 0, fontSize: '0.9rem' }}>正在回補全量日 K 線並即時運算技術矩陣與實戰階梯...</p>
            </div>
          ) : report ? (
            <div>
              {/* 【第 1 層】：0秒決策核心 (Hero Executive Card) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px',
                }}
              >
                {/* 現價與市場狀態 */}
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
                      <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{report.symbol}</span>
                      <span style={{ fontSize: '1.05rem', color: '#cbd5e1' }}>{report.name}</span>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: '#a5b4fc',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                        }}
                      >
                        {report.confluence.regimeLabel}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        基準日: {report.asOfDate} ({report.candleCount} 根 K 線)
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900 }}>
                      {currencySymbol} {report.currentPrice.toLocaleString()}
                    </span>
                    {report.dailyChange !== undefined && (
                      <span
                        style={{
                          fontSize: '0.95rem',
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

                {/* 校正後多空共振儀表板 */}
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
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={15} style={{ color: confluenceColor }} />
                      多空共振評分儀
                      {report.confluence.contradictionPenaltyApplied && (
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                          矛盾校正
                        </span>
                      )}
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

                  <div style={{ margin: '6px 0', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 900, color: confluenceColor }}>
                      {report.confluence.score}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>/ 100 分</span>
                  </div>

                  {/* 大白話 0 秒操盤指南 */}
                  <div
                    style={{
                      fontSize: '0.78rem',
                      lineHeight: '1.45',
                      color: '#e2e8f0',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${confluenceColor}`,
                    }}
                  >
                    💡 {report.confluence.oneSentenceBottomLine}
                  </div>
                </div>
              </div>

              {/* 【第 2 層】：3秒實戰作戰地圖 (Actionable Trade Matrix 4-Box Grid) */}
              {matrix && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Target size={16} style={{ color: '#60a5fa' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd' }}>
                      實戰作戰地圖 (Actionable Trade Matrix)
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {/* 1. 第一減碼阻力區 */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171' }}>🎯 第一減碼 / 阻力區</span>
                        <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 700 }}>
                          {matrix.primaryResistanceZone.distancePercent >= 0 ? '+' : ''}
                          {matrix.primaryResistanceZone.distancePercent}%
                        </span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fca5a5' }}>
                        {currencySymbol} {matrix.primaryResistanceZone.price.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {matrix.primaryResistanceZone.label}
                      </div>
                    </div>

                    {/* 2. 突破續強加碼位 */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc' }}>🚀 突破續強 / 加碼位</span>
                        <span style={{ fontSize: '0.75rem', color: '#d8b4fe', fontWeight: 700 }}>
                          {matrix.expansionTargetZone.distancePercent >= 0 ? '+' : ''}
                          {matrix.expansionTargetZone.distancePercent}%
                        </span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d8b4fe' }}>
                        {currencySymbol} {matrix.expansionTargetZone.price.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {matrix.expansionTargetZone.label}
                      </div>
                    </div>

                    {/* 3. 短線動態防守線 */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa' }}>🛡️ 短線動態防守線</span>
                        <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 700 }}>
                          {matrix.shortTermDefenseLine.distancePercent}%
                        </span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#93c5fd' }}>
                        {currencySymbol} {matrix.shortTermDefenseLine.price.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {matrix.shortTermDefenseLine.label}
                      </div>
                    </div>

                    {/* 4. 結構底線 (停損) */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(100, 116, 139, 0.12)',
                        border: '1px solid rgba(100, 116, 139, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1' }}>⛔ 結構底線 (停損)</span>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700 }}>
                          {matrix.structuralInvalidationLine.distancePercent}%
                        </span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e2e8f0' }}>
                        {currencySymbol} {matrix.structuralInvalidationLine.price.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {matrix.structuralInvalidationLine.label}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 【第 3 層】：深度佐證標籤切換區 (Tabs) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveMainTab('RADAR')}
                    style={{
                      padding: '8px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeMainTab === 'RADAR' ? '2px solid #3b82f6' : '2px solid transparent',
                      color: activeMainTab === 'RADAR' ? '#60a5fa' : '#94a3b8',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ 風險雷達與形態
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMainTab('ALL_INDICATORS')}
                    style={{
                      padding: '8px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeMainTab === 'ALL_INDICATORS' ? '2px solid #3b82f6' : '2px solid transparent',
                      color: activeMainTab === 'ALL_INDICATORS' ? '#60a5fa' : '#94a3b8',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📊 15 大指標全景
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMainTab('REPORT')}
                    style={{
                      padding: '8px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeMainTab === 'REPORT' ? '2px solid #3b82f6' : '2px solid transparent',
                      color: activeMainTab === 'REPORT' ? '#60a5fa' : '#94a3b8',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📝 專業 Markdown 研報
                  </button>
                </div>

                <button
                  onClick={handleCopyMarkdown}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: copySuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: copySuccess ? '#34d399' : '#cbd5e1',
                    border: copySuccess ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                  {copySuccess ? '已複製研報' : '複製 Markdown'}
                </button>
              </div>

              {/* Tab 1: 風險雷達與形態 */}
              {activeMainTab === 'RADAR' && (
                <div>
                  {/* 風險預警與特殊狀態 */}
                  {(report.confluence.riskAlert || report.volatility.bollinger.isSqueeze || report.confluence.priceActionTrap?.hasBullTrap || report.confluence.divergence?.hasBearishDivergence) && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                        <AlertTriangle size={16} />
                        關鍵警示與防禦重點:
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#fca5a5', lineHeight: '1.5' }}>
                        {report.confluence.riskAlert && <div>• {report.confluence.riskAlert}</div>}
                        {report.volatility.bollinger.isSqueeze && <div>• ⚡ 布林通道極致壓縮中（帶寬 {report.volatility.bollinger.bandwidthPercent}%），即將發生大變盤，方向未決前切勿過度重押！</div>}
                        {report.confluence.priceActionTrap?.hasBullTrap && <div>• ⚠️ 壓力帶出現長上影線墓碑，提防誘多假突破 (Bull Trap)！</div>}
                        {report.confluence.divergence?.hasBearishDivergence && <div>• ⚠️ 偵測到頂背離訊號：股價創高但動能指標走低，留意拉高倒貨風險！</div>}
                      </div>
                    </div>
                  )}

                  {/* 盤勢特徵列表 */}
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#93c5fd', marginBottom: '10px' }}>
                      📋 當前多空特徵條列盤點:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                      {report.confluence.primarySignals.map((sig, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '0.78rem',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            color: '#e2e8f0',
                          }}
                        >
                          • {sig}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: 15大指標全景 */}
              {activeMainTab === 'ALL_INDICATORS' && (
                <div>
                  {/* 分類切換按鈕 */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'ALL', label: '全部指標 (15項)' },
                      { id: 'TREND', label: '1. 趨勢均線' },
                      { id: 'MOMENTUM', label: '2. 動能震盪' },
                      { id: 'VOLATILITY', label: '3. 通道ATR' },
                      { id: 'VOLUME', label: '4. 量能資金' },
                      { id: 'LEVELS', label: '5. 箱體樞紐' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveMatrixTab(tab.id as any)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: activeMatrixTab === tab.id ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: activeMatrixTab === tab.id ? 'rgba(59, 130, 246, 0.25)' : 'rgba(0, 0, 0, 0.2)',
                          color: activeMatrixTab === tab.id ? '#93c5fd' : '#94a3b8',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* 15大指標卡片網格 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {(activeMatrixTab === 'ALL' || activeMatrixTab === 'TREND') && (
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '8px' }}>1️⃣ 均線與 MACD</div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <div>MA5: {report.trend.ma5 ?? '-'} ｜ MA20: {report.trend.ma20 ?? '-'}</div>
                          <div>MA60: {report.trend.ma60 ?? '-'} ｜ MA120: {report.trend.ma120 ?? '-'}</div>
                          <div>排列: <span style={{ color: report.trend.maAlignment === 'BULLISH' ? '#34d399' : '#f87171' }}>{report.trend.maAlignment}</span></div>
                          <div>MACD 柱狀體: {report.trend.macd.hist} ({report.trend.macd.hist >= 0 ? '紅柱' : '綠柱'})</div>
                        </div>
                      </div>
                    )}

                    {(activeMatrixTab === 'ALL' || activeMatrixTab === 'TREND') && report.trend.dmiAdx && (
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '8px' }}>2️⃣ DMI / ADX 趨向系統</div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <div>+DI: <span style={{ color: '#34d399', fontWeight: 700 }}>{report.trend.dmiAdx.pdi}</span></div>
                          <div>-DI: <span style={{ color: '#f87171', fontWeight: 700 }}>{report.trend.dmiAdx.mdi}</span></div>
                          <div>ADX 強度: <span style={{ fontWeight: 700 }}>{report.trend.dmiAdx.adx}</span> ({report.trend.dmiAdx.trendDirection})</div>
                        </div>
                      </div>
                    )}

                    {(activeMatrixTab === 'ALL' || activeMatrixTab === 'MOMENTUM') && (
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '8px' }}>3️⃣ RSI 與 KD 隨機指標</div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <div>RSI(14): <span style={{ fontWeight: 700 }}>{report.momentum.rsi14 ?? '-'}</span> ({report.momentum.rsiStatus})</div>
                          <div>KD(9,3,3): K {report.momentum.kd9.k} ｜ D {report.momentum.kd9.d}</div>
                          <div>CCI(20): {report.momentum.cci20 ?? '-'} ｜ Williams %R: {report.momentum.williamsR14 ?? '-'}</div>
                        </div>
                      </div>
                    )}

                    {(activeMatrixTab === 'ALL' || activeMatrixTab === 'VOLATILITY') && (
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '8px' }}>4️⃣ 布林通道與 ATR 吊燈</div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <div>布林上軌: {report.volatility.bollinger.upper} ｜ 下軌: {report.volatility.bollinger.lower}</div>
                          <div>帶寬: {report.volatility.bollinger.bandwidthPercent}% ({report.volatility.bollinger.isSqueeze ? '⚡極致壓縮' : '正常'})</div>
                          <div>真實波幅 ATR(14): {report.volatility.atr14}</div>
                          <div>吊燈防守價: {currencySymbol} {report.volatility.trailingDefensePrice}</div>
                        </div>
                      </div>
                    )}

                    {(activeMatrixTab === 'ALL' || activeMatrixTab === 'VOLUME') && (
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '8px' }}>5️⃣ 量能動能與 OBV</div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <div>昨日成交量: {report.volumeFlow.yesterdayVolume.toLocaleString()}</div>
                          <div>5日均量: {report.volumeFlow.avgVolume5.toLocaleString()} (量比 {report.volumeFlow.volumeRatio5}x)</div>
                          <div>量能狀態: {report.volumeFlow.isSurge ? '🔥爆量突破' : report.volumeFlow.isDryUp ? '❄️窒息量縮' : '平穩'}</div>
                          <div>OBV 能量潮: {report.volumeFlow.obv.trend} ({report.volumeFlow.obv.current.toLocaleString()})</div>
                        </div>
                      </div>
                    )}

                    {(activeMatrixTab === 'ALL' || activeMatrixTab === 'LEVELS') && (
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '8px' }}>6️⃣ 箱體與樞紐點位</div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <div>Darvas 箱頂: {report.levels.darvasBox.upper} ｜ 箱底: {report.levels.darvasBox.lower}</div>
                          <div>Fibonacci 0.382: {report.levels.fibonacci.fib382} ｜ 0.618: {report.levels.fibonacci.fib618}</div>
                          <div>Pivot P: {report.levels.pivotPoints.pivot} ｜ R1: {report.levels.pivotPoints.r1} ｜ S1: {report.levels.pivotPoints.s1}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Markdown 研報預覽 */}
              {activeMainTab === 'REPORT' && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    color: '#e2e8f0',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {generateOmniReportMarkdown(report)}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              請輸入股票代碼並點擊診斷。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
