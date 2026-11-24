import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, Download, Database, CheckCircle2 } from 'lucide-react';
import { ModalShell } from './common/ModalShell';

export interface ExportDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradesCount: number;
  cashTransactionsCount: number;
  accountsCount: number;
  loansCount: number;
  onConfirmExport: (redactSensitive: boolean) => Promise<void> | void;
}

export const ExportDatabaseModal: React.FC<ExportDatabaseModalProps> = ({
  isOpen,
  onClose,
  tradesCount,
  cashTransactionsCount,
  accountsCount,
  loansCount,
  onConfirmExport,
}) => {
  const [isRedacted, setIsRedacted] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onConfirmExport(isRedacted);
      onClose();
    } catch (err) {
      alert(`匯出失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      closeLocked={isExporting}
      maxWidth="580px"
      padding="24px"
      ariaLabelledBy="export-db-modal-title"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color, #2a2e39)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database className="text-primary" size={20} />
          <h3 id="export-db-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
            系統全態封包匯出 (跨裝置 / NAS 遷移)
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isExporting}
          aria-label="關閉匯出對話框"
          className="btn btn-ghost btn-sm"
          style={{ padding: '4px', cursor: isExporting ? 'not-allowed' : 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

        {/* Payload Inventory */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', border: '1px solid var(--border-color, #2a2e39)' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
            📦 本次匯出將同態封裝以下核心實體：
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} className="text-success" style={{ color: '#10b981' }} />
              <span>歷史交易帳本：<strong>{tradesCount}</strong> 筆</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} className="text-success" style={{ color: '#10b981' }} />
              <span>現金與借貸流水：<strong>{cashTransactionsCount}</strong> 筆</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} className="text-success" style={{ color: '#10b981' }} />
              <span>券商與交割帳戶：<strong>{accountsCount}</strong> 組</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} className="text-success" style={{ color: '#10b981' }} />
              <span>不限用途借貸/質押：<strong>{loansCount}</strong> 筆</span>
            </div>
          </div>
        </div>

        {/* Dual-Track Security Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
            選擇金鑰安全與隱私防護等級：
          </label>

          {/* Option A: Sanitized (Default) */}
          <div
            onClick={() => setIsRedacted(true)}
            style={{
              border: `1.5px solid ${isRedacted ? '#10b981' : 'var(--border-color, #334155)'}`,
              background: isRedacted ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <input
                type="radio"
                checked={isRedacted}
                onChange={() => setIsRedacted(true)}
                style={{ cursor: 'pointer' }}
              />
              <ShieldCheck size={16} style={{ color: '#10b981' }} />
              <strong style={{ fontSize: '0.9rem', color: '#10b981' }}>
                [推薦] 🛡️ 安全脫敏備份 (自動抹除 API 金鑰)
              </strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', paddingLeft: '24px', lineHeight: '1.4' }}>
              自動抹除 FinMind、FMP、AI 等外部金鑰，安全無憑證外洩風險。遷移至新環境後，僅需於【設定】頁面補填金鑰即可恢復即時行情。
            </div>
          </div>

          {/* Option B: Full Unredacted */}
          <div
            onClick={() => setIsRedacted(false)}
            style={{
              border: `1.5px solid ${!isRedacted ? '#f59e0b' : 'var(--border-color, #334155)'}`,
              background: !isRedacted ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <input
                type="radio"
                checked={!isRedacted}
                onChange={() => setIsRedacted(false)}
                style={{ cursor: 'pointer' }}
              />
              <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
              <strong style={{ fontSize: '0.9rem', color: '#f59e0b' }}>
                ⚠️ 完整遷移備份 (包含 API 金鑰，家用 NAS 專用)
              </strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', paddingLeft: '24px', lineHeight: '1.4' }}>
              一鍵無縫搬遷至個人家用 NAS 私有雲，無需重新輸入 API 金鑰。
            </div>

            {!isRedacted && (
              <div
                style={{
                  marginTop: '10px',
                  marginLeft: '24px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  lineHeight: '1.4',
                }}
              >
                ⚠️ <strong>極高風險警告：</strong>此檔案將包含<strong>明文 API Token</strong>！僅限於您個人信任的私有硬體（如自家內網 QNAP NAS）使用。<strong>絕對嚴禁</strong>上傳至 GitHub、公開 Google Drive、Email 或傳送他人！
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color, #2a2e39)', paddingTop: '14px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isExporting}>
            取消
          </button>
          <button
            className={`btn ${isRedacted ? 'btn-primary' : 'btn-warning'}`}
            onClick={handleExport}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isRedacted ? '#10b981' : '#d97706',
              borderColor: isRedacted ? '#10b981' : '#d97706',
              color: '#ffffff',
            }}
          >
            <Download size={15} />
            <span>{isExporting ? '匯出中...' : `立即匯出 ${isRedacted ? '安全脫敏' : '完整遷移'} JSON`}</span>
          </button>
        </div>
    </ModalShell>
  );
};
