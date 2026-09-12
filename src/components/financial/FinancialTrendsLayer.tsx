import React from 'react';
import {
  TrendingUp,
  Scale,
  DollarSign,
} from 'lucide-react';
import type {
  QuarterlyFinancialRecord,
  DuPontAnalysis,
} from '../../types/financialForensic';

export type MarginType = 'grossMargin' | 'operatingMargin' | 'netMargin';

export function calculateMarginSvgPoints(
  records: (QuarterlyFinancialRecord | any)[],
  type: MarginType,
  width: number,
  height: number
): string {
  if (!records || records.length === 0) return '';
  if (records.length === 1) {
    return `${width / 2},${height / 2}`;
  }

  // 1. 計算所有比率
  const margins = records.map((r) => {
    const rev = r.income?.revenue ?? r.revenue ?? 0;
    if (rev <= 0) return 0;
    const gross = r.income?.grossProfit ?? r.grossProfit ?? 0;
    const op = r.income?.operatingIncome ?? r.operatingProfit ?? 0;
    const net = r.income?.netIncome ?? r.netIncome ?? 0;

    if (type === 'grossMargin') return (gross / rev) * 100;
    if (type === 'operatingMargin') return (op / rev) * 100;
    return (net / rev) * 100;
  });

  const validMargins = margins.filter((m) => !isNaN(m));
  if (validMargins.length === 0) return '';

  const minVal = Math.min(0, ...validMargins);
  const maxVal = Math.max(10, ...validMargins);
  const range = maxVal - minVal || 1;

  const paddingX = 24;
  const paddingY = 20;
  const usableW = width - paddingX * 2;
  const usableH = height - paddingY * 2;

  const stepX = usableW / (records.length - 1);

  return margins
    .map((val, idx) => {
      const x = paddingX + idx * stepX;
      // SVG y: 0 為頂部，height 為底部
      const ratio = (val - minVal) / range;
      const y = height - paddingY - ratio * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function formatCurrencyMillions(val: number): string {
  if (isNaN(val)) return '0 百萬';
  if (Math.abs(val) >= 100) {
    const yi = Math.round(val / 100);
    return `${yi.toLocaleString()} 億`;
  }
  return `${Math.round(val).toLocaleString()} 百萬`;
}

export function getDuPontDriverBadge(driver: DuPontAnalysis['primaryDriver']): {
  label: string;
  isWarning: boolean;
  colorClass: string;
} {
  switch (driver) {
    case 'LEVERAGE':
      return {
        label: '財務槓桿推升',
        isWarning: true,
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      };
    case 'EFFICIENCY':
      return {
        label: '資產週轉效率推升',
        isWarning: false,
        colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      };
    case 'PROFITABILITY':
    default:
      return {
        label: '產品獲利率推升',
        isWarning: false,
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      };
  }
}

interface FinancialTrendsLayerProps {
  records: (QuarterlyFinancialRecord | any)[];
  duPont: DuPontAnalysis;
}

export const FinancialTrendsLayer: React.FC<FinancialTrendsLayerProps> = ({
  records,
  duPont,
}) => {
  // 排序近 8 季由遠至近
  const sortedRecords = [...records].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  const chartWidth = 540;
  const chartHeight = 180;

  const grossPoints = calculateMarginSvgPoints(sortedRecords, 'grossMargin', chartWidth, chartHeight);
  const opPoints = calculateMarginSvgPoints(sortedRecords, 'operatingMargin', chartWidth, chartHeight);
  const netPoints = calculateMarginSvgPoints(sortedRecords, 'netMargin', chartWidth, chartHeight);

  const driverBadge = getDuPontDriverBadge(duPont.primaryDriver);

  // 淨利 vs CFO 找出最大值作為長條高度參照
  const maxCashValue = Math.max(
    ...sortedRecords.map((r) => {
      const net = Math.abs(r.income?.netIncome ?? r.netIncome ?? 0);
      const cfo = Math.abs(r.cashFlow?.operatingCashFlow ?? r.operatingCashFlow ?? 0);
      return Math.max(net, cfo);
    }),
    1
  );

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl">
      {/* 區塊標題 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white tracking-wide">
            近 8 季核心趨勢矩陣與杜邦拆解
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          共收錄 {sortedRecords.length} 季度資料
        </span>
      </div>

      {/* 1. 獲利三率趨勢折線圖 (SVG) */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-200">
            📈 獲利三率同軸走勢圖 (Margins Trend)
          </span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              毛利率
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              營業利益率
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              稅後淨利率
            </span>
          </div>
        </div>

        {sortedRecords.length > 0 ? (
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 overflow-visible"
            >
              {/* 網格背景線 */}
              <line x1="24" y1="30" x2={chartWidth - 24} y2="30" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
              <line x1="24" y1="85" x2={chartWidth - 24} y2="85" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
              <line x1="24" y1="140" x2={chartWidth - 24} y2="140" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

              {/* 三率折線 */}
              {grossPoints && (
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={grossPoints}
                />
              )}
              {opPoints && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={opPoints}
                />
              )}
              {netPoints && (
                <polyline
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={netPoints}
                />
              )}

              {/* 資料節點 */}
              {sortedRecords.map((r, i) => {
                const stepX = (chartWidth - 48) / (sortedRecords.length - 1 || 1);
                const x = 24 + i * stepX;
                const label = `${r.year}Q${r.quarter}`;
                return (
                  <g key={i}>
                    <text
                      x={x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">暫無歷史季度數據</div>
        )}
      </div>

      {/* 2. 稅後淨利 vs CFO 營業現金流階梯圖 */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              💰 稅後淨利 vs 營業現金流 (CFO) 階梯對比
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-purple-300">
              <span className="w-2.5 h-2.5 rounded bg-purple-500/80" />
              稅後淨利
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/80" />
              營業現金流
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {sortedRecords.map((r, idx) => {
            const netVal = r.income?.netIncome ?? r.netIncome ?? 0;
            const cfoVal = r.cashFlow?.operatingCashFlow ?? r.operatingCashFlow ?? 0;
            const netHeightRatio = Math.min(Math.abs(netVal) / maxCashValue, 1);
            const cfoHeightRatio = Math.min(Math.abs(cfoVal) / maxCashValue, 1);
            const isCashDivergent = cfoVal < netVal;

            return (
              <div
                key={idx}
                className="flex flex-col items-center bg-slate-900/50 p-2 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors"
              >
                <div className="h-28 w-full flex items-end justify-center gap-1.5 pb-1">
                  {/* 淨利長條 */}
                  <div
                    className="w-3 rounded-t bg-purple-500/70 hover:bg-purple-400 transition-all"
                    style={{ height: `${Math.max(netHeightRatio * 100, 4)}%` }}
                    title={`淨利: ${formatCurrencyMillions(netVal)}`}
                  />
                  {/* CFO 長條 */}
                  <div
                    className={`w-3 rounded-t transition-all ${
                      isCashDivergent
                        ? 'bg-amber-500/80 hover:bg-amber-400'
                        : 'bg-emerald-500/80 hover:bg-emerald-400'
                    }`}
                    style={{ height: `${Math.max(cfoHeightRatio * 100, 4)}%` }}
                    title={`CFO: ${formatCurrencyMillions(cfoVal)}`}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">
                  {r.quarter}Q{String(r.year).slice(2)}
                </span>
                {isCashDivergent && (
                  <span className="text-[9px] text-amber-400 font-bold mt-0.5">背離</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 杜邦三因子拆解矩陣 (DuPont Breakdown) */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">
              🔬 杜邦 ROE 三因子拆解（DuPont Analysis）
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">主驅動力：</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${driverBadge.colorClass}`}>
              {driverBadge.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* ROE */}
          <div className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-700/60">
            <span className="text-[11px] text-slate-400">股東權益報酬率 (ROE)</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {duPont.roe.toFixed(2)}%
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">三因子乘積總結果</span>
          </div>

          {/* 淨利率 */}
          <div className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-700/60">
            <span className="text-[11px] text-slate-400">1. 稅後淨利率 (Net Margin)</span>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {duPont.netMargin.toFixed(2)}%
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">反映產品定價權</span>
          </div>

          {/* 資產週轉率 */}
          <div className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-700/60">
            <span className="text-[11px] text-slate-400">2. 資產週轉率 (Turnover)</span>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {duPont.assetTurnover.toFixed(4)} 次
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">反映資產營運效率</span>
          </div>

          {/* 權益乘數 */}
          <div className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-700/60">
            <span className="text-[11px] text-slate-400">3. 權益乘數 (Leverage)</span>
            <div className={`text-lg font-bold font-mono mt-1 ${duPont.equityMultiplier > 2.5 ? 'text-amber-400' : 'text-white'}`}>
              {duPont.equityMultiplier.toFixed(2)} 倍
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">反映財務槓桿大小</span>
          </div>
        </div>
      </div>
    </div>
  );
};
