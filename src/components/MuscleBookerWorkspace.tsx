import React, { useState, useMemo } from 'react';
import {
  Flame,
  Zap,
  TrendingUp,
  AlertTriangle,
  Search,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HoldingPosition, MarketType } from '../types/stock';
import type { DailyCandle } from '../types/indicators';

import {
  AssetPoolType,
  BEGINNER_TOOLTIPS,
  ScannedStockItem,
  getScopedUniverseSymbols,
  scanMuscleBookerItem,
} from '../engine/muscleBookerEngine';
import { Tooltip } from './common/Tooltip';

export interface MuscleBookerWorkspaceProps {
  holdings: HoldingPosition[];
  historicalDailyPrices?: Record<string, Record<string, number>>;
  currentMarket?: 'ALL' | MarketType;
}


export const MuscleBookerWorkspace: React.FC<MuscleBookerWorkspaceProps> = ({
  holdings,
  historicalDailyPrices = {},
  currentMarket = 'ALL',
}) => {
  const [selectedPool, setSelectedPool] = useState<AssetPoolType>('TOP30_FOCUS');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'BUY' | 'AVOID' | 'SELL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // 0. 依當前市場過濾持股
  const marketScopedHoldings = useMemo(() => {
    if (currentMarket === 'US') {
      return holdings.filter((h) => h.market === 'US' || h.currency === 'USD');
    }
    if (currentMarket === 'TW') {
      return holdings.filter((h) => h.market === 'TW' || h.currency === 'TWD');
    }
    return holdings;
  }, [holdings, currentMarket]);

  // 在倉持股 (shares > 0)
  const activeHoldings = useMemo(() => {
    return marketScopedHoldings.filter((h) => h.shares > 0);
  }, [marketScopedHoldings]);

  // 歷史閉倉 (shares === 0)
  const closedHoldings = useMemo(() => {
    return marketScopedHoldings.filter(
      (h) => h.shares === 0 && (h.realizedPnL !== 0 || (h.totalDividends || 0) > 0 || (h.originalBuyShares || 0) > 0)
    );
  }, [marketScopedHoldings]);

  // 1. 產生掃描標的清單
  const targetUniverse = useMemo(() => {
    if (selectedPool === 'HOLDINGS' || selectedPool === 'HOLDINGS_ACTIVE') {
      return activeHoldings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        market: h.market,
        basePrice: h.currentPrice || 100,
      }));
    }
    if (selectedPool === 'HOLDINGS_CLOSED') {
      return closedHoldings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        market: h.market,
        basePrice: h.currentPrice || 100,
      }));
    }
    return getScopedUniverseSymbols(currentMarket, selectedPool);
  }, [selectedPool, activeHoldings, closedHoldings, currentMarket]);

  // 2. 進行肌肉書僮指標全量掃描
  const scannedItems = useMemo<ScannedStockItem[]>(() => {
    return targetUniverse.map((item) => {
      const localDailyMap = historicalDailyPrices[item.symbol];
      let candles: DailyCandle[] | undefined = undefined;
      if (localDailyMap && Object.keys(localDailyMap).length >= 5) {
        const sortedDates = Object.keys(localDailyMap).sort();
        candles = sortedDates.slice(-30).map((d) => {
          const c = localDailyMap[d];
          return { date: d, open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 10000 };
        });
      }

      return scanMuscleBookerItem(
        item.symbol,
        item.name,
        item.market,
        item.basePrice,
        candles
      );
    });
  }, [targetUniverse, historicalDailyPrices]);

  // 統計各類動作數量 (將常態箱內整理 HOLD 歸併入黃燈觀望待變，確保三色加總等於總標的數)
  const buyItems = useMemo(() => scannedItems.filter((i) => i.actionDecision.action === 'BUY'), [scannedItems]);
  const avoidItems = useMemo(
    () => scannedItems.filter((i) => i.actionDecision.action === 'AVOID' || i.actionDecision.action === 'HOLD'),
    [scannedItems]
  );
  const sellItems = useMemo(() => scannedItems.filter((i) => i.actionDecision.action === 'SELL'), [scannedItems]);

  // 3. 搜尋與動作過濾
  const filteredItems = useMemo(() => {
    let list = scannedItems;
    if (actionFilter === 'BUY') {
      list = list.filter((item) => item.actionDecision.action === 'BUY');
    } else if (actionFilter === 'AVOID') {
      list = list.filter((item) => item.actionDecision.action === 'AVOID' || item.actionDecision.action === 'HOLD');
    } else if (actionFilter === 'SELL') {
      list = list.filter((item) => item.actionDecision.action === 'SELL');
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [scannedItems, actionFilter, searchQuery]);

  // 4. 四大箱子象限分群
  const breakoutUpItems = filteredItems.filter((i) => i.boxStatus === 'BREAKOUT_UP');
  const bottomPenetrationItems = filteredItems.filter((i) => i.isBottomPenetration);
  const squeezeItems = filteredItems.filter((i) => i.isBollingerSqueeze);
  const breakoutDownItems = filteredItems.filter((i) => i.boxStatus === 'BREAKOUT_DOWN');
  const deductionUpItems = filteredItems.filter((i) => i.ma20Slope === 'UP');

  return (
    <div className="warroom-container animate-fade-in">
      {/* 頂部 Header */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(88, 28, 135, 0.4) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '12px',
              background: 'rgba(244, 63, 94, 0.18)',
              color: '#fb7185',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
            }}
          >
            <Flame size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                肌肉書僮·動能雷達
              </h1>
              <span
                className="badge"
                style={{
                  background: 'rgba(244, 63, 94, 0.2)',
                  color: '#fb7185',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                }}
              >
                短線聖經 · 箱子戰術
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              「不預測高低，只跟隨突破；進場靠訊號，出場靠紀律」
            </p>
          </div>
        </div>

        {/* 搜尋框與資產池切換 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="搜尋代號或名稱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px 6px 30px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                width: '170px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setSelectedPool('TOP30_FOCUS')}
              className="btn btn-sm"
              style={{
                background: selectedPool === 'TOP30_FOCUS' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: selectedPool === 'TOP30_FOCUS' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedPool === 'TOP30_FOCUS' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {currentMarket === 'US' ? '美股焦點 Top 30' : currentMarket === 'TW' ? '台股焦點 Top 30' : '法人焦點 Top 30'}
            </button>
            <button
              onClick={() => setSelectedPool('HOLDINGS_ACTIVE')}
              className="btn btn-sm"
              style={{
                background: (selectedPool === 'HOLDINGS_ACTIVE' || selectedPool === 'HOLDINGS') ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: (selectedPool === 'HOLDINGS_ACTIVE' || selectedPool === 'HOLDINGS') ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + ((selectedPool === 'HOLDINGS_ACTIVE' || selectedPool === 'HOLDINGS') ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {currentMarket === 'US' ? '美股在倉' : currentMarket === 'TW' ? '台股在倉' : '在倉持股'} ({activeHoldings.length})
            </button>
            <button
              onClick={() => setSelectedPool('HOLDINGS_CLOSED')}
              className="btn btn-sm"
              style={{
                background: selectedPool === 'HOLDINGS_CLOSED' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: selectedPool === 'HOLDINGS_CLOSED' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedPool === 'HOLDINGS_CLOSED' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {currentMarket === 'US' ? '美股平倉' : currentMarket === 'TW' ? '歷史平倉' : '已平倉'} ({closedHoldings.length})
            </button>
            <button
              onClick={() => setSelectedPool('TW50_CORE')}
              className="btn btn-sm"
              style={{
                background: selectedPool === 'TW50_CORE' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: selectedPool === 'TW50_CORE' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedPool === 'TW50_CORE' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {currentMarket === 'US' ? '美股巨頭 Top 50' : '權值核心 Top 50'}
            </button>
          </div>
        </div>
      </div>

      {/* 🚦 三色操作戰術導覽篩選列 */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={15} style={{ color: 'var(--accent-amber)' }} />
            實戰動作篩選：
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActionFilter('ALL')}
              className="btn btn-sm"
              style={{
                background: actionFilter === 'ALL' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.5)',
                color: actionFilter === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (actionFilter === 'ALL' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              🔥 全部標的 ({scannedItems.length})
            </button>
            <button
              onClick={() => setActionFilter('BUY')}
              className="btn btn-sm"
              style={{
                background: actionFilter === 'BUY' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                color: actionFilter === 'BUY' ? '#4ade80' : 'var(--text-secondary)',
                border: '1px solid ' + (actionFilter === 'BUY' ? '#22c55e' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              🟢 建議買進 ({buyItems.length})
            </button>
            <button
              onClick={() => setActionFilter('AVOID')}
              className="btn btn-sm"
              style={{
                background: actionFilter === 'AVOID' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                color: actionFilter === 'AVOID' ? '#fbbf24' : 'var(--text-secondary)',
                border: '1px solid ' + (actionFilter === 'AVOID' ? '#f59e0b' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              ⛔ 觀望不碰 ({avoidItems.length})
            </button>
            <button
              onClick={() => setActionFilter('SELL')}
              className="btn btn-sm"
              style={{
                background: actionFilter === 'SELL' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                color: actionFilter === 'SELL' ? '#f87171' : 'var(--text-secondary)',
                border: '1px solid ' + (actionFilter === 'SELL' ? '#ef4444' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              🔴 建議賣出 ({sellItems.length})
            </button>
          </div>
        </div>

        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          已顯示 {filteredItems.length} / {scannedItems.length} 檔標的
        </span>
      </div>

      {/* 🧭 肌肉書僮·三色實戰操盤導航儀 (Action Matrix) */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              三色實戰操盤導航儀 (Traffic-Light Action Matrix)
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            一眼看懂：哪檔能買、哪檔不能碰、哪檔必須撤退
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {/* 區塊 1: 🟢 建議買進 */}
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: 700, fontSize: '0.92rem' }}>
                <CheckCircle2 size={16} />
                🟢 建議買進 · 主升發動
              </div>
              <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                {buyItems.length} 檔
              </span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              突破箱頂或破底翻，帶量表態，防守點明確。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {buyItems.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  目前無符合強勢買進標的，切勿追高。
                </div>
              ) : (
                buyItems.slice(0, 3).map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => setExpandedSymbol(expandedSymbol === item.symbol ? null : item.symbol)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontWeight: 800, color: '#ffffff' }}>
                        {item.symbol} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.name}</span>
                      </span>
                      <span className="mono" style={{ color: '#4ade80', fontWeight: 700 }}>
                        ${item.currentPrice}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.74rem' }}>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxUpperDefense} position="top">
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          防守: ${item.actionDecision.stopLossPrice ?? item.boxUpper ?? '-'}
                        </span>
                      </Tooltip>
                      {item.actionDecision.riskRewardRatio && (
                        <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
                          <span style={{ color: '#38bdf8', textDecoration: 'underline dotted', cursor: 'help' }}>
                            風益比: {item.actionDecision.riskRewardRatio} R
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 區塊 2: ⛔ 觀望不碰 */}
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 700, fontSize: '0.92rem' }}>
                <HelpCircle size={16} />
                ⛔ 觀望不碰 · 盤整待變
              </div>
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                {avoidItems.length} 檔
              </span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              布林極致壓縮、20MA 下彎蓋頭或箱內震盪整理，等待出方向，切忌急躁進場。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {avoidItems.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  目前無極度危險或極致壓縮待變之標的。
                </div>
              ) : (
                avoidItems.slice(0, 3).map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => setExpandedSymbol(expandedSymbol === item.symbol ? null : item.symbol)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontWeight: 800, color: '#ffffff' }}>
                        {item.symbol} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.name}</span>
                      </span>
                      <span className="mono" style={{ color: '#fbbf24', fontWeight: 700 }}>
                        ${item.currentPrice}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.actionDecision.actionReason}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 區塊 3: 🔴 建議賣出 */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 700, fontSize: '0.92rem' }}>
                <XCircle size={16} />
                🔴 建議賣出 · 破線停損
              </div>
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                {sellItems.length} 檔
              </span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              跌破箱底防守線或均線扣高下殺，嚴禁凹單，果斷保全本金。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sellItems.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  目前無跌破箱底之停損標的，防守線穩固。
                </div>
              ) : (
                sellItems.slice(0, 3).map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => setExpandedSymbol(expandedSymbol === item.symbol ? null : item.symbol)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontWeight: 800, color: '#ffffff' }}>
                        {item.symbol} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.name}</span>
                      </span>
                      <span className="mono" style={{ color: '#f87171', fontWeight: 700 }}>
                        ${item.currentPrice}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.74rem' }}>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxLowerBreakdown} position="top">
                        <span style={{ color: '#fca5a5', textDecoration: 'underline dotted', cursor: 'help' }}>
                          原防守: ${item.boxLower ?? item.actionDecision.stopLossPrice ?? '-'}
                        </span>
                      </Tooltip>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxLowerBreakdown} position="top">
                        <span style={{ color: '#f87171', fontWeight: 600, textDecoration: 'underline dotted', cursor: 'help' }}>破線停損</span>
                      </Tooltip>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 戰術指南橫幅 */}
      <div className="warroom-hero-card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} style={{ color: 'var(--accent-amber)' }} />
            <strong style={{ fontSize: '0.92rem', color: '#fef08a' }}>肌肉記憶短線實戰三大紀律：</strong>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            ① 三日不破高確立箱頂，<strong>帶量站上箱頂即為第一買點</strong>；
            ② 跌破支撐後下影線收復過半即為<strong>底穿假跌破主力吃貨</strong>；
            ③ <strong>跌破箱底防守線，絕不凹單果斷停損</strong>。
          </span>
        </div>
      </div>

      {/* 四大象限動能看板 */}
      <div className="warroom-grid-2">
        {/* 象限一：🔥 箱頂突破區 */}
        <div className="card">
          <div className="warroom-section-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={18} style={{ color: 'var(--gain-color)' }} />
                【箱頂突破區】(Breakout)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                三日箱頂有效站穩 · 肌肉記憶主升段表態
              </span>
            </div>
            <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)', border: '1px solid var(--gain-border)' }}>
              {breakoutUpItems.length} 檔表態
            </span>
          </div>

          {breakoutUpItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              目前選定資產池暫無標的突破箱頂，維持紀律耐心等待。
            </div>
          ) : (
            <div className="warroom-grid-2">
              {breakoutUpItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    className="warroom-stat-card"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                        🟢 買進 · 箱頂突破
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--gain-color)', fontSize: '1.1rem' }}>
                        ${item.currentPrice}
                      </span>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxUpperDefense} position="top">
                        <span className="mono" style={{ color: 'var(--text-secondary)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          箱頂防守: ${item.actionDecision.stopLossPrice ?? item.boxUpper}
                        </span>
                      </Tooltip>
                    </div>
                    {item.actionDecision.riskRewardRatio && (
                      <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#38bdf8', display: 'flex', justifyContent: 'space-between' }}>
                        <span>目標價: ${item.actionDecision.targetPrice}</span>
                        <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
                          <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>風益比: {item.actionDecision.riskRewardRatio} R</span>
                        </Tooltip>
                      </div>
                    )}
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        💡 <strong>操盤小抄：</strong>{item.actionDecision.actionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 象限二：🚀 底穿上反轉區 */}
        <div className="card">
          <div className="warroom-section-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--accent-cyan)' }} />
                【底穿上反轉區】(Reversal)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                破底翻 · 盤中破支撐後下影線強勢收復 · 主力誘空
              </span>
            </div>
            <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              {bottomPenetrationItems.length} 檔反轉
            </span>
          </div>

          {bottomPenetrationItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              目前選定資產池暫無底穿假跌破反轉型態。
            </div>
          ) : (
            <div className="warroom-grid-2">
              {bottomPenetrationItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    className="warroom-stat-card"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <Tooltip content={BEGINNER_TOOLTIPS.bottomPenetration} position="top">
                        <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.4)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          🟢 買進 · 破底翻
                        </span>
                      </Tooltip>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>
                        ${item.currentPrice}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        防守: ${item.actionDecision.stopLossPrice ?? '-'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        💡 <strong>操盤小抄：</strong>{item.actionDecision.actionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 象限三：⚡ 布林極致收縮區 */}
        <div className="card">
          <div className="warroom-section-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: 'var(--accent-amber)' }} />
                【布林極致壓縮區】(Bollinger Squeeze)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                帶寬 &lt; 8% · 波動率收縮至極限 · 蓄勢即將變盤
              </span>
            </div>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              {squeezeItems.length} 檔壓縮
            </span>
          </div>

          {squeezeItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              目前選定資產池暫無帶寬小於 8% 之極致壓縮標的。
            </div>
          ) : (
            <div className="warroom-grid-2">
              {squeezeItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    className="warroom-stat-card"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                        ⛔ 觀望 · 極致壓縮
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                        ${item.currentPrice}
                      </span>
                      <Tooltip content={BEGINNER_TOOLTIPS.bollingerSqueeze} position="top">
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          帶寬 {item.bollingerBandwidth}%
                        </span>
                      </Tooltip>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        💡 <strong>操盤小抄：</strong>{item.actionDecision.actionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 象限四：⚠️ 跌破箱底警戒區 */}
        <div className="card">
          <div className="warroom-section-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--loss-color)' }} />
                【跌破箱底防守警戒區】(Breakdown)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                跌破三日箱底 · 防守失效 · 嚴格紀律果斷停損
              </span>
            </div>
            <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)', border: '1px solid var(--loss-border)' }}>
              {breakoutDownItems.length} 檔警示
            </span>
          </div>

          {breakoutDownItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              目前選定資產池暫無跌破箱底防守線之標的，防守穩健。
            </div>
          ) : (
            <div className="warroom-grid-2">
              {breakoutDownItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    className="warroom-stat-card"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxLowerBreakdown} position="top">
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          🔴 賣出 · 破線停損
                        </span>
                      </Tooltip>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--loss-color)', fontSize: '1.1rem' }}>
                        ${item.currentPrice}
                      </span>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                        原防守: ${item.boxLower}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        💡 <strong>操盤小抄：</strong>{item.actionDecision.actionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 📈 均線扣抵望遠鏡清單 */}
      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-emerald)' }} />
              均線扣抵望遠鏡：月線扣低翻揚助漲先鋒 (MA Deduction Telescope)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              提前推算未來 3~5 日扣抵價 · 現價大幅高於扣抵值 · 月均線即將翻揚助漲
            </span>
          </div>
          <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
            {deductionUpItems.length} 檔翻揚先鋒
          </span>
        </div>

        <div className="warroom-table-container">
          <table className="warroom-table">
            <thead>
              <tr>
                <th>代號 / 標的名稱</th>
                <th style={{ textAlign: 'right' }}>現價</th>
                <th style={{ textAlign: 'right' }}>
                  <Tooltip content={BEGINNER_TOOLTIPS.maDeductionTelescope} position="top">
                    <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>MA20 扣抵價 ℹ️</span>
                  </Tooltip>
                </th>
                <th style={{ textAlign: 'center' }}>扣抵斜率預測</th>
                <th style={{ textAlign: 'center' }}>箱體位階</th>
                <th style={{ textAlign: 'center' }}>操盤建議</th>
                <th style={{ textAlign: 'center' }}>
                  <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
                    <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>防守價 / 風益比 ℹ️</span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.slice(0, 15).map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <React.Fragment key={item.symbol}>
                    <tr
                      onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                      style={{ cursor: 'pointer', background: isExpanded ? 'rgba(56, 189, 248, 0.06)' : undefined }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.symbol}</span>
                          {isExpanded ? <ChevronUp size={13} style={{ color: 'var(--accent-cyan)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                        ${item.currentPrice}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        ${item.ma20DeductionPrice ?? '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.ma20Slope === 'UP' ? (
                          <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
                            📈 扣低翻揚助漲
                          </span>
                        ) : item.ma20Slope === 'DOWN' ? (
                          <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)' }}>
                            📉 扣高下彎警戒
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.4)', color: 'var(--text-muted)' }}>
                            平緩盤整
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.boxStatus === 'BREAKOUT_UP' ? (
                          <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
                            🔥 箱頂突破
                          </span>
                        ) : item.boxStatus === 'BREAKOUT_DOWN' ? (
                          <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)' }}>
                            ⚠️ 跌破箱底
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-secondary)' }}>
                            箱內整理
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.actionDecision.action === 'BUY' ? (
                          <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                            🟢 建議買進
                          </span>
                        ) : item.actionDecision.action === 'AVOID' ? (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                            ⛔ 觀望不碰
                          </span>
                        ) : item.actionDecision.action === 'SELL' ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                            🔴 建議賣出
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-secondary)' }}>
                            ⚪ 區間觀望
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                        {item.actionDecision.stopLossPrice ? (
                          <span>
                            防守: ${item.actionDecision.stopLossPrice}
                            {item.actionDecision.riskRewardRatio && ` (${item.actionDecision.riskRewardRatio}R)`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: 'rgba(56, 189, 248, 0.04)' }}>
                        <td colSpan={7} style={{ padding: '10px 16px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={14} style={{ color: 'var(--accent-amber)' }} />
                            <strong>實戰操盤指引：</strong>
                            <span>{item.actionDecision.actionReason}</span>
                            {item.actionDecision.targetPrice && (
                              <span style={{ color: '#38bdf8', marginLeft: 'auto' }}>
                                目標價: ${item.actionDecision.targetPrice}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
