import React from 'react';

interface HealthScoreGaugeProps {
  passed: number;
  total: number;
  passRatio: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * 股票健診圓環評分進度條 (Health Score Gauge)
 */
export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({
  passed,
  total,
  passRatio,
  size = 120,
  strokeWidth = 7,
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedRatio = Math.max(0, Math.min(100, passRatio));
  const strokeDashoffset = circumference - (clampedRatio / 100) * circumference;

  // 依通過率賦予動態亮色 (以藍/青/琥珀/珊瑚為基準，維持高品質美感)
  const getStrokeColor = (ratio: number) => {
    if (ratio >= 65) return '#0284c7'; // 亮藍色 (截圖對齊)
    if (ratio >= 45) return '#0d9488'; // 藍綠色
    if (ratio >= 20) return '#f97316'; // 活力橙
    return '#ef4444';                  // 警示紅
  };

  const strokeColor = getStrokeColor(clampedRatio);

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* 底層軌道環 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-200 dark:text-slate-700/60"
        />
        {/* 動態進度環 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      {/* 中心分數標註 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="flex items-baseline font-bold tracking-tight">
          <span
            className="text-2xl leading-none"
            style={{ color: strokeColor }}
          >
            {passed}
          </span>
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500 mx-0.5">/</span>
          <span className="text-base text-slate-500 dark:text-slate-400">
            {total}
          </span>
        </div>
        <span
          className="text-[11px] font-medium tracking-tight mt-1"
          style={{ color: strokeColor }}
        >
          通過 {clampedRatio}% 條件
        </span>
      </div>
    </div>
  );
};
