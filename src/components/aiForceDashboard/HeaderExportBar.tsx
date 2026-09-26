import React, { useState } from 'react';
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
  { id: 'DASHBOARD_PNG', label: '下載儀表板 PNG', icon: '📸' },
  { id: 'ALL_CHARTS_PNG', label: '下載全部圖表 PNG', icon: '🖼️' },
  { id: 'CSV', label: '下載資料 CSV', icon: '📊' },
  { id: 'HTML', label: '下載總結報告 HTML', icon: '📑' },
  { id: 'PDF', label: '列印 / 匯出 PDF', icon: '🖨️' },
];

export interface HeaderExportBarProps {
  report: AiForceDashboardReport;
}

export const HeaderExportBar: React.FC<HeaderExportBarProps> = ({ report }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div
      data-testid="header-export-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '4px' }}>量化決策工具匯出：</span>
        {EXPORT_ACTIONS_CONFIG.map((act) => (
          <button
            key={act.id}
            type="button"
            data-testid={`export-btn-${act.id}`}
            onClick={() => handleAction(act.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
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
              e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            <span>{act.icon}</span>
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
