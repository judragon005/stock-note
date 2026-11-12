import React, { useState, useEffect, useMemo } from 'react';
import { FileDown, Download, Zap, BookOpen } from 'lucide-react';
import { HoldingPosition, BrokerAccount, LoanRecord } from '../../types/stock';
import {
  MacroIndicatorSnapshot,
  MultiHorizonMarketBreadth,
  MarginDeleveragingStatus,
} from '../../types/zavySlowWealth';
import {
  generateZavyAnalysisReport,
  exportZavyReportMarkdown,
  exportZavyRawDataCsv,
} from '../../engine/zavySlowWealthEngine';
import { ZavyMacroCompassCard } from './ZavyMacroCompassCard';
import { ZavyMarketBreadthCard } from './ZavyMarketBreadthCard';
import { ZavyDualTrackDecisionCard } from './ZavyDualTrackDecisionCard';
import { ZavyTenSecondsModal } from './ZavyTenSecondsModal';

interface ZavySlowWealthWorkspaceProps {
  holdings: HoldingPosition[];
  accounts: BrokerAccount[];
  totalNavTwd: number;
  cashBalanceTwd?: number;
  usdToTwdRate?: number;
  loans?: LoanRecord[];
  initialShowBeginnerGuide?: boolean;
}

export const ZavySlowWealthWorkspace: React.FC<ZavySlowWealthWorkspaceProps> = ({
  holdings,
  accounts: _accounts,
  totalNavTwd: _totalNavTwd,
  cashBalanceTwd = 0,
  usdToTwdRate = 32,
  loans = [],
  initialShowBeginnerGuide = false,
}) => {
  const [isTenSecModalOpen, setIsTenSecModalOpen] = useState(false);
  const [showBeginnerGuide, setShowBeginnerGuide] = useState(initialShowBeginnerGuide);
  const [maxTolerancePercent, setMaxTolerancePercent] = useState(20);

  // 1. 100% 真實數據狀態：初始為空物件或真實預設
  const [macroSnapshot, setMacroSnapshot] = useState<MacroIndicatorSnapshot>({});
  const [marketBreadth, setMarketBreadth] = useState<MultiHorizonMarketBreadth>({
    asOfDate: new Date().toISOString().slice(0, 10),
    market: 'TW',
    breadth20: 0,
    breadth60: 0,
    breadth200: 0,
    totalFilteredStocks: 0,
  });

  const [marginStatus, setMarginStatus] = useState<MarginDeleveragingStatus>({
    asOfDate: new Date().toISOString().slice(0, 10),
    indexDrawdownPercent: 0,
    marginDrawdownPercent: 0,
    marginDeleveragingRatio: 1,
    isDeleveragingSufficient: false,
    statusText: '載入融資去槓桿數據中...',
  });

  const [isAtBollingerLowerBand, setIsAtBollingerLowerBand] = useState<boolean>(false);
  const [isBadNewsDivergenceObserved, setIsBadNewsDivergenceObserved] = useState<boolean>(false);

  // 2. 背景請求最新總經與市場寬度 (100% 連通 SQLite 與免費 API)
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      try {
        const macroRes = await fetch('/api/market/macro');
        if (macroRes.ok && isMounted) {
          const json = await macroRes.json();
          const data = json.data || json;
          if (data) {
            setMacroSnapshot({
              treasuryYield10y: data.treasuryYield10y ?? data.treasury_yield_10y,
              treasuryYield2y: data.treasuryYield2y ?? data.treasury_yield_2y,
              yieldSpread10y2y: data.yieldSpread10y2y ?? data.yield_spread_10y_2y,
              highYieldSpreadOas: data.creditSpreadOas ?? data.credit_spread_oas,
              cccHighYieldSpread: data.cccSpreadOas ?? data.ccc_spread_oas,
              usCpiYoY: data.usCpiYoY ?? data.us_cpi_yoy,
              usIsmPmi: data.usIsmPmi ?? data.us_ism_pmi ?? undefined,
              usNewOrdersMinusInventory: data.us_orders_minus_inv_spread ?? data.usOrdersMinusInvSpread,
              twPmi: data.twPmi ?? data.tw_pmi ?? undefined,
              twRevenueDiffusionIndex: data.twRevenue?.diffusionIndex ?? data.tw_revenue_diffusion_index,
              twExportOrdersYoY: data.twRevenue?.totalRevenueYoY ?? data.tw_export_orders_yoy,
            });
          }
        }
      } catch {
        // 靜默容錯
      }

      try {
        const breadthRes = await fetch('/api/market/breadth?market=TW');
        if (breadthRes.ok && isMounted) {
          const bData = await breadthRes.json();
          const data = bData.data || bData;
          if (data) {
            setMarketBreadth({
              asOfDate: data.asOfDate || new Date().toISOString().slice(0, 10),
              market: 'TW',
              breadth20: data.tw?.breadth20 ?? data.breadth20 ?? 0,
              breadth60: data.tw?.breadth60 ?? data.breadth60 ?? 0,
              breadth200: data.tw?.breadth200 ?? data.breadth200 ?? 0,
              totalFilteredStocks: data.tw?.totalStocks ?? data.totalFilteredStocks ?? data.totalStocks ?? 0,
            });

            if (data.twMarginDeleveraging) {
              const md = data.twMarginDeleveraging;
              setMarginStatus({
                asOfDate: data.asOfDate || new Date().toISOString().slice(0, 10),
                indexDrawdownPercent: md.taiexMaxDrawdown ?? 0,
                marginDrawdownPercent: md.marginReductionPercent ?? 0,
                marginDeleveragingRatio: md.marginDeleveragingRatio ?? 1,
                isDeleveragingSufficient: md.isCleaned ?? false,
                statusText: md.isCleaned
                  ? `融資減幅 (${md.marginReductionPercent}%) 超過大盤跌幅 (${md.taiexMaxDrawdown}%)，去槓桿充分。`
                  : `大盤回撤 ${md.taiexMaxDrawdown}%，融資減幅 ${md.marginReductionPercent}%，清洗尚不充分。`,
              });
              setIsAtBollingerLowerBand(Boolean(md.isAtBollingerLowerBand));
              setIsBadNewsDivergenceObserved(Boolean(md.isBadNewsDivergenceObserved));
            }
          }
        }
      } catch {
        // 靜默容錯
      }
    }
    loadLiveData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. 核心報告運算 (連通真實匯率、質押借貸帳本、真實年度股息與動態指標)
  const analysisReport = useMemo(() => {
    // 依據在席持股市值與成本殖利率 (yieldOnCostPercent) 或累計配息防禦性估算單年股息活水
    const annualEstimatedDividendsTwd = holdings.reduce((sum, h) => {
      if (h.isClosed || !h.shares || h.shares <= 0) return sum;
      // 優先使用成本殖利率估算單年股息 (totalCostBasis * yieldOnCostPercent)
      let estAnnualDiv = 0;
      if (typeof h.yieldOnCostPercent === 'number' && h.yieldOnCostPercent > 0 && h.totalCostBasis > 0) {
        estAnnualDiv = Math.min(h.totalCostBasis * (h.yieldOnCostPercent / 100), h.totalDividends || Infinity);
      } else if (h.totalDividends && h.totalDividends > 0) {
        // 若無成本殖利率，以累計配息作保底估算
        estAnnualDiv = h.totalDividends;
      }
      if (estAnnualDiv <= 0) return sum;
      return sum + (h.currency === 'USD' ? estAnnualDiv * usdToTwdRate : estAnnualDiv);
    }, 0);

    return generateZavyAnalysisReport({
      snapshot: macroSnapshot,
      breadth: marketBreadth,
      marginStatus,
      holdings,
      cashBalanceTwd,
      usdToTwdRate,
      loans,
      annualEstimatedDividendsTwd,
      isAtBollingerLowerBand,
      isBadNewsDivergenceObserved,
      maxDrawdownTolerancePercent: maxTolerancePercent,
    });
  }, [
    macroSnapshot,
    marketBreadth,
    marginStatus,
    holdings,
    cashBalanceTwd,
    usdToTwdRate,
    loans,
    isAtBollingerLowerBand,
    isBadNewsDivergenceObserved,
    maxTolerancePercent,
  ]);

  // 4. 檔案下載導出輔助器
  const handleDownloadMarkdown = () => {
    const md = exportZavyReportMarkdown(analysisReport);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${new Date().toISOString().slice(0, 10)}_Zavy_台美股市場紀要與雙軌配置報告.md`;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const csv = exportZavyRawDataCsv(macroSnapshot, marketBreadth);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${new Date().toISOString().slice(0, 10)}_Zavy_台美股與總經原始數據.csv`;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 頂部 HUD 與操作列 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🐢 Zavy 慢富週期與雙軌配置工作區
          </h2>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            大局觀 · 不對漣漪起反應 · 見自己 · 把路走完
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowBeginnerGuide((prev) => !prev)}
            aria-expanded={showBeginnerGuide}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: showBeginnerGuide
                ? 'rgba(56, 189, 248, 0.2)'
                : 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <BookOpen size={16} />
            新手 30 秒慢富導覽 {showBeginnerGuide ? '▲' : '▼'}
          </button>

          <button
            onClick={() => setIsTenSecModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#10b981',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <Zap size={16} />
            10 秒快速校準
          </button>

          <button
            onClick={handleDownloadMarkdown}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#334155',
              border: 'none',
              color: '#f8fafc',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <FileDown size={16} />
            導出報告 (MD)
          </button>

          <button
            onClick={handleDownloadCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#334155',
              border: 'none',
              color: '#f8fafc',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            原始數據 (CSV)
          </button>
        </div>
      </div>

      {/* 可收合的新手 30 秒慢富導覽橫幅 (Step 1~3) */}
      {showBeginnerGuide && (
        <div
          style={{
            background:
              'linear-gradient(90deg, rgba(56, 189, 248, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
              📖 新手小白 30 秒看懂慢富三步驟（點擊畫面中帶有「i」的專有名詞，皆可展開四段式白話比喻與買賣指引）
            </div>
            <button
              onClick={() => setShowBeginnerGuide(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              收合 ✕
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                borderRadius: '10px',
                padding: '12px 14px',
                borderLeft: '3px solid #38bdf8',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                🔭 第一步：看天氣（鏡頭一）
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                分辨現在是「2~4 年製造業擴張期」還是「系統性衰退」。只要大方向順風且信用雷達無紅燈，每天的新聞大跌都只是水面「漣漪」，切記<strong>勿對漣漪起反應</strong>。
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                borderRadius: '10px',
                padding: '12px 14px',
                borderLeft: '3px solid #10b981',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                🌡️ 第二步：量體溫（鏡頭二）
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                在景氣擴張期中，若短線 20MA 市場寬度跌破 20% 且散戶融資清洗充分（去槓桿比率 &ge; 1.0），代表浮現<strong>波浪回檔黃金買點</strong>，千萬別砍在阿呆谷！
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                borderRadius: '10px',
                padding: '12px 14px',
                borderLeft: '3px solid #f59e0b',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                🛡️ 第三步：穿防彈衣（鏡頭三）
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                「見自己」選擇適合你的軌道：用耐受回撤鎖定安全持股上限與優先還質押借貸（A 軌），或<strong>存量不動、用股息活水轉買純公債與黃金防彈衣</strong>（B 軌），安心把路走完。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 鏡頭一：總體經濟三級週期羅盤 */}
      <ZavyMacroCompassCard evaluation={analysisReport.macroCompass} snapshot={macroSnapshot} />

      {/* 鏡頭二：台美市場結構、多週期寬度與融資去槓桿 */}
      <ZavyMarketBreadthCard
        breadth={analysisReport.marketBreadth.tw}
        marginStatus={analysisReport.marketBreadth.marginDeleveraging}
        interpretation={analysisReport.marketBreadth.interpretation}
        bottomingChecklist={analysisReport.marketBreadth.bottomingChecklist}
      />

      {/* 鏡頭三：「見自己」A/B 雙軌決策卡片 */}
      <ZavyDualTrackDecisionCard
        trackA={analysisReport.trackA}
        trackB={analysisReport.trackB}
        onUpdateTolerance={(tol) => setMaxTolerancePercent(tol)}
      />

      {/* 10 秒快速校準彈窗 */}
      <ZavyTenSecondsModal
        isOpen={isTenSecModalOpen}
        onClose={() => setIsTenSecModalOpen(false)}
        report={analysisReport}
      />
    </div>
  );
};

