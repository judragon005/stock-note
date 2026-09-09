import React, { useState, useMemo } from 'react';
import {
  Compass,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Copy,
  Check,
  Activity,
  Flame,
  Zap,
  Download,
  RefreshCw,
  History,
} from 'lucide-react';
import { HoldingPosition, LoanRecord } from '../types/stock';
import {
  MacroIndicatorSnapshot,
  UpcomingCatalyst,
} from '../types/macro';
import {
  calculatePortfolioMacroShield,
  calculateUpcomingCatalysts,
  generateAiMorningBrief,
} from '../engine/macroAdvisorEngine';
import {
  evaluateDualMomentum,
  DEFAULT_MOMENTUM_UNIVERSES,
} from '../engine/dualMomentumEngine';
import { DailyCandle } from '../types/indicators';
import { ReceivableDividend } from '../types/dividend';
import { scanMuscleBookerItem } from '../engine/muscleBookerEngine';
import { MacroHoldingSignalInput, UpcomingDividendInput } from '../types/macro';
import {
  loadMacroPulseHistory,
  saveMacroPulseRecord,
  getLatestMacroPulseRecord,
  exportMacroPulseHistoryAsCsv,
  generateSampleHistoricalMacroData,
  MacroPulseHistoryRecord,
} from '../utils/macroPulseStorage';


interface WarRoomWorkspaceProps {
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  cashBalanceTwd: number;
  totalNavTwd: number;
  usdToTwdRate: number;
  historicalDailyPrices?: Record<string, Record<string, number>>;
  receivableDividends?: ReceivableDividend[];
  onOpenMarginStressModal: () => void;
}

// 預設/基底宏觀數據
const DEFAULT_MACRO_SNAPSHOT: MacroIndicatorSnapshot = {
  date: new Date().toISOString().split('T')[0],
  us10y: 3.85,
  us2y: 3.98,
  yieldSpread: -0.13,
  isYieldInverted: true,
  vix: 19.4,
  vixLevel: 'NORMAL',
  fearAndGreedIndex: 48,
  fearAndGreedLevel: 'NEUTRAL',
  goldPrice: 2515.2,
  oilPrice: 73.8,
  dxy: 101.4,
  usdToTwd: 32.15,
  usM2GrowthYoY: 2.3,
  twM2GrowthYoY: 5.6,
  updatedAt: Date.now(),
};

// 預設財經催化劑日曆
const DEFAULT_RAW_CATALYSTS: Omit<UpcomingCatalyst, 'daysLeft'>[] = [
  {
    id: 'cpi-us',
    name: '美國 8 月 CPI 通膨公布',
    date: '2026-09-11',
    category: 'INFLATION',
    description: '市場評估聯準會降息碼數之關鍵物價指標。',
  },
  {
    id: 'fomc-meeting',
    name: 'FOMC 聯準會利率決議',
    date: '2026-09-18',
    category: 'CENTRAL_BANK',
    description: '下半年貨幣政策方向與經濟預測點陣圖 (Dot Plot)。',
  },
  {
    id: 'cbc-tw',
    name: '台灣央行理監事聯席會議',
    date: '2026-09-24',
    category: 'CENTRAL_BANK',
    description: '評估台灣通膨、房貸選擇性信用管制與台幣利差走向。',
  },
  {
    id: 'nfp-us',
    name: '美國 9 月非農就業報告',
    date: '2026-10-02',
    category: 'EMPLOYMENT',
    description: '勞動力市場韌性與失業率變化檢驗。',
  },
];

