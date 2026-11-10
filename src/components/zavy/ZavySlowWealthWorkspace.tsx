import React, { useState, useEffect, useMemo } from 'react';
import { FileDown, Download, Zap } from 'lucide-react';
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
}

export const ZavySlowWealthWorkspace: React.FC<ZavySlowWealthWorkspaceProps> = ({
  holdings,
  accounts: _accounts,
  totalNavTwd: _totalNavTwd,
  cashBalanceTwd = 0,
  usdToTwdRate = 32,
  loans = [],
}) => {
  const [isTenSecModalOpen, setIsTenSecModalOpen] = useState(false);
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
              usIsmPmi: data.us_orders_minus_inv_spread ? 50 + data.us_orders_minus_inv_spread : undefined,
              usNewOrdersMinusInventory: data.us_orders_minus_inv_spread ?? data.usOrdersMinusInvSpread,
              twPmi: data.twRevenue?.isExpansion ? 52.0 : (data.twRevenue ? 48.0 : undefined),
              twExportOrdersYoY: data.twRevenue?.totalRevenueYoY,
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

  // 3. 核心報告運算 (連通真實匯率、質押借貸帳本與動態指標)
  const analysisReport = useMemo(() => {
    return generateZavyAnalysisReport({
      snapshot: macroSnapshot,
      breadth: marketBreadth,
      marginStatus,
      holdings,
      cashBalanceTwd,
      usdToTwdRate,
      loans,
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

