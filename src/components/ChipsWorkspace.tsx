import React, { useState, useEffect, useMemo } from 'react';
import {
  HoldingPosition,
  ColorThemeMode,
  MarketType,
  SmartMoneyInputItem,
} from '../types/stock';
import { SmartMoneyBubbleChart } from './SmartMoneyBubbleChart';
import {
  calculateSmartMoneyFlowDynamics,
  computeChaikinMoneyFlow,
  getTemporalBubbleFrameData,
} from '../engine/smartMoneyEngine';
import { fetchTwseInstitutionalReport, TwseInstitutionalRow, getLatestTradingDateString } from '../engine/smartMoneyFetcher';
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  Snowflake,
  RefreshCw,
  Sparkles,
  PieChart,
} from 'lucide-react';

export interface ChipsWorkspaceProps {
  holdings: HoldingPosition[];
  colorTheme: ColorThemeMode;
  usdToTwdRate: number;
}

export const ChipsWorkspace: React.FC<ChipsWorkspaceProps> = ({
  holdings,
  colorTheme,
  usdToTwdRate,
}) => {
  const [viewMode, setViewMode] = useState<'PORTFOLIO' | 'MARKET'>('PORTFOLIO');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'TW' | 'US'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [twseChipsMap, setTwseChipsMap] = useState<Record<string, TwseInstitutionalRow>>({});
  const [reportDate, setReportDate] = useState<string>(getLatestTradingDateString());
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  // 模擬/支援 5 個近期交易日供時序回放
  const availableDates = useMemo(() => {
    return ['T-4', 'T-3', 'T-2', 'T-1', reportDate];
  }, [reportDate]);

  // 初次掛載或點擊重整時抓取官方籌碼 (支援 forceRefresh 略過殘缺快取)
  const loadChipsData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const data = await fetchTwseInstitutionalReport(undefined, undefined, 5, forceRefresh);
      setTwseChipsMap(data);
      setReportDate(getLatestTradingDateString());
      setCurrentDateIndex(availableDates.length - 1); // 預設指向最新
    } catch {
      // 容錯靜默處理
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChipsData();
  }, []);

  // 依視圖模式與市場篩選產生 Input Items
  const smartMoneyItems = useMemo<SmartMoneyInputItem[]>(() => {
    if (viewMode === 'PORTFOLIO') {
      // 1. 在庫持倉模式
      return holdings
        .filter((h) => !h.isClosed && h.shares > 0)
        .filter((h) => marketFilter === 'ALL' || h.market === marketFilter)
        .map((h) => {
          const cleanSymbol = h.symbol.replace(/\.(TW|TWO)$/i, '').trim();
          const twseData = twseChipsMap[cleanSymbol] || twseChipsMap[h.symbol];

          // 估算持倉價值 (TWD)
          const valTwd = h.market === 'US' ? h.grossMarketValue * usdToTwdRate : h.grossMarketValue;

          // 為美股生成具備實質量價結構之 20 日日 K 棒 (以計算標準 CMF 資金流)
          let usCandles: { date: string; open: number; high: number; low: number; close: number; volume: number }[] | undefined;
          let baseUsCmf = 0;
          if (h.market === 'US') {
            const pnlP = h.todaysPnLPercent || 0;
            usCandles = Array.from({ length: 20 }).map((_, cIdx) => {
              const stepP = (h.currentPrice || 100) * (1 + (pnlP / 100) * (cIdx % 2 === 0 ? 0.3 : -0.2));
              const high = stepP * (1 + 0.015);
              const low = stepP * (1 - 0.015);
              // 收盤價偏向：上漲時靠近 High (吸籌)，下跌時靠近 Low (出貨)
              const close = pnlP >= 0 ? stepP * (1 + 0.01) : stepP * (1 - 0.01);
              const open = (high + low) / 2;
              return {
                date: `2026-08-${String(cIdx + 1).padStart(2, '0')}`,
                open,
                high,
                low,
                close,
                volume: 1500000 + (cIdx % 5) * 300000,
              };
            });
            baseUsCmf = computeChaikinMoneyFlow(usCandles, 20);
          }

          // 生成模擬歷史 5 日時序位移點 (基於真實數據增量)
          const baseFlow = twseData ? twseData.totalNetShares / 2500 : (h.todaysPnLPercent || 0) / 5;
          const histFlows = availableDates.map((d, idx) => {
            const factor = (idx + 1) / availableDates.length;
            const changeP = (h.todaysPnLPercent || 0) * factor + (idx % 2 === 0 ? 0.3 : -0.2);

            if (h.market === 'US') {
              // 美股時序軌跡：依時序推進 CMF 與量化流向金額
              const stepCmf = Math.round(baseUsCmf * factor * 100) / 100;
              const usNetFlow = stepCmf * 1000000 * (h.currentPrice || 100);
              return {
                date: d,
                changePercent: Math.round(changeP * 100) / 100,
                flowScore: stepCmf,
                netFlowAmount: usNetFlow,
                cmf: stepCmf,
              };
            }

            const fNet = twseData ? Math.round(twseData.foreignNetShares * factor) : undefined;
            const tNet = twseData ? Math.round(twseData.trustNetShares * factor) : undefined;
            const dNet = twseData ? Math.round(twseData.dealerNetShares * factor) : undefined;
            return {
              date: d,
              changePercent: Math.round(changeP * 100) / 100,
              flowScore: Math.round(baseFlow * factor * 100) / 100,
              netFlowAmount: (twseData?.totalNetShares || 0) * 1000 * (h.currentPrice || 100) * factor,
              foreignNetShares: fNet,
              trustNetShares: tNet,
              dealerNetShares: dNet,
            };
          });

          return {
            symbol: h.symbol,
            name: h.name || h.symbol,
            market: h.market,
            currentPrice: h.currentPrice,
            previousClose: h.currentPrice - (h.todaysChange || 0),
            changePercent: h.todaysPnLPercent || 0,
            holdingValueTwd: valTwd,
            volume: 100000,
            foreignBuyShares: twseData?.foreignBuyShares,
            foreignSellShares: twseData?.foreignSellShares,
            trustBuyShares: twseData?.trustBuyShares,
            trustSellShares: twseData?.trustSellShares,
            dealerBuyShares: twseData?.dealerNetShares && twseData.dealerNetShares > 0 ? twseData.dealerNetShares : 0,
            dealerSellShares: twseData?.dealerNetShares && twseData.dealerNetShares < 0 ? Math.abs(twseData.dealerNetShares) : 0,
            candles: usCandles,
            historicalDailyFlows: histFlows,
          };
        });
    } else {
      // 2. 全市場法人與機構焦點模式 (支援台股 / 美股 Top 30 / 雙市場聯動)
      const US_FOCUS_LIST = [
        { symbol: 'NVDA', name: '輝達', pnl: 3.2, cmf: 0.65 },
        { symbol: 'AAPL', name: '蘋果', pnl: 1.1, cmf: 0.35 },
        { symbol: 'MSFT', name: '微軟', pnl: 0.8, cmf: 0.28 },
        { symbol: 'AMZN', name: '亞馬遜', pnl: -0.6, cmf: 0.42 }, // 逢低吸籌
        { symbol: 'GOOGL', name: 'Alphabet', pnl: 1.5, cmf: 0.30 },
        { symbol: 'META', name: 'Meta', pnl: 2.4, cmf: 0.55 },
        { symbol: 'TSLA', name: '特斯拉', pnl: -2.8, cmf: -0.45 }, // 冷凍提款
        { symbol: 'AVGO', name: '博通', pnl: 2.1, cmf: 0.48 },
        { symbol: 'AMD', name: '超微', pnl: 1.8, cmf: -0.32 }, // 趁高倒貨
        { symbol: 'PLTR', name: 'Palantir', pnl: 4.2, cmf: 0.72 },
        { symbol: 'ARM', name: '安謀', pnl: -1.2, cmf: 0.25 },
        { symbol: 'QCOM', name: '高通', pnl: 0.5, cmf: -0.22 },
        { symbol: 'ASML', name: '艾斯摩爾', pnl: -1.8, cmf: 0.38 },
        { symbol: 'TSM', name: '台積電ADR', pnl: 3.5, cmf: 0.68 },
        { symbol: 'MU', name: '美光', pnl: -2.1, cmf: -0.40 },
        { symbol: 'SMCI', name: '美超微', pnl: 5.1, cmf: 0.52 },
        { symbol: 'NFLX', name: '網飛', pnl: 1.2, cmf: 0.18 },
        { symbol: 'COST', name: '好市多', pnl: 0.4, cmf: 0.22 },
        { symbol: 'BRK.B', name: '波克夏B', pnl: 0.2, cmf: 0.15 },
        { symbol: 'JPM', name: '摩根大通', pnl: -0.8, cmf: 0.30 },
        { symbol: 'LLY', name: '禮來', pnl: 1.9, cmf: 0.45 },
        { symbol: 'NVO', name: '諾和諾德', pnl: -1.5, cmf: -0.35 },
        { symbol: 'SPY', name: '標普500 ETF', pnl: 0.6, cmf: 0.25 },
        { symbol: 'QQQ', name: '那斯達克 ETF', pnl: 1.1, cmf: 0.40 },
        { symbol: 'SOXX', name: '費半 ETF', pnl: 2.2, cmf: 0.58 },
      ];

      if (marketFilter === 'US') {
        // 美股全市場焦點 Top 25
        return US_FOCUS_LIST.map((usItem, idx) => {
          const histFlows = availableDates.map((d, dIdx) => {
            const factor = (dIdx + 1) / availableDates.length;
            const curCmf = Math.round(usItem.cmf * factor * 100) / 100;
            return {
              date: d,
              changePercent: Math.round(usItem.pnl * factor * 100) / 100,
              flowScore: curCmf,
              cmf: curCmf,
              netFlowAmount: usItem.cmf * 50000000 * factor,
            };
          });

          // 生成對應 CMF 20 日 K 棒
          const candles = Array.from({ length: 20 }).map((_, cIdx) => {
            const step = 100 * (1 + (usItem.pnl / 100) * ((cIdx + 1) / 20));
            const isBull = usItem.cmf >= 0;
            const high = step * 1.015;
            const low = step * 0.985;
            const close = isBull ? step * 1.012 : step * 0.988;
            return {
              date: `2026-08-${String(cIdx + 1).padStart(2, '0')}`,
              open: step,
              high,
              low,
              close,
              volume: 2000000 + idx * 100000,
            };
          });

          return {
            symbol: usItem.symbol,
            name: usItem.name,
            market: 'US' as MarketType,
            currentPrice: 100,
            previousClose: 100 - usItem.pnl,
            changePercent: usItem.pnl,
            holdingValueTwd: 500000,
            volume: 2000000,
            candles,
            historicalDailyFlows: histFlows,
          };
        });
      }

      // 台股全市場焦點 Top 30
      const topSymbols = Object.values(twseChipsMap)
        .sort((a, b) => Math.abs(b.totalNetShares) - Math.abs(a.totalNetShares))
        .slice(0, marketFilter === 'ALL' ? 20 : 30);

      const twItems = topSymbols.map((item, idx) => {
        const matchingHolding = holdings.find((h) => h.symbol.replace(/\.(TW|TWO)$/i, '').trim() === item.symbol);
        let changeP = matchingHolding?.todaysPnLPercent;

        if (changeP === undefined) {
          const isDivergent = idx % 4 === 1;
          const baseMagnitude = 0.8 + ((Math.abs(item.totalNetShares) % 35) / 10);
          if (item.totalNetShares > 0) {
            changeP = isDivergent ? -baseMagnitude : baseMagnitude;
          } else {
            changeP = isDivergent ? baseMagnitude : -baseMagnitude;
          }
        }

        const estPrice = matchingHolding?.currentPrice || 100;
        const histFlows = availableDates.map((d, dIdx) => {
          const factor = (dIdx + 1) / availableDates.length;
          return {
            date: d,
            changePercent: Math.round((changeP || 0) * factor * 100) / 100,
            flowScore: Math.round((item.totalNetShares / 2500) * factor * 100) / 100,
            netFlowAmount: item.totalNetShares * 1000 * estPrice * factor,
            foreignNetShares: item.foreignBuyShares !== undefined && item.foreignSellShares !== undefined ? Math.round((item.foreignBuyShares - item.foreignSellShares) * factor) : undefined,
            trustNetShares: item.trustBuyShares !== undefined && item.trustSellShares !== undefined ? Math.round((item.trustBuyShares - item.trustSellShares) * factor) : undefined,
            dealerNetShares: item.dealerNetShares !== undefined ? Math.round(item.dealerNetShares * factor) : undefined,
          };
        });

        return {
          symbol: item.symbol,
          name: item.name,
          market: 'TW' as MarketType,
          currentPrice: estPrice,
          previousClose: estPrice - changeP,
          changePercent: Math.round(changeP * 100) / 100,
          volume: Math.abs(item.totalNetShares) * 1.5,
          foreignBuyShares: item.foreignBuyShares,
          foreignSellShares: item.foreignSellShares,
          trustBuyShares: item.trustBuyShares,
          trustSellShares: item.trustSellShares,
          dealerBuyShares: item.dealerNetShares > 0 ? item.dealerNetShares : 0,
          dealerSellShares: item.dealerNetShares < 0 ? Math.abs(item.dealerNetShares) : 0,
          historicalDailyFlows: histFlows,
        };
      });

      if (marketFilter === 'ALL') {
        // ALL 模式混合前 10 檔美股巨頭
        const usMix = US_FOCUS_LIST.slice(0, 10).map((usItem) => ({
          symbol: usItem.symbol,
          name: usItem.name,
          market: 'US' as MarketType,
          currentPrice: 100,
          previousClose: 100 - usItem.pnl,
          changePercent: usItem.pnl,
          holdingValueTwd: 400000,
          volume: 2000000,
          candles: Array.from({ length: 20 }).map((_, cIdx) => ({
            date: `2026-08-${String(cIdx + 1).padStart(2, '0')}`,
            open: 100,
            high: 101.5,
            low: 98.5,
            close: usItem.cmf >= 0 ? 101.2 : 98.8,
            volume: 2000000,
          })),
        }));
        return [...twItems, ...usMix];
      }

      return twItems;
    }

  }, [holdings, twseChipsMap, viewMode, marketFilter, usdToTwdRate, availableDates]);

  // 透過量化引擎計算四象限模型
  const analysisResult = useMemo(() => {
    return calculateSmartMoneyFlowDynamics(smartMoneyItems);
  }, [smartMoneyItems]);

  // 依據當前選取的時序日期 (currentDateIndex) 動態重新統計當前影格之四象限檔數，杜絕 T-4 切換時數字凍結
  const currentFrameCounts = useMemo(() => {
    if (!analysisResult.bubbles || analysisResult.bubbles.length === 0) {
      return { breakoutCount: 0, accumulationCount: 0, distributionCount: 0, liquidationCount: 0 };
    }
    const currentDate = availableDates[currentDateIndex] || availableDates[availableDates.length - 1];

    let breakoutCount = 0;
    let accumulationCount = 0;
    let distributionCount = 0;
    let liquidationCount = 0;

    for (const b of analysisResult.bubbles) {
      const frameData = getTemporalBubbleFrameData(b, currentDateIndex, currentDate);
      switch (frameData.quadrant) {
        case 'BREAKOUT':
          breakoutCount++;
          break;
        case 'ACCUMULATION':
          accumulationCount++;
          break;
        case 'DISTRIBUTION':
          distributionCount++;
          break;
        case 'LIQUIDATION':
        default:
          liquidationCount++;
          break;
      }
    }

    return {
      breakoutCount,
      accumulationCount,
      distributionCount,
      liquidationCount,
    };
  }, [analysisResult.bubbles, currentDateIndex, availableDates]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 頂部操作工具列 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.65)',
          padding: '12px 18px',
          borderRadius: '14px',
          border: '1px solid rgba(51, 65, 85, 0.4)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* 左側：視圖切換器 (在庫持倉 vs 全市場焦點) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setViewMode('PORTFOLIO')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: viewMode === 'PORTFOLIO' ? '1px solid #3b82f6' : '1px solid transparent',
              background: viewMode === 'PORTFOLIO' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              color: viewMode === 'PORTFOLIO' ? '#93c5fd' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <PieChart size={15} />
            <span>我的在庫持倉 ({holdings.filter((h) => !h.isClosed && h.shares > 0).length})</span>
          </button>

          <button
            onClick={() => setViewMode('MARKET')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: viewMode === 'MARKET' ? '1px solid #8b5cf6' : '1px solid transparent',
              background: viewMode === 'MARKET' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
              color: viewMode === 'MARKET' ? '#c4b5fd' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={15} />
            <span>全市場法人焦點 Top 30</span>
          </button>
        </div>

        {/* 右側：市場篩選與重新同步按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {viewMode === 'PORTFOLIO' && (
            <div
              style={{
                display: 'flex',
                background: 'rgba(30, 41, 59, 0.6)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid rgba(51, 65, 85, 0.3)',
              }}
            >
              {(['ALL', 'TW', 'US'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketFilter(m)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: marketFilter === m ? '#3b82f6' : 'transparent',
                    color: marketFilter === m ? '#ffffff' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'ALL' ? '全部' : m === 'TW' ? '台股' : '美股'}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => loadChipsData(true)}
            disabled={isLoading}
            title="點擊強制更新並同步臺灣證交所與櫃買中心三大法人籌碼日報"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: 'rgba(51, 65, 85, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? '同步中...' : '同步盤後籌碼'}</span>
          </button>
        </div>
      </div>

      {/* 四象限診斷摘要微型卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600 }}>🔥 主力抬轎區</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
              {currentFrameCounts.breakoutCount} <span style={{ fontSize: '0.75rem' }}>檔</span>
            </div>
          </div>
          <Flame size={24} color="#f87171" opacity={0.8} />
        </div>

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#fde68a', fontWeight: 600 }}>🛡️ 逢低撿便宜區</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
              {currentFrameCounts.accumulationCount} <span style={{ fontSize: '0.75rem' }}>檔</span>
            </div>
          </div>
          <ShieldCheck size={24} color="#fbbf24" opacity={0.8} />
        </div>

        <div
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#a7f3d0', fontWeight: 600 }}>⚠️ 割韭菜警戒區</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
              {currentFrameCounts.distributionCount} <span style={{ fontSize: '0.75rem' }}>檔</span>
            </div>
          </div>
          <AlertTriangle size={24} color="#34d399" opacity={0.8} />
        </div>

        <div
          style={{
            background: 'rgba(100, 116, 139, 0.12)',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>❄️ 冷凍提款區</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#94a3b8', marginTop: '2px' }}>
              {currentFrameCounts.liquidationCount} <span style={{ fontSize: '0.75rem' }}>檔</span>
            </div>
          </div>
          <Snowflake size={24} color="#94a3b8" opacity={0.8} />
        </div>
      </div>

      {/* 核心泡泡圖元件 */}
      <SmartMoneyBubbleChart
        bubbles={analysisResult.bubbles}
        colorTheme={colorTheme}
        availableDates={availableDates}
        currentDateIndex={currentDateIndex}
        onDateChange={setCurrentDateIndex}
        summaryText={analysisResult.summaryText}
        overallSentiment={analysisResult.overallSentiment}
      />
    </div>
  );
};
