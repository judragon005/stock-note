import React from 'react';
import { UploadCloud, FileText, Database, X, AlertTriangle } from 'lucide-react';
import { TradeRecord } from '../types/stock';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  incomingTrades: TradeRecord[];
  skippedCount: number;
  existingCount: number;
  onConfirmOverwrite: (trades: TradeRecord[]) => void;
  onConfirmMerge: (trades: TradeRecord[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  fileName,
  incomingTrades,
  skippedCount,
  existingCount,
  onConfirmOverwrite,
  onConfirmMerge,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ maxWidth: '520px', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              padding: '8px',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#3b82f6'
            }}>
              <UploadCloud size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                資料匯入與還原模式選擇
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                來源檔案: {fileName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Box */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '20px',
          fontSize: '0.85rem',
          lineHeight: '1.6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>目前現有交易筆數：</span>
            <strong className="mono" style={{ color: 'var(--text-primary)' }}>{existingCount} 筆</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>檔案解析有效紀錄：</span>
            <strong className="mono" style={{ color: '#10b981' }}>{incomingTrades.length} 筆</strong>
          </div>
          {skippedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.8rem', marginTop: '4px' }}>
              <AlertTriangle size={14} />
              <span>注意：已略過 {skippedCount} 筆格式不符或缺少必要欄位之行數。</span>
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {/* Option 1: Overwrite */}
          <button
            onClick={() => onConfirmOverwrite(incomingTrades)}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px',
              borderRadius: '10px',
              textAlign: 'left',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.05)',
              cursor: 'pointer'
            }}
          >
            <Database size={20} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>
                全量覆蓋 (Overwrite)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                以檔案中的 {incomingTrades.length} 筆紀錄完全取代目前所有資料（適合完整備份還原）。
              </div>
            </div>
          </button>

          {/* Option 2: Merge & Append */}
          <button
            onClick={() => onConfirmMerge(incomingTrades)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px',
              borderRadius: '10px',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <FileText size={20} style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                追加合併 (Append & Merge)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '2px', opacity: 0.9 }}>
                保留既有 {existingCount} 筆資料，將檔案中的新紀錄合併進來（自動以 ID 去重）。
              </div>
            </div>
          </button>
        </div>

        {/* Footer cancel */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
