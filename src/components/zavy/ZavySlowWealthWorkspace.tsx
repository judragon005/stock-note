import React, { useState, useEffect, useMemo } from 'react';
import { FileDown, Download, Zap } from 'lucide-react';
import { HoldingPosition, BrokerAccount } from '../../types/stock';
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
}

export const ZavySlowWealthWorkspace: React.FC<ZavySlowWealthWorkspaceProps> = ({
  holdings,
  accounts: _accounts,
  totalNavTwd: _totalNavTwd,
  cashBalanceTwd = 0,
}) => {
  const [isTenSecModalOpen, setIsTenSecModalOpen] = useState(false);
  const [maxTolerancePercent, setMaxTolerancePercent] = useState(20);

  // 1. 總經快照與市場寬度狀態 (串接 API 或預設值)
  const [macroSnapshot, setMacroSnapshot] = useState<MacroIndicatorSnapshot>({
    usIsmPmi: 51.5,
    usNewOrdersMinusInventory: 2.8,
    twPmi: 53.8,
    twExportOrdersYoY: 11.5,
    treasuryYield10y: 4.45,
    treasuryYield2y: 4.25,
    yieldSpread10y2y: 0.20,
    highYieldSpreadOas: 3.25,
    cccHighYieldSpread: 7.8,
    usCpiYoY: 2.7,
  });

  const [marketBreadth, setMarketBreadth] = useState<MultiHorizonMarketBreadth>({
    asOfDate: new Date().toISOString().slice(0, 10),
    market: 'TW',
    breadth20: 38.5,
    breadth60: 55.2,
    breadth200: 71.0,
    totalFilteredStocks: 1948,
  });

  const [marginStatus] = useState<MarginDeleveragingStatus>({
    asOfDate: new Date().toISOString().slice(0, 10),
    indexDrawdownPercent: -5.2,
    marginDrawdownPercent: -6.8,
    marginDeleveragingRatio: 1.31,
    isDeleveragingSufficient: true,
    statusText: '融資減幅 (-6.8%) 超過大盤跌幅 (-5.2%)，融資清洗充分。',
  });

  // 2. 背景請求最新總經與市場寬度
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      try {
        const macroRes = await fetch('/api/market/macro');
        if (macroRes.ok && isMounted) {
          const data = await macroRes.json();
          if (data && data.pulse) {
            setMacroSnapshot((prev) => ({
              ...prev,
              treasuryYield10y: data.pulse.treasuryYield10y ?? prev.treasuryYield10y,
              highYieldSpreadOas: data.pulse.highYieldSpread ?? prev.highYieldSpreadOas,
              cccHighYieldSpread: data.pulse.cccSpreadOas ?? prev.cccHighYieldSpread,
            }));
          }
        }
      } catch {
        // 靜默容錯，保持預設高品質數值
      }

      try {
        const breadthRes = await fetch('/api/market/breadth?market=TW');
        if (breadthRes.ok && isMounted) {
          const bData = await breadthRes.json();
          if (bData && bData.success && bData.data) {
            setMarketBreadth(bData.data);
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

  // 3. 核心報告運算
  const analysisReport = useMemo(() => {
    return generateZavyAnalysisReport({
      snapshot: macroSnapshot,
      breadth: marketBreadth,
      marginStatus,
      holdings,
      cashBalanceTwd,
      maxDrawdownTolerancePercent: maxTolerancePercent,
    });
  }, [macroSnapshot, marketBreadth, marginStatus, holdings, cashBalanceTwd, maxTolerancePercent]);

  // 4. 檔案下載導出輔助器
  const handleDownloadMarkdown = () => {
    const md = exportZavyReportMarkdown(analysisReport);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${new Date().toISOString().slice(0, 10)}_Zavy_台美股市場紀要與雙軌配置報告.md`;
    a.click();
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

