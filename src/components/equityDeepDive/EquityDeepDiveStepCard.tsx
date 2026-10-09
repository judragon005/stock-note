import React, { useState } from 'react';
import { copyTextToClipboard } from '../../utils/clipboard';

export interface EquityDeepDiveStepCardProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  promptContent: string;
  defaultOpen?: boolean;
}

export const EquityDeepDiveStepCard: React.FC<EquityDeepDiveStepCardProps> = ({
  stepNumber,
  title,
  subtitle,
  promptContent,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyTextToClipboard(promptContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      data-testid={`deep-dive-step-${stepNumber}`}
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '12px',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 標題列 */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isOpen ? 'rgba(56, 189, 248, 0.06)' : 'transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {stepNumber}
          </span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc' }}>
              {title}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {subtitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            data-testid={`copy-step-${stepNumber}-btn`}
            onClick={handleCopy}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              backgroundColor: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              color: copied ? '#4ade80' : '#cbd5e1',
              border: `1px solid ${copied ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? '✓ 已複製 Prompt' : '📋 複製本步'}
          </button>
          <span style={{ color: '#64748b', fontSize: '14px' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* 展開之 Prompt 預覽區塊 */}
      {isOpen && (
        <div
          data-testid={`step-${stepNumber}-content`}
          style={{
            padding: '16px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {promptContent}
          </pre>
        </div>
      )}
    </div>
  );
};
