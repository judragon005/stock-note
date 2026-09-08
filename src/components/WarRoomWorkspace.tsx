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

interface WarRoomWorkspaceProps {
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  cashBalanceTwd: number;
  totalNavTwd: number;
  usdToTwdRate: number;
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
  '0050': [
    { date: '2025-08-01', close: 140 },
    { date: '2026-02-01', close: 155 },
    { date: '2026-05-01', close: 170 },
    { date: '2026-08-01', close: 185 },
    { date: '2026-09-08', close: 192 },
  ],
  '0056': [
    { date: '2025-08-01', close: 35 },
    { date: '2026-02-01', close: 37 },
    { date: '2026-05-01', close: 38 },
    { date: '2026-08-01', close: 39 },
    { date: '2026-09-08', close: 39.5 },
  ],
  '00713': [
    { date: '2025-08-01', close: 50 },
    { date: '2026-02-01', close: 53 },
    { date: '2026-05-01', close: 56 },
    { date: '2026-08-01', close: 58 },
    { date: '2026-09-08', close: 58.8 },
  ],
  '00919': [
    { date: '2025-08-01', close: 22 },
    { date: '2026-02-01', close: 24 },
    { date: '2026-05-01', close: 25 },
    { date: '2026-08-01', close: 25.5 },
    { date: '2026-09-08', close: 25.8 },
  ],
  '006208': [
    { date: '2025-08-01', close: 85 },
    { date: '2026-02-01', close: 94 },
    { date: '2026-05-01', close: 102 },
    { date: '2026-08-01', close: 112 },
    { date: '2026-09-08', close: 116 },
  ],
  BIL: [
    { date: '2025-08-01', close: 91.5 },
    { date: '2026-02-01', close: 91.7 },
    { date: '2026-05-01', close: 91.9 },
    { date: '2026-08-01', close: 92.1 },
    { date: '2026-09-08', close: 92.3 },
  ],
};

