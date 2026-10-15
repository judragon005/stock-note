import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BrainCircuit,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Code2,
} from 'lucide-react';
import { StrategicFactDigest, StrategicPromptResult } from '../../types/strategicPrompt';
import { generateStrategicPrompt } from '../../engine/strategicPromptEngine';
import { logger } from '../../utils/logger';

export interface WarRoomPromptCardProps {
  digest: StrategicFactDigest;
  className?: string;
  isLoading?: boolean;
  isDataPending?: boolean;
}

/**
 * 兩階段安全剪貼簿複製器 (Spec 0181 / Ticket 13)
 */
async function safeCopyToClipboard(text: string): Promise<boolean> {
  // 1. 優先使用標準 Clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      logger.warn('navigator.clipboard.writeText 失敗，嘗試降級 execCommand:', err);
    }
  }

  // 2. 降級使用 textarea execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    logger.error('剪貼簿安全降級複製亦失敗:', fallbackErr);
    return false;
  }
}

/**
 * 主力戰情室底層：AI 戰情提示詞與外聯中樞 (Spec 0181 / Tickets 12~15)
 */
export const WarRoomPromptCard: React.FC<WarRoomPromptCardProps> = ({
  digest,
  className = '',
  isLoading = false,
  isDataPending = false,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<boolean>(false);
  const [desensitized, setDesensitized] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // 2 秒定時器清理防記憶體洩漏 (Ticket 14)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (copied) {
      timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [copied]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (copyError) {
      timer = setTimeout(() => {
        setCopyError(false);
      }, 4000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [copyError]);

  // 生成高濃度 Master Prompt
  const promptResult: StrategicPromptResult = useMemo(() => {
    return generateStrategicPrompt(digest, {
      mode: 'FULL_MASTER',
      desensitized,
    });
  }, [digest, desensitized]);

  // 複製處理函式 (若失敗自動展開預覽抽屜防死寂)
  const handleCopy = useCallback(async () => {
    if (isLoading || isDataPending) return;
    const success = await safeCopyToClipboard(promptResult.promptText);
    if (success) {
      setCopied(true);
      setCopyError(false);
    } else {
      setCopyError(true);
      setShowPreview(true); // 自動展開抽屜供手動複製
    }
  }, [promptResult.promptText, isLoading, isDataPending]);

  return (
    <div
      data-layer="war-room-prompt-hub"
      className={className}
      style={{
        background: 'var(--bg-card, #111827)',
        border: '1px solid var(--border-color, #374151)',
        borderRadius: '14px',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.12))',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 頂部標題列與微徽章 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <BrainCircuit size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>
                ⚡ AI 戰情提示詞與外聯中樞
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontWeight: 500,
                }}
              >
                Grounded v13.5
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary, #9ca3af)' }}>
              已錨定即時量價、結算籌碼與前端算術防線，一鍵複製貼入 ChatGPT / Claude / Gemini
            </p>
          </div>
        </div>

        {/* 右側控制項：脫敏開關與 Token 預估 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setDesensitized(!desensitized)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              background: desensitized ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: desensitized ? '#34d399' : '#f87171',
              border: `1px solid ${desensitized ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              transition: 'all 0.2s ease',
            }}
            title={desensitized ? '個人持股金額已脫敏隱藏' : '警告：將輸出具體持股比例'}
          >
            {desensitized ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            <span>{desensitized ? '持股金額已脫敏 🛡️' : '未脫敏 ⚠️'}</span>
          </button>

          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #9ca3af)',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'var(--bg-secondary, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border-color, #374151)',
            }}
          >
            約 {promptResult.estimatedTokens} Tokens
          </span>
        </div>
      </div>

      {/* 主操作列：大按鈕一鍵複製與成功微反饋 (Ticket 14) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-secondary, rgba(255, 255, 255, 0.02))',
          padding: '12px 14px',
          borderRadius: '10px',
          border: '1px solid var(--border-color, #374151)',
        }}
      >
        <button
          type="button"
          aria-label="一鍵複製 AI 戰情提示詞"
          disabled={isLoading || isDataPending}
          onClick={handleCopy}
          style={{
            flex: 1,
            minWidth: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isLoading || isDataPending ? 'not-allowed' : 'pointer',
            opacity: isLoading || isDataPending ? 0.6 : 1,
            background: copied
              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
              : isLoading || isDataPending
              ? '#374151'
              : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: copied
              ? '0 2px 10px rgba(16, 185, 129, 0.35)'
              : isLoading || isDataPending
              ? 'none'
              : '0 2px 10px rgba(59, 130, 246, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>
            {copied
              ? '✅ 已複製！可直接按 Ctrl+V 貼入 ChatGPT / Claude'
              : isLoading
              ? '⏳ 數據同步校準中...'
              : isDataPending
              ? '⚠️ 標的數據待命中 (請在線回補)'
              : `一鍵複製 AI 戰情提示詞 (${digest.quote.symbol} ${digest.quote.name})`}
          </span>
        </button>

        <button
          type="button"
          aria-label="切換 Prompt 預覽抽屜"
          aria-expanded={showPreview}
          onClick={() => setShowPreview(!showPreview)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            background: 'var(--bg-card, #1f2937)',
            color: 'var(--text-secondary, #9ca3af)',
            border: '1px solid var(--border-color, #4b5563)',
            transition: 'all 0.2s ease',
          }}
        >
          <Code2 size={15} />
          <span>檢視 Prompt 預覽</span>
          {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 複製失敗安全引導橫幅 (Ticket 03) */}
      {copyError && (
        <div
          data-testid="copy-error-toast"
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️ 瀏覽器安全性限制自動寫入剪貼簿，已為您自動展開下方預覽，請直接手動選取複製。</span>
        </div>
      )}

      {/* 可折疊 Prompt 預覽抽屜 (Ticket 15) */}
      {showPreview && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-color, #374151)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: 'var(--text-secondary, #9ca3af)',
            }}
          >
            <span>XML 結構化提示詞預覽 (已過濾時空幻覺與算術代勞)</span>
            <span>長度: {promptResult.promptText.length} 字元</span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '10px',
              background: '#090d16',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
              color: '#a7f3d0',
              overflowX: 'auto',
              maxHeight: '260px',
              overflowY: 'auto',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {promptResult.promptText}
          </pre>
        </div>
      )}
    </div>
  );
};
