import React from 'react';
import type { HealthCheckCategoryResult } from '../../types/stockHealth';
import { HealthScoreGauge } from './HealthScoreGauge';

interface HealthCardProps {
  result: HealthCheckCategoryResult;
  onOpenReport: (result: HealthCheckCategoryResult) => void;
}

/**
 * 單一健診維度卡片 (Health Card)
 */
export const HealthCard: React.FC<HealthCardProps> = ({ result, onOpenReport }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* 左側：標題、評語說明與報告入口 */}
        <div className="flex-1 space-y-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {result.title}
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            {result.summaryText}
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => onOpenReport(result)}
              className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors focus:outline-none"
            >
              查看完整健診細節
              <svg
                className="w-4 h-4 ml-1 transform transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 右側：圓環進度儀表盤 */}
        <div className="flex-shrink-0 self-center sm:self-auto sm:pl-4">
          <HealthScoreGauge
            passed={result.passedItems}
            total={result.totalItems}
            passRatio={result.passRatio}
            size={124}
            strokeWidth={7}
          />
        </div>
      </div>
    </div>
  );
};
