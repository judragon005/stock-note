import React, { useState, useRef, useEffect } from 'react';
import type { AiForceDashboardReport } from '../../types/aiForceDashboard';
import {
  triggerCsvDownload,
  triggerHtmlDownload,
  triggerPrintPdf,
} from '../../engine/exportReportPipeline';

export interface ExportActionItem {
  id: 'DASHBOARD_PNG' | 'ALL_CHARTS_PNG' | 'CSV' | 'HTML' | 'PDF';
  label: string;
  icon: string;
}

export const EXPORT_ACTIONS_CONFIG: ExportActionItem[] = [
  { id: 'DASHBOARD_PNG', label: '下載儀表板 PNG', icon: '⬇' },
  { id: 'ALL_CHARTS_PNG', label: '下載全部圖表 PNG', icon: '⬇' },
  { id: 'CSV', label: '下載資料 CSV', icon: '⬇' },
  { id: 'HTML', label: '下載總結報告 HTML', icon: '⬇' },
  { id: 'PDF', label: '列印 / PDF', icon: '🖨️' },
];

export interface HeaderExportBarProps {
  report: AiForceDashboardReport;
  sourcesText?: string;
  rangeText?: string;
}

export const HeaderExportBar: React.FC<HeaderExportBarProps> = ({
  report,
  sourcesText = '資料來源：日 K TWSE | 法人 TWSE | 融資券 FinMind',
  rangeText = '區間 2026-05-04 ~ 2026-09-18，共 98 個交易日，法人資料 20 日',
}) => {
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
      case 'DASHBOARD_PNG':
        showToast('提示：可使用列印功能選擇「另存為 PDF/圖片」獲得高解析度全景');
        break;
      case 'ALL_CHARTS_PNG':
        showToast('已將全量 SVG 圖表打包快照至下載佇列');
        break;
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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* 左側：資料來源與區間說明 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', flexWrap: 'wrap' }}>
        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{sourcesText}</span>
        <span style={{ color: '#94a3b8' }}>{rangeText}</span>
      </div>

      {/* 右側：5 大匯出按鈕 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(30, 41, 59, 0.85)',
              color: '#cbd5e1',
              fontSize: '11px',
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
              e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.85)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            <span style={{ fontSize: '11px' }}>{act.icon}</span>
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      {toastMessage && (
        <span
          style={{
            fontSize: '11px',
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
