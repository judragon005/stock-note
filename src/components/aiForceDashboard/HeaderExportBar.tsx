import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, Search } from 'lucide-react';
import type { AiForceDashboardReport } from '../../types/aiForceDashboard';
import {
  triggerCsvDownload,
  triggerHtmlDownload,
  triggerPrintPdf,
  triggerAllChartsDownload,
} from '../../engine/exportReportPipeline';
import { triggerDashboardCanvasPngDownload } from '../../engine/dashboardCanvasExporter';
import { getInvestmentMemo } from '../../utils/investmentMemoStorage';

export interface ExportActionItem {
  id: 'DASHBOARD_PNG' | 'ALL_CHARTS_PNG' | 'CSV' | 'HTML' | 'PDF';
  label: string;
  icon: 'download' | 'printer';
}

export const EXPORT_ACTIONS_CONFIG: ExportActionItem[] = [
  { id: 'DASHBOARD_PNG', label: '下載儀表板 PNG', icon: 'download' },
  { id: 'ALL_CHARTS_PNG', label: '下載全部圖表 PNG', icon: 'download' },
  { id: 'CSV', label: '下載資料 CSV', icon: 'download' },
  { id: 'HTML', label: '下載總結報告 HTML', icon: 'download' },
  { id: 'PDF', label: '列印 / PDF', icon: 'printer' },
];

export interface HeaderExportBarProps {
  report: AiForceDashboardReport;
  sourcesText?: string;
  rangeText?: string;
  onOpenDeepDive?: () => void;
}

/**
 * 安全解析並動態綁定匯出列之來源與區間文字 (Ticket 01 - 淘汰死板假數據)
 */
export function resolveExportBarTexts(
  report: AiForceDashboardReport,
  customSources?: string,
  customRange?: string
): { sourcesText: string; rangeText: string } {
  const defaultSources =
    report.market === 'US'
      ? '資料來源：日 K Yahoo Finance | SEC EDGAR'
      : '資料來源：日 K TWSE | 法人 TWSE | 融資券 FinMind';
  const sourcesText =
    customSources ||
    report.marketBar?.dataSourceText ||
    defaultSources;

  const rangeText =
    customRange ||
    report.marketBar?.dataRangeText ||
    '歷史行情資料';

  return { sourcesText, rangeText };
}

export const HeaderExportBar: React.FC<HeaderExportBarProps> = ({
  report,
  sourcesText: customSourcesText,
  rangeText: customRangeText,
  onOpenDeepDive,
}) => {
  const { sourcesText, rangeText } = resolveExportBarTexts(
    report,
    customSourcesText,
    customRangeText
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);


  const handleAction = (id: ExportActionItem['id']) => {
    switch (id) {
      case 'CSV':
        triggerCsvDownload(report);
        showToast('已匯出安全 CSV 數據報表');
        break;
      case 'HTML':
        triggerHtmlDownload(report);
        showToast('已生成並下載獨立 HTML 總結報告');
        break;
      case 'PDF':
        triggerPrintPdf();
        break;
      case 'DASHBOARD_PNG': {
        const memo = getInvestmentMemo(report.symbol);
        Promise.resolve(triggerDashboardCanvasPngDownload(report, memo || undefined)).then((ok) => {
          if (ok !== false) {
            showToast('已生成並下載高解析度 1920x1080 決策快照圖檔 (PNG)');
          } else {
            showToast('快照生成失敗，請稍後再試');
          }
        });
        break;
      }
      case 'ALL_CHARTS_PNG': {
        showToast('正在為您掃描並打包所有圖表快照...');
        triggerAllChartsDownload(report.symbol).then((count) => {
          if (count > 0) {
            showToast(`已成功匯出 ${count} 張圖表 PNG 圖檔`);
          } else {
            showToast('未偵測到可匯出之圖表元素');
          }
        });
        break;
      }
    }
  };

  const showToast = (msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  return (
    <div
      data-testid="header-export-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '6px 14px',
        backgroundColor: '#0B101B',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* 左側：資料來源與區間說明 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{sourcesText}</span>
        <span style={{ color: '#94a3b8' }}>{rangeText}</span>
      </div>

      {/* 右側：7步投研按鈕與 5 大匯出按鈕 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {onOpenDeepDive && (
          <button
            type="button"
            data-testid="export-btn-deep-dive"
            onClick={onOpenDeepDive}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.25)';
              e.currentTarget.style.borderColor = '#38bdf8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.14)';
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
            }}
            title="開啟全市場個股 7 步深度投研與決策閉環視窗"
          >
            <Search size={12} />
            <span>7步深度投研</span>
          </button>
        )}
        {EXPORT_ACTIONS_CONFIG.map((act) => (
          <button
            key={act.id}
            type="button"
            data-testid={`export-btn-${act.id}`}
            onClick={() => handleAction(act.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              e.currentTarget.style.color = '#38bdf8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            {act.icon === 'printer' ? <Printer size={12} /> : <Download size={12} />}
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      {toastMessage && (
        <span
          style={{
            fontSize: '12px',
            color: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          {toastMessage}
        </span>
      )}
    </div>
  );
};

export default HeaderExportBar;
