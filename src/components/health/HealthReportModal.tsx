import React, { useEffect } from 'react';
import type { HealthCheckCategoryResult } from '../../types/stockHealth';

interface HealthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: HealthCheckCategoryResult | null;
  symbol: string;
  stockName?: string;
}

/**
 * 完整健診報告穿透彈窗 (Health Report Forensic Modal)
 */
export const HealthReportModal: React.FC<HealthReportModalProps> = ({
  isOpen,
  onClose,
  result,
  symbol,
  stockName,
}) => {
  // 監聽 ESC 鍵關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !result) return null;

  const displayName = stockName ? `${stockName} (${symbol})` : symbol;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {result.title}完整報告
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
            aria-label="關閉"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 綜合說明引言段落 (對齊截圖風格) */}
          <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            {result.description} {displayName} 在這 {result.totalItems} 個指標中，
            {result.passedItems > 0 ? (
              <span>
                通過了其中的 <strong className="text-blue-600 dark:text-blue-400">{result.passedItems}</strong> 個
                ( <strong className="text-blue-600 dark:text-blue-400">{result.passRatio}%</strong> ) 條件。
              </span>
            ) : (
              <span>只通過了其中 0 個 ( 0% ) 條件。</span>
            )}
            {' '}{result.summaryText}
          </div>

          {/* 細項指標清單 */}
          <div className="space-y-2.5">
            {result.items.map((item) => {
              const isPassed = item.passed;
              const isExempted = item.exempted;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800"
                >
                  {/* 左側狀態徽章 */}
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="flex-shrink-0 w-20">
                      {isExempted ? (
                        <span className="inline-flex items-center font-bold text-sm text-slate-400 dark:text-slate-500">
                          – 豁免
                        </span>
                      ) : isPassed ? (
                        <span className="inline-flex items-center font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          <svg className="w-4 h-4 mr-1 stroke-current stroke-2" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          通過
                        </span>
                      ) : (
                        <span className="inline-flex items-center font-bold text-sm text-rose-600 dark:text-rose-400">
                          <svg className="w-4 h-4 mr-1 stroke-current stroke-2" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          沒過
                        </span>
                      )}
                    </div>

                    {/* 指標名稱與細節 */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {item.name}
                      </p>
                      {item.detailExplanation && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.detailExplanation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 右側門檻資訊 */}
                  {item.thresholdDesc && (
                    <span className="hidden md:inline-block text-xs text-slate-400 dark:text-slate-500 text-right pl-4">
                      {item.thresholdDesc}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
