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
      className={`strategic-prompt-panel rounded-2xl p-5 border border-slate-700/60 shadow-2xl backdrop-blur-md ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.8) 100%)',
        color: '#f8fafc',
      }}
    >
      {/* 頂部控制列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
            }}
          >
            <BrainCircuit size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-white m-0">智策多維提示詞引擎</h3>
              <span
                className="px-2 py-0.5 text-xs font-semibold rounded-full border"
                style={{
                  background: isEtf ? 'rgba(56, 189, 248, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                  color: isEtf ? '#38bdf8' : '#c084fc',
                  borderColor: isEtf ? 'rgba(56, 189, 248, 0.4)' : 'rgba(139, 92, 246, 0.4)',
                }}
              >
                {isEtf ? 'ETF 模式 (V3.0)' : '個股大師 (V12.0)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              對齊華爾街六頂思考帽決策框架 · 零信任海關定錨 · 外部 LLM 深度覆盤
            </p>
          </div>
        </div>

        {/* 右側操作徽章群 */}
        <div className="flex items-center gap-3">
          {/* 部位脫敏切換開關 */}
          <button
            type="button"
            onClick={() => setDesensitized((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer"
            style={{
              background: desensitized ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              borderColor: desensitized ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
              color: desensitized ? '#34d399' : '#f87171',
            }}
            title={desensitized ? '隱私保護開啟：隱去帳戶金額與真實股數' : '注意：當前將匯出部位明細'}
          >
            {desensitized ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            <span>{desensitized ? '部位已脫敏' : '脫敏關閉'}</span>
          </button>

          {/* Token 守門徽章 */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border border-slate-700 bg-slate-900/60"
            style={{ color: tokenColor }}
          >
            <span>約 {tokenCount} Tokens</span>
          </div>

          {/* Master 一鍵複製主按鈕 */}
          <button
            type="button"
            onClick={() => handleCopy(activePromptResult.promptText, 'MASTER')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer border-none text-white"
            style={{
              background:
                copiedKey === 'MASTER'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            }}
          >
            {copiedKey === 'MASTER' ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedKey === 'MASTER' ? '已複製到剪貼簿！' : selectedHat ? '複製當前思考帽' : '一鍵複製 Master Prompt'}</span>
          </button>
        </div>
      </div>

      {/* 六頂思考帽分頁切換卡片區 */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-indigo-400" />
            六頂思考帽平行認知矩陣 (點選可單獨抽離複製)：
          </span>
          {selectedHat && (
            <button
              type="button"
              onClick={() => setSelectedHat(null)}
              className="text-xs text-indigo-400 hover:text-indigo-300 bg-transparent border-none cursor-pointer underline p-0"
            >
              切換回 Master 全量視野
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(Object.keys(SIX_HATS_CONFIG) as SixThinkingHatDimension[]).map((hatKey) => {
            const cfg = SIX_HATS_CONFIG[hatKey];
            const isSelected = selectedHat === hatKey;
            const isBlackHat = hatKey === 'BLACK';

            return (
              <div
                key={hatKey}
                onClick={() => setSelectedHat(isSelected ? null : hatKey)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected ? 'ring-2 ring-indigo-500' : 'hover:border-slate-500'
                }`}
                style={{
                  background: isSelected
                    ? 'rgba(30, 41, 59, 0.95)'
                    : isBlackHat
                    ? 'rgba(15, 23, 42, 0.9)'
                    : 'rgba(30, 41, 59, 0.5)',
                  borderColor: isSelected
                    ? '#6366f1'
                    : isBlackHat
                    ? 'rgba(239, 68, 68, 0.4)'
                    : 'rgba(71, 85, 105, 0.4)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base">{cfg.emoji}</span>
                    {isBlackHat && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        紅隊批判
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white m-0">{cfg.nameZh}</h4>
                  <p className="text-[11px] text-slate-400 m-0 mt-1 line-clamp-2 leading-relaxed">
                    {cfg.coreFocus.split('(')[0]}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{cfg.label}</span>
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
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                    title={`單獨複製 ${cfg.nameZh} 提示詞`}
                  >
                    {copiedKey === `HAT_${hatKey}` ? (
                      <Check size={13} className="text-emerald-400" />
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
      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <button
          type="button"
          onClick={() => setShowXmlPreview((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 text-xs text-slate-300 transition-colors border border-slate-800 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Code2 size={15} className="text-indigo-400" />
            <span>
              檢視即將注入之結構化 XML 語意提示詞 (
              {selectedHat ? `當前：${SIX_HATS_CONFIG[selectedHat].nameZh}` : 'Master 全量視野'})
            </span>
          </span>
          {showXmlPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showXmlPreview && (
          <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 p-3.5">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[11px] text-slate-500 font-mono">
              <span>XML Semantic Prompt Preview</span>
              <button
                type="button"
                onClick={() => handleCopy(activePromptResult.promptText, 'PREVIEW_COPY')}
                className="text-indigo-400 hover:text-indigo-300 bg-transparent border-none cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'PREVIEW_COPY' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'PREVIEW_COPY' ? '已複製' : '複製代碼'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed select-all">
              {activePromptResult.promptText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
