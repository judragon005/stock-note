import React, { useState } from 'react';
import type { MacroPinnedStrategy } from '../../types/macro';

export interface MacroStrategyPinBarProps {
  pins: MacroPinnedStrategy[];
  onPasteAndPin: (rawText: string) => boolean;
  onRemovePin: (id: string) => void;
  currentSoxIndex?: number;
  currentTaiexIndex?: number;
}

export const MacroStrategyPinBar: React.FC<MacroStrategyPinBarProps> = ({
  pins,
  onPasteAndPin,
  onRemovePin,
  currentSoxIndex,
  currentTaiexIndex,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleApplyPaste = () => {
    if (!pasteInput.trim()) return;
    const ok = onPasteAndPin(pasteInput);
    if (ok) {
      setPasteInput('');
      setIsDrawerOpen(false);
      setFeedbackMsg('✅ 已成功解析並釘選外部 AI 宏觀戰略！');
    } else {
      setFeedbackMsg('⚠️ 未偵測到有效 JSON 戰略區塊，請貼入包含 recommendedEquityCapPercent 之回覆。');
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div
      className="card"
      style={{
        padding: '12px 16px',
        marginBottom: '16px',
        background: 'rgba(15, 23, 42, 0.72)',
        border: '1px solid rgba(168, 85, 247, 0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem' }}>📌</span>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            外部 AI 智囊團宏觀戰略釘選列 (Macro Strategy Loopback Pin)
          </span>
          {pins.length > 0 && (
            <span
              className="badge"
              style={{
                background: 'rgba(168, 85, 247, 0.18)',
                color: '#c084fc',
                fontSize: '0.7rem',
              }}
            >
              已釘選 {pins.length} 組模型決策
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {feedbackMsg && (
            <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{feedbackMsg}</span>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            style={{ fontSize: '0.75rem', padding: '5px 12px' }}
          >
            {isDrawerOpen ? '收合貼入框' : '📥 貼回外部 AI 戰略 JSON'}
          </button>
        </div>
      </div>

      {isDrawerOpen && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            aria-label="外部 AI 宏觀戰略貼入框"
            rows={3}
            placeholder={'貼入 Claude / ChatGPT / Gemini 回覆（支援整篇 Markdown 或 JSON，如 {"aiModel":"Claude 3.5 Sonnet","recommendedEquityCapPercent":65,"soxSupportLevel":5000,"taiexSupportLevel":22500,"tacticalSummary":"費半守穩月線，拉回分批低接"}）'}
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'var(--bg-primary, #0f172a)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApplyPaste}
              style={{ fontSize: '0.76rem', padding: '5px 14px' }}
            >
              📌 解析並釘選戰略
            </button>
          </div>
        </div>
      )}

      {pins.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          {pins.map((pin) => {
            const soxBreached =
              pin.soxSupportLevel !== undefined &&
              currentSoxIndex !== undefined &&
              currentSoxIndex > 0 &&
              currentSoxIndex < pin.soxSupportLevel;
            const taiexBreached =
              pin.taiexSupportLevel !== undefined &&
              currentTaiexIndex !== undefined &&
              currentTaiexIndex > 0 &&
              currentTaiexIndex < pin.taiexSupportLevel;

            return (
              <div
                key={pin.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background:
                    soxBreached || taiexBreached
                      ? 'rgba(239, 68, 68, 0.14)'
                      : 'rgba(30, 41, 59, 0.85)',
                  border:
                    soxBreached || taiexBreached
                      ? '1px solid var(--loss-color)'
                      : '1px solid rgba(148, 163, 184, 0.18)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: '#d8b4fe',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    🤖 {pin.aiModel}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(59, 130, 246, 0.18)',
                      color: '#60a5fa',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    建議持股上限 ≤ {pin.recommendedEquityCapPercent}%
                  </span>
                  {pin.soxSupportLevel && (
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.74rem',
                        color: soxBreached ? 'var(--loss-color)' : 'var(--text-secondary)',
                        fontWeight: soxBreached ? 800 : 500,
                      }}
                    >
                      ^SOX 防守 {pin.soxSupportLevel.toLocaleString()}
                      {soxBreached ? ' (🚨跌破)' : ''}
                    </span>
                  )}
                  {pin.taiexSupportLevel && (
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.74rem',
                        color: taiexBreached ? 'var(--loss-color)' : 'var(--text-secondary)',
                        fontWeight: taiexBreached ? 800 : 500,
                      }}
                    >
                      台股防守 {pin.taiexSupportLevel.toLocaleString()}
                      {taiexBreached ? ' (🚨跌破)' : ''}
                    </span>
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    {pin.tacticalSummary}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePin(pin.id)}
                  title="移除釘選"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

