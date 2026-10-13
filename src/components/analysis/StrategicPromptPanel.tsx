import React, { useState, useMemo, useCallback } from 'react';
import {
  BrainCircuit,
  ShieldCheck,
  ShieldAlert,
  Check,
  Copy,
  SlidersHorizontal,
  Code2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  StrategicFactDigest,
  SixThinkingHatDimension,
  StrategicPromptResult,
} from '../../types/strategicPrompt';
import {
  generateStrategicPrompt,
  SIX_HATS_CONFIG,
} from '../../engine/strategicPromptEngine';
import { logger } from '../../utils/logger';

export interface StrategicPromptPanelProps {
  digest: StrategicFactDigest;
  className?: string;
}

export const StrategicPromptPanel: React.FC<StrategicPromptPanelProps> = ({
  digest,
  className = '',
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [desensitized, setDesensitized] = useState<boolean>(true);
  const [showXmlPreview, setShowXmlPreview] = useState<boolean>(false);
  const [selectedHat, setSelectedHat] = useState<SixThinkingHatDimension | null>(null);

  // 生成 Master Prompt
  const masterResult: StrategicPromptResult = useMemo(() => {
    return generateStrategicPrompt(digest, {
      mode: 'FULL_MASTER',
      desensitized,
    });
  }, [digest, desensitized]);

  // 生成當前選擇的單頂思考帽 Prompt (若有選取)
  const activePromptResult: StrategicPromptResult = useMemo(() => {
    if (selectedHat) {
      return generateStrategicPrompt(digest, {
        mode: 'SINGLE_HAT',
        targetHat: selectedHat,
        desensitized,
      });
    }
    return masterResult;
  }, [digest, selectedHat, desensitized, masterResult]);

  // 一鍵複製機制
  const handleCopy = useCallback(async (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure context
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (err) {
      logger.error('複製提示詞至剪貼簿失敗:', err);
    }
  }, []);

  const isEtf = digest.audit.isEtf;
  const tokenCount = activePromptResult.estimatedTokens;
  const tokenColor =
    tokenCount < 2000 ? '#10b981' : tokenCount < 3500 ? '#38bdf8' : tokenCount < 4500 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className={`strategic-prompt-panel ${className}`}
      style={{
        background: 'var(--bg-card, rgba(15, 23, 42, 0.72))',
        border: '1px solid var(--border-color, rgba(51, 65, 85, 0.45))',
        borderRadius: 'var(--radius-md, 14px)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-card, 0 10px 30px -5px rgba(0, 0, 0, 0.45))',
        backdropFilter: 'blur(12px)',
        color: 'var(--text-primary, #f8fafc)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* 頂部控制列 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-color, rgba(51, 65, 85, 0.45))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              flexShrink: 0,
            }}
          >
            <BrainCircuit size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                智策多維提示詞引擎
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isEtf ? 'rgba(56, 189, 248, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                  color: isEtf ? '#38bdf8' : '#c084fc',
                  border: `1px solid ${isEtf ? 'rgba(56, 189, 248, 0.4)' : 'rgba(139, 92, 246, 0.4)'}`,
                }}
              >
                {isEtf ? 'ETF 模式 (V3.0)' : '個股大師 (V12.0)'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', margin: '3px 0 0 0' }}>
              對齊華爾街六頂思考帽決策框架 · 零信任海關定錨 · 外部 LLM 深度覆盤
            </p>
          </div>
        </div>

        {/* 右側操作徽章群 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* 部位脫敏切換開關 */}
          <button
            type="button"
            onClick={() => setDesensitized((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: desensitized ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${desensitized ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: desensitized ? '#34d399' : '#f87171',
            }}
            title={desensitized ? '隱私保護開啟：隱去帳戶金額與真實股數' : '注意：當前將匯出部位明細'}
          >
            {desensitized ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            <span>{desensitized ? '部位已脫敏' : '脫敏關閉'}</span>
          </button>

          {/* Token 守門徽章 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 600,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: tokenColor,
            }}
          >
            <span>約 {tokenCount} Tokens</span>
          </div>

          {/* Master 一鍵複製主按鈕 */}
          <button
            type="button"
            onClick={() => handleCopy(activePromptResult.promptText, 'MASTER')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'all 0.15s ease',
              background:
                copiedKey === 'MASTER'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              boxShadow: copiedKey === 'MASTER' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : '0 4px 14px rgba(59, 130, 246, 0.35)',
            }}
          >
            {copiedKey === 'MASTER' ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedKey === 'MASTER' ? '已複製到剪貼簿！' : selectedHat ? '複製當前思考帽' : '一鍵複製 Master Prompt'}</span>
          </button>
        </div>
      </div>

      {/* 六頂思考帽分頁切換卡片區 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-secondary, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SlidersHorizontal size={14} style={{ color: '#818cf8' }} />
            六頂思考帽平行認知矩陣 (點選可單獨抽離複製)：
          </span>
          {selectedHat && (
            <button
              type="button"
              onClick={() => setSelectedHat(null)}
              style={{
                fontSize: '12px',
                color: 'var(--accent-primary, #3b82f6)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              切換回 Master 全量視野
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
          }}
        >
          {(Object.keys(SIX_HATS_CONFIG) as SixThinkingHatDimension[]).map((hatKey) => {
            const cfg = SIX_HATS_CONFIG[hatKey];
            const isSelected = selectedHat === hatKey;
            const isBlackHat = hatKey === 'BLACK';

            return (
              <div
                key={hatKey}
                onClick={() => setSelectedHat(isSelected ? null : hatKey)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isSelected
                    ? '2px solid #6366f1'
                    : isBlackHat
                    ? '1px solid rgba(239, 68, 68, 0.35)'
                    : '1px solid var(--border-color)',
                  background: isSelected
                    ? 'rgba(30, 41, 59, 0.95)'
                    : isBlackHat
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>{cfg.emoji}</span>
                    {isBlackHat && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        紅隊批判
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {cfg.nameZh}
                  </h4>
                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary, #94a3b8)',
                      margin: '4px 0 0 0',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {cfg.coreFocus.split('(')[0]}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {cfg.label}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const singleRes = generateStrategicPrompt(digest, {
                        mode: 'SINGLE_HAT',
                        targetHat: hatKey,
                        desensitized,
                      });
                      handleCopy(singleRes.promptText, `HAT_${hatKey}`);
                    }}
                    style={{
                      padding: '4px',
                      borderRadius: '4px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={`單獨複製 ${cfg.nameZh} 提示詞`}
                  >
                    {copiedKey === `HAT_${hatKey}` ? (
                      <Check size={13} style={{ color: '#10b981' }} />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 可折疊式 XML 提示詞預覽器 */}
      <div style={{ paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={() => setShowXmlPreview((prev) => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={15} style={{ color: '#818cf8' }} />
            <span>
              檢視即將注入之結構化 XML 語意提示詞 (
              {selectedHat ? `當前：${SIX_HATS_CONFIG[selectedHat].nameZh}` : 'Master 全量視野'})
            </span>
          </span>
          {showXmlPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showXmlPreview && (
          <div
            style={{
              marginTop: '10px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: '#040711',
              padding: '12px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                marginBottom: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              <span>XML Semantic Prompt Preview</span>
              <button
                type="button"
                onClick={() => handleCopy(activePromptResult.promptText, 'PREVIEW_COPY')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary, #3b82f6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                }}
              >
                {copiedKey === 'PREVIEW_COPY' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'PREVIEW_COPY' ? '已複製' : '複製代碼'}</span>
              </button>
            </div>
            <pre
              style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono, monospace)',
                color: '#34d399',
                whiteSpace: 'pre-wrap',
                maxHeight: '260px',
                overflowY: 'auto',
                lineHeight: 1.6,
                margin: 0,
                userSelect: 'all',
              }}
            >
              {activePromptResult.promptText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
