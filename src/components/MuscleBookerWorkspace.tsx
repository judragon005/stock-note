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
import { DailyCandle, BoxStatus, TrendSlope } from '../types/indicators';
import {
  detectDarvasBox,
  calculateMaDeduction,
  calculateBollingerSqueeze,
  evaluateMuscleBookerAction,
  MuscleBookerActionDecision,
} from '../engine/muscleBookerEngine';
import { Tooltip } from './common/Tooltip';

interface MuscleBookerWorkspaceProps {
  holdings: HoldingPosition[];
  historicalDailyPrices?: Record<string, Record<string, number>>;
  currentMarket?: 'ALL' | MarketType;
}

export type AssetPoolType = 'HOLDINGS' | 'HOLDINGS_ACTIVE' | 'HOLDINGS_CLOSED' | 'TOP30_FOCUS' | 'TW50_CORE';

/**
 * 股市小白專屬動能名詞百科字典
 */
export const BEGINNER_TOOLTIPS = {
  riskReward: '💡【股市小白指南】風益比 (Risk-Reward Ratio, R:R)：賺賠比。代表每承受 1 塊錢的停損風險，預期能賺取幾塊錢的潛在獲利。數值越大代表勝算越高，通常大於 1:2 R 才是值得進場的好機會！',
  boxUpperDefense: '💡【股市小白指南】箱頂防守價：股價帶量突破過去一段時間的最高整理壓力線後，箱頂轉為最強支撐防守線。只要沒跌破箱頂，就代表多頭主升段續抱；若跌破則需警戒避險。',
  bottomPenetration: '💡【股市小白指南】破底翻反轉：主力故意跌破前低支撐引誘散戶殺出，隨後當天強勢拉抬收復超過一半留下長下影線。這是典型的「假跌破、真吃貨」右側止跌進場訊號。',
  bollingerSqueeze: '💡【股市小白指南】布林極致壓縮：帶寬小於 8%，代表多空力量高度收斂、股價像彈簧被壓到最緊。暗示隨時會爆發大方向變盤，此時切勿預設立場猜底，等待出方向再跟隨！',
  boxLowerBreakdown: '💡【股市小白指南】跌破箱底防守線：跌破過去三日箱底的最後防線，多方棄守、趨勢轉弱。嚴禁凹單攤平，應果斷停損保全資金，保命第一！',
  maDeductionTelescope: '💡【股市小白指南】MA20 扣抵望遠鏡：用來提前 3~5 天預測月均線的走勢。若目前現價高於 20 天前的扣抵價，月均線就會向上翻揚助漲；反之均線會下彎反壓。',
  stopLossPrinciple: '💡【股市小白指南】嚴格停損紀律：只要跌破設定的防守價位，代表進場理由消失。小賠離場是為了保護本金，避免一次大跌讓資產腰斬！',
};

export interface ScannedStockItem {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  currentPrice: number;
  boxStatus: BoxStatus;
  boxUpper?: number;
  boxLower?: number;
  boxWidthPercent?: number;
  isBottomPenetration: boolean;
  ma20Slope: TrendSlope;
  ma20DeductionPrice?: number;
  isBollingerSqueeze: boolean;
  bollingerBandwidth?: number;
  actionDecision: MuscleBookerActionDecision;
}


// 台股法人焦點 Top 30
export const TW_TOP_30_FOCUS_SYMBOLS = [
  { symbol: '2330', name: '台積電', market: 'TW' as const, basePrice: 1010 },
  { symbol: '2454', name: '聯發科', market: 'TW' as const, basePrice: 1280 },
  { symbol: '2317', name: '鴻海', market: 'TW' as const, basePrice: 185 },
  { symbol: '2382', name: '廣達', market: 'TW' as const, basePrice: 280 },
  { symbol: '2603', name: '長榮', market: 'TW' as const, basePrice: 195 },
  { symbol: '3231', name: '緯創', market: 'TW' as const, basePrice: 110 },
  { symbol: '2356', name: '英業達', market: 'TW' as const, basePrice: 52 },
  { symbol: '2379', name: '瑞昱', market: 'TW' as const, basePrice: 510 },
  { symbol: '3008', name: '大立光', market: 'TW' as const, basePrice: 2600 },
  { symbol: '2881', name: '富邦金', market: 'TW' as const, basePrice: 88 },
  { symbol: '2882', name: '國泰金', market: 'TW' as const, basePrice: 65 },
  { symbol: '2891', name: '中信金', market: 'TW' as const, basePrice: 36.5 },
  { symbol: '0050', name: '元大台灣50', market: 'TW' as const, basePrice: 192 },
  { symbol: '0056', name: '元大高股息', market: 'TW' as const, basePrice: 39.5 },
  { symbol: '00878', name: '國泰永續高股息', market: 'TW' as const, basePrice: 23.8 },
  { symbol: '00919', name: '群益台灣精選高息', market: 'TW' as const, basePrice: 25.8 },
];