export const WarRoomWorkspace: React.FC<WarRoomWorkspaceProps> = ({
  holdings,
  loans,
  cashBalanceTwd,
  totalNavTwd,
  usdToTwdRate,
  onOpenMarginStressModal,
}) => {
  const [copiedLlm, setCopiedLlm] = useState(false);
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('GLOBAL_CORE');

  // 1. 計算個人防護盾
  const shield = useMemo(() => {
    let totalDebt = 0;
    let totalCollateral = 0;
    const pledgedLoans = loans.filter((l) => (l.principal || 0) > 0);

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

  // 3. 生成 AI 作戰方針
  const morningBrief = useMemo(() => {
    return generateAiMorningBrief({
      macro: DEFAULT_MACRO_SNAPSHOT,
      shield,
      catalysts,
    });
  }, [shield, catalysts]);

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

  const handleCopyLlmJson = () => {
    navigator.clipboard.writeText(morningBrief.llmPayloadJson);
    setCopiedLlm(true);
    setTimeout(() => setCopiedLlm(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 頂部戰情室標題與狀態 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700/50 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shadow-inner">
            <Compass className="w-7 h-7 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-indigo-200">
                宏觀總體戰情室
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                全球即時監控
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              宏觀景氣位階 × 全球流動性水庫 × 個人防護盾 × 雙軌制 AI 戰略決策中心
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyLlmJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition shadow-sm active:scale-95"
            title="複製結構化 Prompt JSON 供外部 LLM 使用"
          >
            {copiedLlm ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedLlm ? '已複製 JSON' : '複製 LLM Payload'}
          </button>
        </div>
      </div>

      {/* 🤖 AI 智慧每日作戰方針 (AI Morning Brief) */}
      <div className="p-6 rounded-2xl bg-slate-900/90 dark:bg-slate-900/90 text-white border border-amber-500/30 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 text-xs font-extrabold uppercase tracking-wider rounded-lg bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-md">
                <Zap size={14} />
                AI 晨報作戰方針
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
                {morningBrief.headline}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              基準日：{DEFAULT_MACRO_SNAPSHOT.date}
            </span>
          </div>

          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            💡 <strong className="text-white">核心方針：</strong>
            {morningBrief.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Activity size={14} />
                宏觀環境診斷
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {morningBrief.macroDiagnosis}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <ShieldCheck size={14} />
                個人防護盾體質診斷
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {morningBrief.shieldDiagnosis}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              📋 今日客觀紀律執行清單：
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {morningBrief.actionPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs text-slate-200"
                >
                  <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 第一層：📊 市場四柱即時脈搏 (Market Core Pillars) */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
          <Activity size={16} />
          第一層：市場四柱即時脈搏
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 柱 1: 利率與美債 */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>利率與美債殖利率</span>
              <span className="font-mono text-rose-500 font-bold">倒掛預警</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {DEFAULT_MACRO_SNAPSHOT.us10y}%
              </span>
              <span className="text-xs text-slate-400">10Y 美債基準</span>
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-slate-700/50 flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>2Y 美債：{DEFAULT_MACRO_SNAPSHOT.us2y}%</span>
              <span className="font-mono font-semibold text-rose-500">
                利差 {DEFAULT_MACRO_SNAPSHOT.yieldSpread}%
              </span>
            </div>
          </div>

          {/* 柱 2: 恐慌與市場情緒 */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>CBOE VIX 恐慌指數</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {DEFAULT_MACRO_SNAPSHOT.vixLevel}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {DEFAULT_MACRO_SNAPSHOT.vix}
              </span>
              <span className="text-xs text-slate-400">隱含波動率</span>
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-slate-700/50 flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Fear & Greed：{DEFAULT_MACRO_SNAPSHOT.fearAndGreedIndex}</span>
              <span className="font-semibold">{DEFAULT_MACRO_SNAPSHOT.fearAndGreedLevel}</span>
            </div>
          </div>

          {/* 柱 3: 大宗商品與避險 */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>大宗商品與避險</span>
              <span className="text-xs font-semibold text-amber-500">終極硬資產</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                ${DEFAULT_MACRO_SNAPSHOT.goldPrice}
              </span>
              <span className="text-xs text-slate-400">黃金 USD/oz</span>
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-slate-700/50 flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>原油 WTI：${DEFAULT_MACRO_SNAPSHOT.oilPrice}</span>
              <span className="text-slate-400">USD/bbl</span>
            </div>
          </div>

          {/* 柱 4: 全球流動性水庫 */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>全球流動性水庫</span>
              <span className="text-xs font-semibold text-indigo-500">DXY 美元指數</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {DEFAULT_MACRO_SNAPSHOT.dxy}
              </span>
              <span className="text-xs text-slate-400">USD/TWD {DEFAULT_MACRO_SNAPSHOT.usdToTwd}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-slate-700/50 flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>美 M2 年增：+{DEFAULT_MACRO_SNAPSHOT.usM2GrowthYoY}%</span>
              <span>台 M2 年增：+{DEFAULT_MACRO_SNAPSHOT.twM2GrowthYoY}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 第二層：🛡️ 個人投資組合宏觀防護盾 (Portfolio Macro Shield) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck size={16} />
            第二層：個人投資組合宏觀防護盾
          </h2>
          <button
            onClick={onOpenMarginStressModal}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            開啟黑天鵝壓力測試模擬器 ➔
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>現金購買力防禦水位</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  shield.cashStatus === 'STRONG'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : shield.cashStatus === 'ADEQUATE'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {shield.cashStatus === 'STRONG' ? '彈藥充裕' : shield.cashStatus === 'ADEQUATE' ? '適度均衡' : '水位偏緊'}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              NT$ {Math.round(shield.cashBalanceTWD).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              佔總淨值比例：<strong>{shield.cashRatioPercent}%</strong> (常態建議 10%~30%)
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>質押借貸安全維持率</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  shield.marginStatus === 'SAFE' || shield.marginStatus === 'NO_LOAN'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {shield.marginStatus === 'NO_LOAN' ? '無借款' : shield.marginStatus === 'SAFE' ? '安全無虞' : '注意警戒'}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {shield.hasLoans ? `${shield.marginMaintenanceRatio}%` : '無負債槓桿'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {shield.hasLoans
                ? `安全防守線 166% | 法定追繳線 130%`
                : '整戶零質押槓桿，防禦力最強'}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>資產再平衡最大偏離度</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                Drift %
              </span>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              ±{shield.maxAllocationDriftPercent}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {shield.maxAllocationDriftPercent >= 5.0 ? '⚠️ 已超過 5% 建議啟動注水再平衡' : '✅ 處於合理偏離區間內'}
            </div>
          </div>
        </div>
      </div>

      {/* 第三層：🪐 雙重動能跨資產趨勢輪動排行榜 (Dual Momentum Rotation) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="text-indigo-500" size={18} />
              雙重動能與跨資產趨勢輪動排行榜 (Gary Antonacci Model)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              12-1M 加權動能評分 (0.5×12M + 0.3×6M + 0.2×3M)，排除近 1 個月短線反轉雜訊
            </p>
          </div>

          {/* 資產池切換按鈕組 */}
          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl text-xs font-semibold">
            {DEFAULT_MOMENTUM_UNIVERSES.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUniverseId(u.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedUniverseId === u.id
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {u.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 避風港與決策提示條 */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            momentumSignal.safeHavenTriggered
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Flame size={16} />
            <span>
              <strong>當前建議行動：</strong>
              {momentumSignal.actionHeadline}：{momentumSignal.topAsset ? `【${momentumSignal.topAsset.symbol}】` : '退守避風港'}
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">{momentumSignal.actionAdvice}</span>
        </div>

        {/* 排行榜清單 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">排名</th>
                <th className="py-2.5 px-3 font-semibold">代號 / 標的名稱</th>
                <th className="py-2.5 px-3 font-semibold text-right">12-1M 加權分數</th>
                <th className="py-2.5 px-3 font-semibold text-right">12M 報酬</th>
                <th className="py-2.5 px-3 font-semibold text-right">6M 報酬</th>
                <th className="py-2.5 px-3 font-semibold text-right">3M 報酬</th>
                <th className="py-2.5 px-3 font-semibold text-center">絕對動能 (vs 4%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {momentumSignal.leaderboard.map((item, idx) => (
                <tr
                  key={item.symbol}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition ${
                    idx === 0 ? 'bg-indigo-50/50 dark:bg-indigo-950/20 font-bold' : ''
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-mono text-sm">{item.symbol}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{item.name}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {(item.momentumScore * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                    {(item.returns12M * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                    {(item.returns6M * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                    {(item.returns3M * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.isAboveRiskFree ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        勝出基準
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
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

      {/* 第四層：📅 關鍵財經催化劑倒數日曆 (Upcoming Catalysts) */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
          <Calendar size={16} />
          第四層：關鍵財經事件倒數日曆
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {catalysts.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 relative overflow-hidden"
            >
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span className="font-mono">{c.date}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.daysLeft <= 3
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                  }`}
                >
                  倒數 {c.daysLeft} 天
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