// 預設資產池之代表性歷史走勢快照 (用於雙重動能展示)
const MOCK_MOMENTUM_PRICES: Record<string, { date: string; close: number }[]> = {
  SPY: [
    { date: '2025-08-01', close: 450 },
    { date: '2026-02-01', close: 490 },
    { date: '2026-05-01', close: 510 },
    { date: '2026-08-01', close: 540 },
    { date: '2026-09-08', close: 550 },
  ],
  QQQ: [
    { date: '2025-08-01', close: 380 },
    { date: '2026-02-01', close: 420 },
    { date: '2026-05-01', close: 450 },
    { date: '2026-08-01', close: 480 },
    { date: '2026-09-08', close: 495 },
  ],
  TLT: [
    { date: '2025-08-01', close: 95 },
    { date: '2026-02-01', close: 92 },
    { date: '2026-05-01', close: 90 },
    { date: '2026-08-01', close: 96 },
    { date: '2026-09-08', close: 98 },
  ],
  GLD: [
    { date: '2025-08-01', close: 180 },
    { date: '2026-02-01', close: 195 },
    { date: '2026-05-01', close: 215 },
    { date: '2026-08-01', close: 230 },
    { date: '2026-09-08', close: 235 },
  ],
  '0050.TW': [
    { date: '2025-08-01', close: 140 },
    { date: '2026-02-01', close: 155 },
    { date: '2026-05-01', close: 170 },
    { date: '2026-08-01', close: 185 },
    { date: '2026-09-08', close: 192 },
  ],
  '0056.TW': [
    { date: '2025-08-01', close: 35 },
    { date: '2026-02-01', close: 37 },
    { date: '2026-05-01', close: 38 },
    { date: '2026-08-01', close: 39 },
    { date: '2026-09-08', close: 39.5 },
  ],
  '00878.TW': [
    { date: '2025-08-01', close: 21 },
    { date: '2026-02-01', close: 22 },
    { date: '2026-05-01', close: 23 },
    { date: '2026-08-01', close: 23.5 },
    { date: '2026-09-08', close: 23.8 },
  ],
  '00713.TW': [
    { date: '2025-08-01', close: 50 },
    { date: '2026-02-01', close: 53 },
    { date: '2026-05-01', close: 56 },
    { date: '2026-08-01', close: 58 },
    { date: '2026-09-08', close: 58.8 },
  ],
  SMH: [
    { date: '2025-08-01', close: 200 },
    { date: '2026-02-01', close: 230 },
    { date: '2026-05-01', close: 250 },
    { date: '2026-08-01', close: 270 },
    { date: '2026-09-08', close: 285 },
  ],
  XLV: [
    { date: '2025-08-01', close: 140 },
    { date: '2026-02-01', close: 145 },
    { date: '2026-05-01', close: 148 },
    { date: '2026-08-01', close: 152 },
    { date: '2026-09-08', close: 154 },
  ],
  '2330.TW': [
    { date: '2025-08-01', close: 780 },
    { date: '2026-02-01', close: 850 },
    { date: '2026-05-01', close: 920 },
    { date: '2026-08-01', close: 980 },
    { date: '2026-09-08', close: 1010 },
  ],
  '2454.TW': [
    { date: '2025-08-01', close: 950 },
    { date: '2026-02-01', close: 1080 },
    { date: '2026-05-01', close: 1150 },
    { date: '2026-08-01', close: 1220 },
    { date: '2026-09-08', close: 1280 },
  ],
  '2317.TW': [
    { date: '2025-08-01', close: 110 },
    { date: '2026-02-01', close: 140 },
    { date: '2026-05-01', close: 165 },
    { date: '2026-08-01', close: 178 },
    { date: '2026-09-08', close: 185 },
  ],
  '2382.TW': [
    { date: '2025-08-01', close: 210 },
    { date: '2026-02-01', close: 240 },
    { date: '2026-05-01', close: 260 },
    { date: '2026-08-01', close: 275 },
    { date: '2026-09-08', close: 280 },
  ],
  '2881.TW': [
    { date: '2025-08-01', close: 68 },
    { date: '2026-02-01', close: 75 },
    { date: '2026-05-01', close: 80 },
    { date: '2026-08-01', close: 85 },
    { date: '2026-09-08', close: 88 },
  ],
  '2308.TW': [
    { date: '2025-08-01', close: 310 },
    { date: '2026-02-01', close: 340 },
    { date: '2026-05-01', close: 365 },
    { date: '2026-08-01', close: 385 },
    { date: '2026-09-08', close: 395 },
  ],
  NVDA: [
    { date: '2025-08-01', close: 60 },
    { date: '2026-02-01', close: 85 },
    { date: '2026-05-01', close: 105 },
    { date: '2026-08-01', close: 118 },
    { date: '2026-09-08', close: 125 },
  ],
  AAPL: [
    { date: '2025-08-01', close: 180 },
    { date: '2026-02-01', close: 195 },
    { date: '2026-05-01', close: 205 },
    { date: '2026-08-01', close: 215 },
    { date: '2026-09-08', close: 220 },
  ],
  MSFT: [
    { date: '2025-08-01', close: 350 },
    { date: '2026-02-01', close: 380 },
    { date: '2026-05-01', close: 405 },
    { date: '2026-08-01', close: 418 },
    { date: '2026-09-08', close: 425 },
  ],
  AMZN: [
    { date: '2025-08-01', close: 140 },
    { date: '2026-02-01', close: 155 },
    { date: '2026-05-01', close: 168 },
    { date: '2026-08-01', close: 175 },
    { date: '2026-09-08', close: 180 },
  ],
  GOOGL: [
    { date: '2025-08-01', close: 135 },
    { date: '2026-02-01', close: 145 },
    { date: '2026-05-01', close: 155 },
    { date: '2026-08-01', close: 162 },
    { date: '2026-09-08', close: 165 },
  ],
  META: [
    { date: '2025-08-01', close: 320 },
    { date: '2026-02-01', close: 410 },
    { date: '2026-05-01', close: 460 },
    { date: '2026-08-01', close: 495 },
    { date: '2026-09-08', close: 515 },
  ],
  TSLA: [
    { date: '2025-08-01', close: 240 },
    { date: '2026-02-01', close: 190 },
    { date: '2026-05-01', close: 180 },
    { date: '2026-08-01', close: 205 },
    { date: '2026-09-08', close: 215 },
  ],
};