// 美股焦點與成長 Top 30
export const US_TOP_30_FOCUS_SYMBOLS = [
  { symbol: 'NVDA', name: '輝達 NVIDIA', market: 'US' as const, basePrice: 125 },
  { symbol: 'AAPL', name: '蘋果 Apple', market: 'US' as const, basePrice: 220 },
  { symbol: 'MSFT', name: '微軟 Microsoft', market: 'US' as const, basePrice: 425 },
  { symbol: 'TSLA', name: '特斯拉 Tesla', market: 'US' as const, basePrice: 215 },
  { symbol: 'AMZN', name: '亞馬遜 Amazon', market: 'US' as const, basePrice: 180 },
  { symbol: 'GOOGL', name: '谷歌 Alphabet', market: 'US' as const, basePrice: 165 },
  { symbol: 'META', name: 'Meta', market: 'US' as const, basePrice: 515 },
  { symbol: 'AMD', name: '超微 AMD', market: 'US' as const, basePrice: 155 },
  { symbol: 'AVGO', name: '博通 Broadcom', market: 'US' as const, basePrice: 160 },
  { symbol: 'PLTR', name: 'Palantir', market: 'US' as const, basePrice: 32 },
  { symbol: 'NFLX', name: 'Netflix', market: 'US' as const, basePrice: 680 },
  { symbol: 'COST', name: '好市多 Costco', market: 'US' as const, basePrice: 880 },
  { symbol: 'ARM', name: '安謀 ARM', market: 'US' as const, basePrice: 135 },
  { symbol: 'MU', name: '美光 Micron', market: 'US' as const, basePrice: 95 },
  { symbol: 'SMCI', name: '美超微 Supermicro', market: 'US' as const, basePrice: 450 },
  { symbol: 'COIN', name: 'Coinbase', market: 'US' as const, basePrice: 210 },
];

// 台股權值核心 Top 50 代表性標的
export const TW50_BLUE_CHIP_SYMBOLS = [
  { symbol: '2330', name: '台積電', market: 'TW' as const, basePrice: 1010 },
  { symbol: '2317', name: '鴻海', market: 'TW' as const, basePrice: 185 },
  { symbol: '2454', name: '聯發科', market: 'TW' as const, basePrice: 1280 },
  { symbol: '2881', name: '富邦金', market: 'TW' as const, basePrice: 88 },
  { symbol: '2382', name: '廣達', market: 'TW' as const, basePrice: 280 },
  { symbol: '2882', name: '國泰金', market: 'TW' as const, basePrice: 65 },
  { symbol: '2412', name: '中華電', market: 'TW' as const, basePrice: 125 },
  { symbol: '2886', name: '兆豐金', market: 'TW' as const, basePrice: 39.5 },
  { symbol: '2891', name: '中信金', market: 'TW' as const, basePrice: 36.5 },
  { symbol: '2308', name: '台達電', market: 'TW' as const, basePrice: 395 },
  { symbol: '1301', name: '台塑', market: 'TW' as const, basePrice: 50 },
  { symbol: '2002', name: '中鋼', market: 'TW' as const, basePrice: 22.5 },
  { symbol: '1216', name: '統一', market: 'TW' as const, basePrice: 85 },
  { symbol: '2603', name: '長榮', market: 'TW' as const, basePrice: 195 },
  { symbol: '2884', name: '玉山金', market: 'TW' as const, basePrice: 28.5 },
  { symbol: '2892', name: '第一金', market: 'TW' as const, basePrice: 28.2 },
  { symbol: '2890', name: '永豐金', market: 'TW' as const, basePrice: 24.5 },
  { symbol: '2880', name: '華南金', market: 'TW' as const, basePrice: 26 },
  { symbol: '3711', name: '日月光投控', market: 'TW' as const, basePrice: 155 },
  { symbol: '3045', name: '台灣大', market: 'TW' as const, basePrice: 112 },
];

// 美股巨頭 Top 50 代表性標的
export const US_MEGA_50_CORE_SYMBOLS = [
  { symbol: 'NVDA', name: '輝達 NVIDIA', market: 'US' as const, basePrice: 125 },
  { symbol: 'AAPL', name: '蘋果 Apple', market: 'US' as const, basePrice: 220 },
  { symbol: 'MSFT', name: '微軟 Microsoft', market: 'US' as const, basePrice: 425 },
  { symbol: 'AMZN', name: '亞馬遜 Amazon', market: 'US' as const, basePrice: 180 },
  { symbol: 'GOOGL', name: '谷歌 Alphabet', market: 'US' as const, basePrice: 165 },
  { symbol: 'META', name: 'Meta', market: 'US' as const, basePrice: 515 },
  { symbol: 'TSLA', name: '特斯拉 Tesla', market: 'US' as const, basePrice: 215 },
  { symbol: 'BRK.B', name: '波克夏 Berkshire', market: 'US' as const, basePrice: 450 },
  { symbol: 'LLY', name: '禮來 Eli Lilly', market: 'US' as const, basePrice: 940 },
  { symbol: 'JPM', name: '摩根大通 JPMorgan', market: 'US' as const, basePrice: 215 },
  { symbol: 'V', name: 'Visa', market: 'US' as const, basePrice: 280 },
  { symbol: 'UNH', name: '聯合健康 UnitedHealth', market: 'US' as const, basePrice: 580 },
  { symbol: 'XOM', name: '埃克森美孚 ExxonMobil', market: 'US' as const, basePrice: 115 },
  { symbol: 'MA', name: '萬事達 Mastercard', market: 'US' as const, basePrice: 470 },
  { symbol: 'COST', name: '好市多 Costco', market: 'US' as const, basePrice: 880 },
  { symbol: 'PG', name: '寶僑 P&G', market: 'US' as const, basePrice: 170 },
  { symbol: 'HD', name: '家得寶 Home Depot', market: 'US' as const, basePrice: 370 },
  { symbol: 'JNJ', name: '嬌生 Johnson & Johnson', market: 'US' as const, basePrice: 160 },
  { symbol: 'ABBV', name: '艾伯維 AbbVie', market: 'US' as const, basePrice: 190 },
  { symbol: 'WMT', name: '沃爾瑪 Walmart', market: 'US' as const, basePrice: 75 },
];

