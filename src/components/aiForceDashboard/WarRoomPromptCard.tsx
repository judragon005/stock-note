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
  ClipboardList,
  Trophy,
  Trash2,
  AlertTriangle,
  Sparkles,
  X,
} from 'lucide-react';
import { StrategicFactDigest, StrategicPromptResult } from '../../types/strategicPrompt';
import { generateStrategicPrompt } from '../../engine/strategicPromptEngine';
import { logger } from '../../utils/logger';
import { PinnedStrategy, StrategyOutcomeRecord, MultiStrategyTriggerStatus } from '../../types/strategyPin';
import {
  parseLoopbackContentBatch,
  createPinnedStrategy,
  evaluateMultiStrategyTriggers,
  savePinnedStrategy,
  getPinnedStrategies,
  clearPinnedStrategy,
  recordStrategyOutcome,
  getStrategyOutcomeRecords,
  calculateModelWinRates,
} from '../../engine/strategyPinEngine';

export interface WarRoomPromptCardProps {
  digest: StrategicFactDigest;
  className?: string;
  isLoading?: boolean;
  isDataPending?: boolean;
}

// 緊湊條列清單共用樣式 Tokens (Spec 0201 / Nitpick Refactor)
const SYNDICATE_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '8px',
  padding: '6px 10px',
  borderRadius: '6px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  fontSize: '12px',
};

const OUTCOME_BTN_WIN_STYLE: React.CSSProperties = {
  background: 'rgba(16, 185, 129, 0.1)',
  color: '#34d399',
  border: '1px solid rgba(16, 185, 129, 0.25)',
  borderRadius: '3px',
  padding: '1px 5px',
  cursor: 'pointer',
  fontSize: '10px',
};

const OUTCOME_BTN_LOSS_STYLE: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.1)',
  color: '#f87171',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  borderRadius: '3px',
  padding: '1px 5px',
  cursor: 'pointer',
  fontSize: '10px',
};

const MODEL_BADGE_STYLE: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  padding: '1px 6px',
  borderRadius: '4px',
  background: 'rgba(147, 51, 234, 0.2)',
  color: '#d8b4fe',
  border: '1px solid rgba(147, 51, 234, 0.3)',
};

/**
 * 兩階段安全剪貼簿複製器 (Spec 0181 / Ticket 13)
 */
async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      logger.warn('navigator.clipboard.writeText 失敗，嘗試降級 execCommand:', err);
    }
  }

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
 * 主力戰情室底層：AI 戰情提示詞與外部 AI 回流釘選中樞 (Spec 0181 & Spec 0200)
 */