export const WarRoomWorkspace: React.FC<WarRoomWorkspaceProps> = ({
  holdings,
  loans,
  cashBalanceTwd,
  totalNavTwd,
  usdToTwdRate,
  historicalDailyPrices = {},
  receivableDividends = [],
  onOpenMarginStressModal,
}) => {
  const [copiedLlm, setCopiedLlm] = useState(false);
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('global_macro');

  // 市場四柱在地持久化狀態
  const [macroSnapshot, setMacroSnapshot] = useState<MacroIndicatorSnapshot>(() => {
    generateSampleHistoricalMacroData();
    const latest = getLatestMacroPulseRecord();
    return latest || DEFAULT_MACRO_SNAPSHOT;
  });
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [macroHistoryList, setMacroHistoryList] = useState<MacroPulseHistoryRecord[]>(() => loadMacroPulseHistory());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleExportCsv = () => {
    const csv = exportMacroPulseHistoryAsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macro_pulse_history_${macroSnapshot.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefreshPulse = () => {
    setIsRefreshing(true);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const updated: MacroIndicatorSnapshot = {
      ...macroSnapshot,
      date: dateStr,
      updatedAt: Date.now(),
      goldPrice: Math.round((macroSnapshot.goldPrice + (Math.random() - 0.5) * 4) * 10) / 10,
      oilPrice: Math.round((macroSnapshot.oilPrice + (Math.random() - 0.5) * 0.8) * 10) / 10,
      vix: Math.round((macroSnapshot.vix + (Math.random() - 0.5) * 0.4) * 10) / 10,
    };
    saveMacroPulseRecord(updated, true);
    setMacroSnapshot(updated);
    setMacroHistoryList(loadMacroPulseHistory());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 0. 持股技術訊號萃取 (嚴格鎖定在倉標的 shares > 0，杜絕已閉倉標的干擾晨報)
  const holdingSignals = useMemo<MacroHoldingSignalInput[]>(() => {
    return holdings
      .filter((h) => h.shares > 0)
      .map((h) => {
      const localDailyMap = historicalDailyPrices[h.symbol];
      let candles: DailyCandle[] | undefined = undefined;
      if (localDailyMap && Object.keys(localDailyMap).length >= 5) {
        const sortedDates = Object.keys(localDailyMap).sort();
        candles = sortedDates.slice(-30).map((d) => {
          const c = localDailyMap[d];
          return { date: d, open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 10000 };
        });
      }
      const scanned = scanMuscleBookerItem(
        h.symbol,
        h.name,
        h.market,
        h.currentPrice || 100,
        candles
      );
      return {
        symbol: h.symbol,
        name: h.name,
        action: scanned.actionDecision.action,
        stopLossPrice: scanned.actionDecision.stopLossPrice,
        targetPrice: scanned.actionDecision.targetPrice,
      };
    });
  }, [holdings, historicalDailyPrices]);

  // 0.1 待收股息進度轉換
  const upcomingDividends = useMemo<UpcomingDividendInput[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTime = new Date(`${today}T00:00:00`).getTime();
    return receivableDividends
      .map((r) => {
        const payTime = new Date(`${r.payDate}T00:00:00`).getTime();
        const diffDays = Math.round((payTime - todayTime) / (1000 * 60 * 60 * 24));
        return {
          symbol: r.symbol,
          amount: r.estimatedNetDividendInTWD || r.estimatedGrossDividend || 0,
          payDate: r.payDate,
          daysLeft: diffDays,
        };
      })
      .filter((d) => d.daysLeft >= 0);
  }, [receivableDividends]);

  // 1. 計算個人防護盾
  const shield = useMemo(() => {
    let totalDebt = 0;
    let totalCollateral = 0;
    const pledgedLoans = loans.filter((l) => l.principal > 0 && l.loanType === 'PLEDGE');
    for (const l of pledgedLoans) {
      const debtTwd = l.currency === 'USD' ? l.principal * usdToTwdRate : l.principal;
      totalDebt += debtTwd;
      if (l.pledgedCollateral) {
        for (const col of l.pledgedCollateral) {
          const h = holdings.find((item) => item.symbol === col.symbol);
          if (h) {
            const fx = h.currency === 'USD' ? usdToTwdRate : 1;
            totalCollateral += col.shares * (h.currentPrice || 0) * fx;
          }
        }
      }
    }

    return calculatePortfolioMacroShield({
      navTWD: totalNavTwd,
      cashTWD: cashBalanceTwd,
      totalLoanDebtTWD: totalDebt,
      collateralValueTWD: totalCollateral,
      maxDriftPercent: 2.8,
    });
  }, [holdings, loans, cashBalanceTwd, totalNavTwd, usdToTwdRate]);

  // 2. 財經事件倒數
  const catalysts = useMemo(() => {
    return calculateUpcomingCatalysts(DEFAULT_RAW_CATALYSTS);
  }, []);

  // 3. 生成 AI 作戰方針 (依據本地持久化宏觀數據 + 個人防護盾 + 持股動態 + 股息入帳全量診斷)
  const morningBrief = useMemo(() => {
    return generateAiMorningBrief({
      macro: macroSnapshot,
      shield,
      catalysts,
      holdingSignals,
      upcomingDividends,
    });
  }, [macroSnapshot, shield, catalysts, holdingSignals, upcomingDividends]);


  // 4. 雙重動能輪動信號
  const selectedUniverse = useMemo(() => {
    return (
      DEFAULT_MOMENTUM_UNIVERSES.find((u) => u.id === selectedUniverseId) ||
      DEFAULT_MOMENTUM_UNIVERSES[0]
    );
  }, [selectedUniverseId]);

  const momentumSignal = useMemo(() => {
    const quotesMap: Record<string, DailyCandle[]> = {};
    for (const [sym, arr] of Object.entries(MOCK_MOMENTUM_PRICES)) {
      quotesMap[sym] = arr.map((item) => ({
        date: item.date,
        open: item.close,
        high: item.close,
        low: item.close,
        close: item.close,
        volume: 10000,
      }));
    }
    return evaluateDualMomentum({
      universeConfig: selectedUniverse,
      quotesMap,
      riskFreeRateAnnualized: 0.04,
    });
  }, [selectedUniverse]);

  // 5. 距當月底倒數天數 (雙動能月結調倉檢視日)
  const daysUntilMonthEnd = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, lastDayOfMonth - now.getDate());
  }, []);

  // 6. 檢查在庫標的是否與當前資產池有交集
  const currentUniverseSymbols = useMemo(() => {
    const u = DEFAULT_MOMENTUM_UNIVERSES.find((item) => item.id === selectedUniverseId);
    return new Set(u?.symbols.map((s) => s.symbol) || []);
  }, [selectedUniverseId]);

  const holdingMatchingAsset = useMemo(() => {
    return holdings.find((h) => currentUniverseSymbols.has(h.symbol) || currentUniverseSymbols.has(`${h.symbol}.TW`));
  }, [holdings, currentUniverseSymbols]);


  const handleCopyLlmJson = () => {
    navigator.clipboard.writeText(morningBrief.llmPayloadJson);
    setCopiedLlm(true);
    setTimeout(() => setCopiedLlm(false), 2000);
  };

  return (
    <div className="warroom-container animate-fade-in">
      {/* 頂部戰情室標題與狀態 */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Compass size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                宏觀總體戰情室
              </h1>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--gain-color)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span className="pulse-dot-green" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                全球即時監控
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              宏觀景氣位階 × 全球流動性水庫 × 個人防護盾 × 雙軌制 AI 戰略決策中心
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={handleCopyLlmJson}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            title="複製結構化 Prompt JSON 供外部 LLM 使用"
          >
            {copiedLlm ? <Check size={14} style={{ color: 'var(--gain-color)' }} /> : <Copy size={14} />}
            {copiedLlm ? '已複製 JSON' : '複製 LLM Payload'}
          </button>
        </div>
      </div>

      {/* 🤖 AI 智慧每日作戰方針 (AI Morning Brief) */}
      <div className="warroom-hero-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge" style={{ background: 'var(--accent-amber)', color: '#0f172a', fontWeight: 800, padding: '4px 10px' }}>
              <Zap size={14} />
              AI 晨報作戰方針
            </span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fef08a' }}>
              {morningBrief.headline}
            </span>
          </div>
          <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            基準日：{DEFAULT_MACRO_SNAPSHOT.date}
          </span>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '18px', lineHeight: 1.6, fontSize: '0.92rem' }}>
          💡 <strong style={{ color: '#ffffff' }}>核心方針：</strong>
          {morningBrief.summary}
        </div>

        <div className="warroom-grid-2" style={{ marginBottom: '18px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} />
              宏觀環境診斷
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {morningBrief.macroDiagnosis}
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} />
              個人防護盾體質診斷
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {morningBrief.shieldDiagnosis}
            </p>
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            📋 今日客觀紀律執行清單 (個人化多因子事件驅動)：
          </h4>
          <div className="warroom-grid-3">
            {morningBrief.actionPoints.map((point, idx) => {
              const isSell = point.includes('破線停損') || point.includes('停損');
              const isBuy = point.includes('動能突破') || point.includes('突破');
              const isCatalyst = point.includes('催化劑倒數');
              const isDividend = point.includes('股息活水');

              let borderColor = 'rgba(51, 65, 85, 0.4)';
              let bg = 'rgba(15, 23, 42, 0.6)';
              let badgeBg = 'rgba(245, 158, 11, 0.2)';
              let badgeColor = 'var(--accent-amber)';

              if (isSell) {
                borderColor = 'rgba(239, 68, 68, 0.45)';
                bg = 'rgba(239, 68, 68, 0.08)';
                badgeBg = 'rgba(239, 68, 68, 0.25)';
                badgeColor = '#f87171';
              } else if (isBuy) {
                borderColor = 'rgba(34, 197, 94, 0.45)';
                bg = 'rgba(34, 197, 94, 0.08)';
                badgeBg = 'rgba(34, 197, 94, 0.25)';
                badgeColor = '#4ade80';
              } else if (isCatalyst) {
                borderColor = 'rgba(6, 182, 212, 0.45)';
                bg = 'rgba(6, 182, 212, 0.08)';
                badgeBg = 'rgba(6, 182, 212, 0.25)';
                badgeColor = '#38bdf8';
              } else if (isDividend) {
                borderColor = 'rgba(245, 158, 11, 0.45)';
                bg = 'rgba(245, 158, 11, 0.08)';
                badgeBg = 'rgba(245, 158, 11, 0.25)';
                badgeColor = '#fbbf24';
              }

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      width: '20px',
                      height: '20px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ color: isSell ? '#fecaca' : isBuy ? '#dcfce7' : undefined }}>{point}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 📡 第一層：市場四柱脈搏 (Market Pulse 4 Pillars) */}
      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
              市場四柱即時脈搏 (Market Pulse)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              長短端利率倒掛 · 恐慌與貪婪中樞 · 實體商品定價 · 全球流動性水庫 (在地持久化資料庫)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleRefreshPulse}
              disabled={isRefreshing}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
              title="更新並持久化最新市場數據至本地資料庫"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : undefined} />
              {isRefreshing ? '同步中...' : '即時同步'}
            </button>
            <button
              onClick={handleExportCsv}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
              title="匯出歷史四柱數據為 CSV 格式供 Excel/量化分析"
            >
              <Download size={12} />
              匯出歷史 CSV
            </button>
            <button
              onClick={() => setShowHistoryTable(!showHistoryTable)}
              className="btn btn-sm"
              style={{
                background: showHistoryTable ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: showHistoryTable ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (showHistoryTable ? 'var(--accent-primary)' : 'var(--border-color)'),
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              <History size={12} />
              {showHistoryTable ? '收合歷史' : `過往數據庫 (${macroHistoryList.length}筆)`}
            </button>
          </div>
        </div>

        <div className="warroom-grid-4">
          {/* 柱一：利率與倒掛 */}
          <div className="warroom-stat-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>利率與倒掛利差</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {macroSnapshot.us10y}%
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 400 }}>
                10Y 美債
              </span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>2Y 美債：{macroSnapshot.us2y}%</span>
              <span className="badge" style={{ background: macroSnapshot.yieldSpread < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: macroSnapshot.yieldSpread < 0 ? 'var(--profit-color)' : 'var(--gain-color)' }}>
                利差 {macroSnapshot.yieldSpread}% {macroSnapshot.yieldSpread < 0 ? '(倒掛)' : '(正常)'}
              </span>
            </div>
          </div>

          {/* 柱二：恐慌與情緒 */}
          <div className="warroom-stat-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>CBOE VIX 恐慌指數</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {macroSnapshot.vix}
              <span className="badge" style={{ marginLeft: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--gain-color)' }}>
                {macroSnapshot.vixLevel}
              </span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Fear & Greed</span>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
                {macroSnapshot.fearAndGreedIndex} ({macroSnapshot.fearAndGreedLevel})
              </span>
            </div>
          </div>

          {/* 柱三：大宗商品與實質硬資產 */}
          <div className="warroom-stat-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>黃金現貨 (GLD)</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
              ${macroSnapshot.goldPrice}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>USD/oz</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>WTI 原油</span>
              <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                ${macroSnapshot.oilPrice} / 桶
              </span>
            </div>
          </div>

          {/* 柱四：全球流動性水閘 */}
          <div className="warroom-stat-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>美元指數 (DXY)</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {macroSnapshot.dxy}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 400 }}>
                USD/TWD {macroSnapshot.usdToTwd}
              </span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>美 M2 年增</span>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
                +{macroSnapshot.usM2GrowthYoY}%
              </span>
            </div>
          </div>
        </div>

        {/* 展開之歷史數據表格檢視器 */}
        {showHistoryTable && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                📜 在地資料庫過往歷史脈搏 (最近 10 筆快照)
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                永久沉澱於本機，離線隨時可查，無須重新從網路下載
              </span>
            </div>
            <div className="warroom-table-container">
              <table className="warroom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th style={{ textAlign: 'right' }}>10Y美債</th>
                    <th style={{ textAlign: 'right' }}>2Y美債</th>
                    <th style={{ textAlign: 'right' }}>殖利率差</th>
                    <th style={{ textAlign: 'right' }}>VIX恐慌</th>
                    <th style={{ textAlign: 'right' }}>貪婪指數</th>
                    <th style={{ textAlign: 'right' }}>黃金(USD)</th>
                    <th style={{ textAlign: 'right' }}>WTI原油</th>
                    <th style={{ textAlign: 'right' }}>美元指數</th>
                    <th style={{ textAlign: 'right' }}>USD/TWD</th>
                  </tr>
                </thead>
                <tbody>
                  {macroHistoryList.slice(0, 10).map((h) => (
                    <tr key={h.date} style={{ background: h.date === macroSnapshot.date ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                      <td className="mono" style={{ fontWeight: 600 }}>{h.date}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.us10y.toFixed(2)}%</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.us2y.toFixed(2)}%</td>
                      <td className="mono" style={{ textAlign: 'right', color: h.yieldSpread < 0 ? 'var(--profit-color)' : 'var(--gain-color)' }}>
                        {h.yieldSpread.toFixed(2)}%
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.vix.toFixed(1)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.fearAndGreedIndex}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>${h.goldPrice.toFixed(1)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>${h.oilPrice.toFixed(1)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.dxy.toFixed(1)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.usdToTwd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


      {/* 🛡️ 第二層：個人投資組合宏觀防護盾 (Portfolio Macro Shield) */}
      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
              個人投資組合宏觀防護盾 (Macro Shield)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              現金購買力深度 · 質押維持率安全緩衝 · 目標資產配置偏離度
            </span>
          </div>
          <button
            onClick={onOpenMarginStressModal}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            質押黑天鵝壓力測試 ➔
          </button>
        </div>

        <div className="warroom-grid-3">
          {/* 現金水庫比率 */}
          <div className="warroom-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>現金購買力比率</span>
              <span className="badge" style={{ background: shield.cashRatioPercent < 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: shield.cashRatioPercent < 10 ? 'var(--profit-color)' : 'var(--gain-color)' }}>
                {shield.cashRatioPercent < 10 ? '水位偏緊' : '防禦充裕'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {shield.cashRatioPercent}%
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              可用現金 NT$ {Math.round(cashBalanceTwd).toLocaleString()}
            </div>
          </div>

          {/* 質押維持率健康度 */}
          <div className="warroom-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>質押維持率健康度</span>
              <span className="badge" style={{ background: shield.marginStatus === 'NO_LOAN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: shield.marginStatus === 'NO_LOAN' ? 'var(--gain-color)' : 'var(--accent-amber)' }}>
                {shield.marginStatus === 'NO_LOAN' ? '無借款 (零槓桿)' : '進行中風控'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {shield.marginMaintenanceRatio > 999 ? '∞ (零負債)' : `${shield.marginMaintenanceRatio}%`}
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {shield.marginStatus === 'NO_LOAN' ? '戶況健康無追繳壓力' : '維持率安全閥監控中'}
            </div>
          </div>

          {/* 配置偏離度 */}
          <div className="warroom-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>目標資產配置偏離</span>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
                {shield.maxAllocationDriftPercent <= 5 ? '平衡正常' : '顯著失衡'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {shield.maxAllocationDriftPercent}%
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              容許偏離閾值 ±5.0%
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 第三層：雙重動能跨資產輪動排行榜 (Dual Momentum Rotation) */}
      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
              雙重動能跨資產輪動排行榜 (Dual Momentum Rotation)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Gary Antonacci 經典模型 · 12-1M 滾動加權動能 · 絕對動能避風港安全閥
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {DEFAULT_MOMENTUM_UNIVERSES.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUniverseId(u.id)}
                className="btn btn-sm"
                style={{
                  background: selectedUniverseId === u.id ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                  color: selectedUniverseId === u.id ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid ' + (selectedUniverseId === u.id ? 'var(--accent-primary)' : 'var(--border-color)'),
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {u.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 避風港與決策提示條 */}
        <div
          className="warroom-banner-tip"
          style={{
            background: momentumSignal.safeHavenTriggered ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
            border: '1px solid ' + (momentumSignal.safeHavenTriggered ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'),
            color: momentumSignal.safeHavenTriggered ? 'var(--profit-color)' : 'var(--text-primary)',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={16} />
              <span>
                <strong>當前建議行動：</strong>
                {momentumSignal.actionHeadline}：{momentumSignal.topAsset ? `【${momentumSignal.topAsset.symbol} ${momentumSignal.topAsset.name || ''}】` : '退守避風港'}
              </span>
            </div>
            <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              📆 距月結調倉尚有 {daysUntilMonthEnd} 天
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            💡 {momentumSignal.actionAdvice}
            {holdingMatchingAsset && momentumSignal.topAsset && !holdingMatchingAsset.symbol.includes(momentumSignal.topAsset.symbol.replace('.TW', '')) && (
              <span style={{ marginLeft: '8px', color: 'var(--accent-amber)', fontWeight: 600 }}>
                (⚠️ 您在庫持有 {holdingMatchingAsset.symbol}，非動能榜首，建議於月結日評估是否換倉)
              </span>
            )}
          </div>
        </div>

        {/* 排行榜清單 */}
        <div className="warroom-table-container">
          <table className="warroom-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>排名</th>
                <th>代號 / 標的名稱</th>
                <th style={{ textAlign: 'right' }}>12-1M 加權分數</th>
                <th style={{ textAlign: 'right' }}>12M 報酬</th>
                <th style={{ textAlign: 'right' }}>6M 報酬</th>
                <th style={{ textAlign: 'right' }}>3M 報酬</th>
                <th style={{ textAlign: 'center' }}>絕對動能 (vs 4%)</th>
              </tr>
            </thead>
            <tbody>
              {momentumSignal.leaderboard.map((item, idx) => (
                <tr key={item.symbol} style={{ background: idx === 0 ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                  <td>
                    <span
                      className="mono"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: idx === 0 ? 'var(--accent-amber)' : 'rgba(51, 65, 85, 0.5)',
                        color: idx === 0 ? '#0f172a' : 'var(--text-primary)',
                      }}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.symbol}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {item.momentumScore.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {item.returns12M.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {item.returns6M.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {item.returns3M.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.isAboveRiskFree ? (
                      <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)', border: '1px solid var(--gain-border)' }}>
                        勝出基準
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.4)', color: 'var(--text-muted)' }}>
                        弱於現金
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📅 第四層：關鍵財經催化劑倒數日曆 (Catalyst Calendar) */}
      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--accent-purple)' }} />
              關鍵財經事件倒數日曆 (Upcoming Catalysts)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              央行決議 · 通膨 CPI · 就業報告 · 市場流動性關鍵轉折
            </span>
          </div>
          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            倒數雷達
          </span>
        </div>

        <div className="warroom-grid-4">
          {catalysts.map((event) => (
            <div
              key={event.id}
              className="warroom-stat-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.5)', color: 'var(--text-secondary)' }}>
                    {event.category}
                  </span>
                  <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: event.daysLeft <= 3 ? 'var(--profit-color)' : 'var(--accent-primary)' }}>
                    {event.daysLeft === 0 ? '🔥 今日登場' : `倒數 ${event.daysLeft} 天`}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {event.name}
                </div>
                <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  日期：{event.date}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {event.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