/**
 * 依據當前市場與選定資產池獲取過濾後的標的
 */
export function getScopedUniverseSymbols(
  market: 'ALL' | MarketType = 'ALL',
  pool: AssetPoolType = 'TOP30_FOCUS'
) {
  if (pool === 'TW50_CORE') {
    if (market === 'US') return US_MEGA_50_CORE_SYMBOLS;
    return TW50_BLUE_CHIP_SYMBOLS;
  }
  if (market === 'US') return US_TOP_30_FOCUS_SYMBOLS;
  if (market === 'TW') return TW_TOP_30_FOCUS_SYMBOLS;
  return [...TW_TOP_30_FOCUS_SYMBOLS, ...US_TOP_30_FOCUS_SYMBOLS];
}


/**
 * 依據基礎價格生成具備真實特徵的 30 天模擬日 K 線 (用於無實時日 K 之公開標的)
 */
function generateSyntheticCandles(symbol: string, basePrice: number): DailyCandle[] {
  const candles: DailyCandle[] = [];
  // 透過 symbol 字元 hash 決定走勢型態
  const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const patternType = hash % 4; // 0: 突破, 1: 底穿, 2: 壓縮, 3: 整理

  let price = basePrice * 0.95;
  for (let i = 0; i < 25; i++) {
    let changePct = ((Math.sin(i + hash) * 1.5) / 100);
    if (i === 24) {
      if (patternType === 0) changePct = 0.045; // 突破箱頂
      else if (patternType === 1) changePct = 0.015; // 底穿反轉
      else if (patternType === 2) changePct = 0.002; // 壓縮
      else changePct = -0.01;
    }
    price = price * (1 + changePct);
    const high = i === 24 && patternType === 0 ? price * 1.01 : price * 1.008;
    const low = i === 24 && patternType === 1 ? price * 0.97 : price * 0.992;
    const open = (high + low) / 2;

    candles.push({
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume: i === 24 && patternType === 0 ? 80000 : 25000,
    });
  }

  return candles;
}

/**
 * 針對單一標的執行肌肉書僮綜合指標運算
 */
export function scanMuscleBookerItem(
  symbol: string,
  name: string,
  market: 'TW' | 'US',
  basePrice: number,
  localCandles?: DailyCandle[]
): ScannedStockItem {
  const candles =
    localCandles && localCandles.length >= 5
      ? localCandles
      : generateSyntheticCandles(symbol, basePrice);

  const box = detectDarvasBox(candles);
  const deduction = calculateMaDeduction(candles);
  const bbands = calculateBollingerSqueeze(candles);
  const lastCandle = candles[candles.length - 1];

  const actionDecision = evaluateMuscleBookerAction({
    currentPrice: lastCandle.close,
    box,
    deduction,
    bbands,
  });

  return {
    symbol,
    name,
    market,
    currentPrice: lastCandle.close,
    boxStatus: box.boxStatus,
    boxUpper: box.boxUpper,
    boxLower: box.boxLower,
    boxWidthPercent: box.boxWidthPercent,
    isBottomPenetration: deduction.isBottomPenetrationRebound,
    ma20Slope: deduction.ma20Slope,
    ma20DeductionPrice: deduction.ma20DeductionPrice,
    isBollingerSqueeze: bbands.isSqueeze,
    bollingerBandwidth: bbands.bandwidth,
    actionDecision,
  };
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

  // 統計各類動作數量
  const buyItems = useMemo(() => scannedItems.filter((i) => i.actionDecision.action === 'BUY'), [scannedItems]);
  const avoidItems = useMemo(() => scannedItems.filter((i) => i.actionDecision.action === 'AVOID'), [scannedItems]);
  const sellItems = useMemo(() => scannedItems.filter((i) => i.actionDecision.action === 'SELL'), [scannedItems]);

  // 3. 搜尋與動作過濾
  const filteredItems = useMemo(() => {
    let list = scannedItems;
    if (actionFilter !== 'ALL') {
      list = list.filter((item) => item.actionDecision.action === actionFilter);
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
              布林極致壓縮或 20MA 下彎蓋頭反壓，等待出方向，切忌接刀。
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