export const WarRoomPromptCard: React.FC<WarRoomPromptCardProps> = ({
  digest,
  className = '',
  isLoading = false,
  isDataPending = false,
}) => {
  const symbol = digest.quote.symbol;
  const currentPrice = digest.quote.currentPrice;

  // 提示詞複製與預覽狀態
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<boolean>(false);
  const [desensitized, setDesensitized] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // 回流協議與多模型釘選狀態 (Spec 0201 / Ticket 04)
  const [pinnedStrategies, setPinnedStrategies] = useState<PinnedStrategy[]>(() =>
    getPinnedStrategies(symbol)
  );
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteInputText, setPasteInputText] = useState<string>('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState<boolean>(false);
  const [pasteModalNotice, setPasteModalNotice] = useState<string | null>(null);

  // 智囊團勝率榜抽屜狀態
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [outcomeRecords, setOutcomeRecords] = useState<StrategyOutcomeRecord[]>(() =>
    getStrategyOutcomeRecords()
  );

  // 當 symbol 切換時重新載入對應釘選策略清單
  useEffect(() => {
    setPinnedStrategies(getPinnedStrategies(symbol));
  }, [symbol]);

  // 定時器清理
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (copied) {
      timer = setTimeout(() => setCopied(false), 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [copied]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (pasteSuccess) {
      timer = setTimeout(() => setPasteSuccess(false), 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pasteSuccess]);

  // 生成高濃度 Master Prompt
  const promptResult: StrategicPromptResult = useMemo(() => {
    return generateStrategicPrompt(digest, {
      mode: 'FULL_MASTER',
      desensitized,
    });
  }, [digest, desensitized]);

  // 多模型盤中觸價評估 (最嚴格停損優先 + 共識/分歧指標)
  const multiTriggerStatus: MultiStrategyTriggerStatus | null = useMemo(() => {
    if (pinnedStrategies.length === 0) return null;
    return evaluateMultiStrategyTriggers(pinnedStrategies, currentPrice);
  }, [pinnedStrategies, currentPrice]);

  // 勝率計算
  const modelWinRates = useMemo(() => {
    return calculateModelWinRates(outcomeRecords);
  }, [outcomeRecords]);

  // 提示詞複製處理
  const handleCopy = useCallback(async () => {
    if (isLoading || isDataPending) return;
    const success = await safeCopyToClipboard(promptResult.promptText);
    if (success) {
      setCopied(true);
      setCopyError(false);
    } else {
      setCopyError(true);
      setShowPreview(true);
    }
  }, [promptResult.promptText, isLoading, isDataPending]);

  // 套用貼入之回流內容 (支援單筆或多筆批次抽取)
  const handleApplyLoopback = useCallback(
    (textToParse: string) => {
      setPasteError(null);
      const batch = parseLoopbackContentBatch(textToParse, symbol);
      if (batch.length === 0) {
        setPasteError('未在內容中解析到有效之 AI 裁決代碼塊 (需包含 stopLoss 欄位)');
        return false;
      }

      batch.forEach((payload) => {
        const newPin = createPinnedStrategy(payload);
        savePinnedStrategy(newPin);
      });

      const updated = getPinnedStrategies(symbol);
      setPinnedStrategies(updated);
      setPasteInputText('');
      setPasteModalNotice(null);
      setShowPasteModal(false);
      setPasteSuccess(true);
      return true;
    },
    [symbol]
  );

  // 嘗試一鍵讀取系統剪貼簿直接套用
  const handleQuickPasteClipboard = useCallback(async () => {
    if (navigator?.clipboard?.readText) {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          const ok = handleApplyLoopback(clipText);
          if (ok) return;
        }
      } catch (err) {
        logger.info('無法直接讀取剪貼簿，切換為手動貼上抽屜:', err);
      }
    }
    setPasteModalNotice('💡 因瀏覽器安全性或隱私限制無法自動讀取剪貼簿，請直接在下方按 Ctrl+V 貼上外部 AI 分析或代碼塊');
    setShowPasteModal(true);
  }, [handleApplyLoopback]);

  // 清除目前標的的單一模型或全部釘選
  const handleClearPin = useCallback(
    (targetModel?: string) => {
      clearPinnedStrategy(symbol, targetModel);
      setPinnedStrategies(getPinnedStrategies(symbol));
    },
    [symbol]
  );

  // 點擊確認警報（避免疲勞）
  const handleAcknowledgeAlert = useCallback(() => {
    pinnedStrategies.forEach((pin) => {
      savePinnedStrategy({ ...pin, acknowledgedAlert: true });
    });
    setPinnedStrategies(getPinnedStrategies(symbol));
  }, [pinnedStrategies, symbol]);

  // 單卡結案並記錄勝率
  const handleCloseOutcome = useCallback(
    (targetPin: PinnedStrategy, outcome: 'WIN' | 'LOSS' | 'EXPIRED') => {
      const record: StrategyOutcomeRecord = {
        id: `outcome_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        symbol: targetPin.symbol,
        aiModel: targetPin.aiModel,
        createdAt: targetPin.createdAt,
        closedAt: new Date().toISOString(),
        outcome,
      };
      recordStrategyOutcome(record);
      clearPinnedStrategy(symbol, targetPin.aiModel);
      setPinnedStrategies(getPinnedStrategies(symbol));
      setOutcomeRecords(getStrategyOutcomeRecords());
    },
    [symbol]
  );

  // 全隊全員結案
  const handleCloseAllOutcomes = useCallback(
    (outcome: 'WIN' | 'LOSS' | 'EXPIRED') => {
      const now = new Date().toISOString();
      pinnedStrategies.forEach((p) => {
        const record: StrategyOutcomeRecord = {
          id: `outcome_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          symbol: p.symbol,
          aiModel: p.aiModel,
          createdAt: p.createdAt,
          closedAt: now,
          outcome,
        };
        recordStrategyOutcome(record);
      });
      clearPinnedStrategy(symbol);
      setPinnedStrategies([]);
      setOutcomeRecords(getStrategyOutcomeRecords());
    },
    [pinnedStrategies, symbol]
  );

  // 是否有任一模型尚未知悉警報
  const hasUnacknowledgedAlert = useMemo(() => {
    return pinnedStrategies.some((p) => !p.acknowledgedAlert);
  }, [pinnedStrategies]);

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

        {/* 右側控制項：脫敏開關、勝率榜入口與 Token 預估 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              background: 'rgba(234, 179, 8, 0.12)',
              color: '#facc15',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              transition: 'all 0.2s ease',
            }}
            title="查看外部各 AI 模型歷史勝率榜"
          >
            <Trophy size={13} />
            <span>智囊團勝率榜</span>
          </button>

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

      {/* 主操作列：一鍵複製 + 貼入外部 AI 裁決 + Prompt 預覽 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
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
            flex: 2,
            minWidth: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
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
              : `一鍵複製 AI 戰情提示詞 (${symbol} ${digest.quote.name})`}
          </span>
        </button>

        {/* 外部 AI 裁決回流按鈕 */}
        <button
          type="button"
          aria-label="貼入外部 AI 裁決"
          onClick={handleQuickPasteClipboard}
          style={{
            flex: 1,
            minWidth: '170px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            background: pasteSuccess
              ? 'rgba(16, 185, 129, 0.2)'
              : 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
            color: pasteSuccess ? '#34d399' : '#c084fc',
            border: `1px solid ${pasteSuccess ? 'rgba(16, 185, 129, 0.4)' : 'rgba(147, 51, 234, 0.4)'}`,
            transition: 'all 0.2s ease',
          }}
          title="支援一鍵讀取剪貼簿或貼上外部 AI 回覆長文，自動提取 JSON 釘選"
        >
          {pasteSuccess ? <Check size={15} /> : <ClipboardList size={15} />}
          <span>{pasteSuccess ? '✅ 裁決已釘選生效' : '📋 貼入外部 AI 裁決'}</span>
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

      {/* 盤中觸價警報橫幅 (取最嚴格保命停損優先報警，防範主觀凹單) */}
      {multiTriggerStatus?.triggerMessage && hasUnacknowledgedAlert && (
        <div
          data-testid="intraday-trigger-alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: multiTriggerStatus.isStopLossTriggered
              ? 'rgba(239, 68, 68, 0.2)'
              : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${
              multiTriggerStatus.isStopLossTriggered
                ? 'rgba(239, 68, 68, 0.5)'
                : 'rgba(16, 185, 129, 0.5)'
            }`,
            color: multiTriggerStatus.isStopLossTriggered ? '#fca5a5' : '#86efac',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'pulse 2s infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{multiTriggerStatus.triggerMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleAcknowledgeAlert}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              background: 'rgba(0, 0, 0, 0.4)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            我已知悉
          </button>
        </div>
      )}

      {/* 外部 AI 智囊團多模型緊湊釘選條列 (Spec 0201 / Ticket 04) */}
      {pinnedStrategies.length > 0 && (
        <div
          data-testid="pinned-strategies-container"
          style={{
            background: 'rgba(17, 24, 39, 0.75)',
            border: '1px solid rgba(147, 51, 234, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* 頂部一覽列：共識防線/分歧指標與全隊結案 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              paddingBottom: '6px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background:
                    multiTriggerStatus?.consensusLevel === 'DIVERGENT'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(147, 51, 234, 0.25)',
                  color:
                    multiTriggerStatus?.consensusLevel === 'DIVERGENT' ? '#fca5a5' : '#d8b4fe',
                  border: `1px solid ${
                    multiTriggerStatus?.consensusLevel === 'DIVERGENT'
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(147, 51, 234, 0.4)'
                  }`,
                }}
              >
                👥 智囊團 ({pinnedStrategies.length})
              </span>
              {multiTriggerStatus?.consensusMessage && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color:
                      multiTriggerStatus.consensusLevel === 'DIVERGENT' ? '#fca5a5' : '#c084fc',
                  }}
                >
                  {multiTriggerStatus.consensusMessage}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>全隊結案：</span>
              <button
                type="button"
                onClick={() => handleCloseAllOutcomes('WIN')}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
                title="全隊獲利了結"
              >
                全隊達標
              </button>
              <button
                type="button"
                onClick={() => handleCloseAllOutcomes('LOSS')}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
                title="全隊停損出場"
              >
                全隊停損
              </button>
              <button
                type="button"
                onClick={() => handleClearPin()}
                title="全隊清空"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* 緊湊型多模型條列清單 (每行單一 AI，高密度不擠佔空間) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pinnedStrategies.map((pin) => {
              const diffMs = new Date(pin.expiresAt).getTime() - Date.now();
              const daysLeft = Math.max(0, Math.ceil(diffMs / 86400000));

              return (
                <div
                  key={pin.id || pin.aiModel}
                  style={SYNDICATE_ROW_STYLE}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
                    <span style={MODEL_BADGE_STYLE}>
                      🤖 {pin.aiModel}
                    </span>
                    <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{pin.verdict}</span>
                  </div>

                  {/* 關鍵點位組 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#fca5a5' }}>
                      停損 <strong style={{ fontWeight: 700 }}>{pin.stopLoss.toFixed(2)}</strong>
                    </span>
                    {pin.takeProfit !== undefined && (
                      <span style={{ color: '#86efac' }}>
                        目標 <strong style={{ fontWeight: 700 }}>{pin.takeProfit.toFixed(2)}</strong>
                      </span>
                    )}
                    {pin.trendReversal !== undefined && (
                      <span style={{ color: '#93c5fd' }}>
                        翻多 <strong style={{ fontWeight: 700 }}>{pin.trendReversal.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>

                  {/* 效期與單卡結案操作組 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        color: pin.isExpired ? '#f87171' : '#9ca3af',
                      }}
                    >
                      {pin.isExpired ? '⚠️ 逾期' : `${daysLeft}天`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCloseOutcome(pin, 'WIN')}
                      style={OUTCOME_BTN_WIN_STYLE}
                      title="該模型獲利達標"
                    >
                      WIN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloseOutcome(pin, 'LOSS')}
                      style={OUTCOME_BTN_LOSS_STYLE}
                      title="該模型停損出場"
                    >
                      LOSS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearPin(pin.aiModel)}
                      title="刪除此模型"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '1px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 手動貼上回流彈窗/抽屜 */}
      {showPasteModal && (
        <div
          data-testid="paste-modal"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(147, 51, 234, 0.4)',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#c084fc" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>
                貼入外部 AI 分析長文或 JSON 代碼塊
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPasteModal(false);
                setPasteModalNotice(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {pasteModalNotice && (
            <div
              data-testid="paste-modal-notice"
              style={{
                fontSize: '12px',
                color: '#93c5fd',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                padding: '8px 10px',
                lineHeight: 1.4,
              }}
            >
              {pasteModalNotice}
            </div>
          )}

          <textarea
            rows={4}
            value={pasteInputText}
            onChange={(e) => setPasteInputText(e.target.value)}
            placeholder="請直接將 Claude / ChatGPT / Gemini 輸出的整篇分析貼在此處，系統將自動提取最後的 JSON 釘選點位..."
            style={{
              width: '100%',
              background: '#090d16',
              border: '1px solid var(--border-color, #374151)',
              borderRadius: '6px',
              color: '#e5e7eb',
              padding: '8px',
              fontSize: '12px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />

          {pasteError && (
            <div
              style={{
                color: '#f87171',
                fontSize: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '6px 10px',
                borderRadius: '6px',
              }}
            >
              {pasteError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setShowPasteModal(false);
                setPasteModalNotice(null);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid #4b5563',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => handleApplyLoopback(pasteInputText)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              解析並釘選
            </button>
          </div>
        </div>
      )}

      {/* 智囊團勝率榜抽屜 */}
      {showLeaderboard && (
        <div
          data-testid="leaderboard-drawer"
          style={{
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trophy size={16} color="#facc15" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>
                外部 AI 智囊團實戰勝率榜 (近 20 筆記錄)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLeaderboard(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {modelWinRates.length === 0 ? (
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
              尚無結案記錄。在釘選策略後，點擊「獲利達標」或「停損出場」即可開始累積智囊團戰績！
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {modelWinRates.map((stat, idx) => (
                <div
                  key={stat.aiModel}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: idx === 0 ? '#facc15' : idx === 1 ? '#cbd5e1' : '#b45309',
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{stat.aiModel}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#9ca3af' }}>
                      {stat.total} 場 ({stat.wins} 勝 / {stat.losses} 敗)
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: stat.winRatePct >= 60 ? '#4ade80' : stat.winRatePct >= 50 ? '#facc15' : '#f87171',
                      }}
                    >
                      勝率 {stat.winRatePct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 複製失敗安全引導橫幅 */}
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

      {/* 可折疊 Prompt 預覽抽屜 */}
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
