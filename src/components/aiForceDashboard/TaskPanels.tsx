import React, { useState } from 'react';
import type { AiForceDashboardReport, KlineCandleItem } from '../../types/aiForceDashboard';

export interface TaskPanelProps {
  report: AiForceDashboardReport;
}

export interface TechnicalAlertItem {
  title: string;
  level: '高' | '中' | '低';
  message: string;
  time: string;
  color: string;
}

/**
 * 依據真實日 K 與各項指標動態計算技術警示項目 (Task 2 Pure Seam)
 */
export function generateTechnicalAlerts(report: AiForceDashboardReport): TechnicalAlertItem[] {
  const candles = report.klineSystem?.candles ?? [];
  if (candles.length === 0) {
    return [
      {
        title: '資料同步中',
        level: '低',
        message: '目前尚無足夠之歷史日 K 數列可供技術掃描',
        time: '剛剛',
        color: '#94a3b8',
      },
    ];
  }

  const last = candles[candles.length - 1];
  const time = last.date ? last.date.slice(5) : '最新日';
  const alerts: TechnicalAlertItem[] = [];

  // 1. 均線排列與發散警示
  const ma5 = last.ma5 ?? last.close;
  const ma10 = last.ma10 ?? last.close;
  const ma20 = last.ma20 ?? last.close;
  const ma60 = last.ma60 ?? last.close;

  if (last.close > ma5 && ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
    alerts.push({
      title: '均線多頭排列發散',
      level: '低',
      message: `MA5 ($${ma5.toLocaleString()}) 與 MA20 ($${ma20.toLocaleString()}) 呈現多頭排列發散結構，多方支撐強勁`,
      time,
      color: '#10b981',
    });
  } else if (last.close < ma20 && ma5 < ma20) {
    alerts.push({
      title: '均線空頭排列警戒',
      level: '高',
      message: `股價 ($${last.close.toLocaleString()}) 跌破 MA20 月線 ($${ma20.toLocaleString()})，短期均線偏空下彎，需嚴控回檔破位風險`,
      time,
      color: '#ef4444',
    });
  } else {
    alerts.push({
      title: '均線區間糾結整理',
      level: '中',
      message: `MA5 ($${ma5.toLocaleString()}) 與 MA20 ($${ma20.toLocaleString()}) 處於區間糾結狀態，方向待放量突破確認`,
      time,
      color: '#f59e0b',
    });
  }

  // 2. 主力 VWAP 成本乖離突變警示
  const vwap = report.vwapCostStructure?.mainForceVwap || last.close;
  const vwapBias = vwap > 0 ? ((last.close - vwap) / vwap) * 100 : 0;
  if (vwapBias > 6) {
    alerts.push({
      title: '主力正乖離過大警戒',
      level: '高',
      message: `收盤價相較 20 日 VWAP 主力成本 ($${vwap.toLocaleString()}) 正乖離達 +${vwapBias.toFixed(1)}%，進入高檔多頭突破警戒區，慎防追高拉回`,
      time,
      color: '#ef4444',
    });
  } else if (vwapBias < -5) {
    alerts.push({
      title: '破位負乖離超跌警示',
      level: '高',
      message: `收盤價跌破 20 日 VWAP 主力成本 ($${vwap.toLocaleString()}) 負乖離達 ${vwapBias.toFixed(1)}%，進入短線超跌警戒區`,
      time,
      color: '#ef4444',
    });
  } else {
    alerts.push({
      title: 'VWAP 成本結構穩健',
      level: '低',
      message: `收盤價 ($${last.close.toLocaleString()}) 貼近 20 日主力 VWAP 成本 ($${vwap.toLocaleString()})，乖離 ${vwapBias >= 0 ? '+' : ''}${vwapBias.toFixed(1)}%，成本結構穩健`,
      time,
      color: '#10b981',
    });
  }

  // 3. KD / RSI 動能強弱警示
  const rsi = last.rsi ?? 50;
  const k = last.k ?? 50;
  const d = last.d ?? 50;
  if (rsi > 75) {
    alerts.push({
      title: '動能過熱超買警戒',
      level: '中',
      message: `14 日 RSI 達到 ${rsi.toFixed(1)}，技術指標進入超買過熱區，短線波動機率增高`,
      time,
      color: '#f59e0b',
    });
  } else if (rsi < 30) {
    alerts.push({
      title: '動能極度超跌反彈',
      level: '中',
      message: `14 日 RSI 降至 ${rsi.toFixed(1)}，技術指標進入極度超跌區，短線醞釀技術性反彈`,
      time,
      color: '#38bdf8',
    });
  } else if (k >= d) {
    alerts.push({
      title: 'KD 多方順風交叉',
      level: '低',
      message: `K值 (${k.toFixed(1)}) 大於 D值 (${d.toFixed(1)})，動能偏多順風發散中`,
      time,
      color: '#10b981',
    });
  } else {
    alerts.push({
      title: 'KD 整理收斂調節',
      level: '中',
      message: `K值 (${k.toFixed(1)}) 小於 D值 (${d.toFixed(1)})，短線動能偏弱收斂中`,
      time,
      color: '#f59e0b',
    });
  }

  // 4. 隔日沖與日內籌碼換手警示
  const dayTrade = report.dayTradeRisk;
  if (dayTrade) {
    const levelLabel: '高' | '中' | '低' =
      dayTrade.riskLevel === 'HIGH' ? '高' : dayTrade.riskLevel === 'LOW' ? '低' : '中';
    const color = levelLabel === '高' ? '#ef4444' : levelLabel === '低' ? '#10b981' : '#f59e0b';
    alerts.push({
      title: '隔日沖沖銷異常偵測',
      level: levelLabel,
      message: `日內沖銷風險指數 ${dayTrade.riskIndex} 分 (等級：${dayTrade.riskLevel})，換手率 ${dayTrade.turnoverRate}%，日內波動度 ${dayTrade.intradayVolatility}%`,
      time,
      color,
    });
  }

  return alerts;
}

/**
 * 任務二：技術警示報告面板
 */
export const TechnicalAlertsView: React.FC<TaskPanelProps> = ({ report }) => {
  const alerts = generateTechnicalAlerts(report);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: '15px',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span> 任務二：即時技術警示矩陣 ({report.symbol} {report.name})
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {alerts.map((a, idx) => (
            <div
              key={`${a.title}-${idx}`}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderLeft: `4px solid ${a.color}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{a.title}</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: a.color,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: `${a.color}15`,
                  }}
                >
                  等級：{a.level}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>{a.message}</p>
              <span style={{ fontSize: '10px', color: '#64748b' }}>觸發時戳：{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 依據真實日 K 提取 KD 與 MA 指標數據 (Task 3 Pure Seam)
 */
export function deriveKdMaMetrics(report: AiForceDashboardReport) {
  const candles = report.klineSystem?.candles ?? [];
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const k = last?.k ?? 50;
  const d = last?.d ?? 50;
  const ma20 = last?.ma20 ?? last?.close ?? 0;

  const prevK = prev?.k ?? 50;
  const prevD = prev?.d ?? 50;

  let kdCrossingState = '多頭發散';
  if (k > 80 && d > 80) kdCrossingState = '高檔鈍化';
  else if (k < 20 && d < 20) kdCrossingState = '低檔超跌';
  else if (prev && prevK < prevD && k >= d) kdCrossingState = '黃金交叉';
  else if (prev && prevK >= prevD && k < d) kdCrossingState = '死亡交叉';
  else if (k < d) kdCrossingState = '空頭收斂';

  return {
    k,
    d,
    ma20,
    kdCrossingState,
    recentCandles: candles.slice(-30),
  };
}

/**
 * 任務三：KD + MA 圖表面板
 */
export const KdMaView: React.FC<TaskPanelProps> = ({ report }) => {
  const { k, d, ma20, kdCrossingState, recentCandles } = deriveKdMaMetrics(report);

  // SVG 座標繪製計算 (寬 100%, 高 220px, 邊界 20px)
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 30 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const count = recentCandles.length;
  const kPoints = recentCandles.map((c, idx) => {
    const x = padding.left + (idx / Math.max(1, count - 1)) * plotWidth;
    const yVal = c.k ?? 50;
    const y = padding.top + (1 - yVal / 100) * plotHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const dPoints = recentCandles.map((c, idx) => {
    const x = padding.left + (idx / Math.max(1, count - 1)) * plotWidth;
    const yVal = c.d ?? 50;
    const y = padding.top + (1 - yVal / 100) * plotHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📈</span> 任務三：KD 隨機指標與多天期均線系統 ({report.symbol} {report.name})
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>K 值 (9日)</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e' }}>{k}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>D 值 (9日)</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{d}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>MA20 月線</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>${ma20.toLocaleString()}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>KD 交叉型態</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{kdCrossingState}</div>
        </div>
      </div>

      {/* 原生 SVG KD 走勢向量圖 */}
      <div
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px',
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '220px', display: 'block' }}
        >
          {/* 超買 80 與 超賣 20 水平基準線 */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight * 0.2}
            x2={svgWidth - padding.right}
            y2={padding.top + plotHeight * 0.2}
            stroke="rgba(244, 63, 94, 0.3)"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 5}
            y={padding.top + plotHeight * 0.2 + 4}
            fill="#f43f5e"
            fontSize="10"
            textAnchor="end"
          >
            80 超買
          </text>

          <line
            x1={padding.left}
            y1={padding.top + plotHeight * 0.8}
            x2={svgWidth - padding.right}
            y2={padding.top + plotHeight * 0.8}
            stroke="rgba(56, 189, 248, 0.3)"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 5}
            y={padding.top + plotHeight * 0.8 + 4}
            fill="#38bdf8"
            fontSize="10"
            textAnchor="end"
          >
            20 超賣
          </text>

          {/* K 折線 (粉紅) */}
          {kPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points={kPoints.join(' ')}
            />
          )}

          {/* D 折線 (橙黃) */}
          {dPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points={dPoints.join(' ')}
            />
          )}
        </svg>
      </div>
    </div>
  );
};

/**
 * 依據真實日 K 提取 MACD 指標數據 (Task 4 Pure Seam)
 */
export function deriveMacdMetrics(report: AiForceDashboardReport) {
  const candles = report.klineSystem?.candles ?? [];
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const dif = last?.dif ?? 0;
  const macd = last?.macd ?? 0;
  const macdHist = last?.macdHist ?? 0;
  const prevHist = prev?.macdHist ?? 0;

  const isExpanding = Math.abs(macdHist) >= Math.abs(prevHist);
  let statusText = '零軸平水';
  if (macdHist >= 0) {
    statusText = isExpanding ? '紅柱擴張 (多方續強)' : '紅柱收斂 (多方趨緩)';
  } else {
    statusText = isExpanding ? '綠柱擴張 (空方增強)' : '綠柱收斂 (空方減弱)';
  }

  return {
    dif,
    macd,
    macdHist,
    statusText,
    recentCandles: candles.slice(-30),
  };
}

/**
 * 任務四：MACD 圖表面板
 */
export const MacdView: React.FC<TaskPanelProps> = ({ report }) => {
  const { dif, macd, macdHist, statusText, recentCandles } = deriveMacdMetrics(report);

  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 30 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // 取得數值範圍
  let maxAbs = 1;
  recentCandles.forEach((c) => {
    maxAbs = Math.max(maxAbs, Math.abs(c.dif ?? 0), Math.abs(c.macd ?? 0), Math.abs(c.macdHist ?? 0));
  });
  maxAbs = maxAbs * 1.1;

  const zeroY = padding.top + plotHeight / 2;
  const count = recentCandles.length;

  const difPoints = recentCandles.map((c, idx) => {
    const x = padding.left + (idx / Math.max(1, count - 1)) * plotWidth;
    const y = zeroY - ((c.dif ?? 0) / maxAbs) * (plotHeight / 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const macdPoints = recentCandles.map((c, idx) => {
    const x = padding.left + (idx / Math.max(1, count - 1)) * plotWidth;
    const y = zeroY - ((c.macd ?? 0) / maxAbs) * (plotHeight / 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📉</span> 任務四：MACD 指數平滑異同移動平均線 ({report.symbol} {report.name})
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>DIF 快線 (12, 26)</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>
            {dif >= 0 ? `+${dif}` : dif}
          </div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>MACD 慢線 (9)</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7' }}>
            {macd >= 0 ? `+${macd}` : macd}
          </div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>OSC 柱狀體</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: macdHist >= 0 ? '#ef4444' : '#10b981' }}>
            {macdHist >= 0 ? `+${macdHist}` : macdHist} ({statusText})
          </div>
        </div>
      </div>

      {/* 原生 SVG MACD 走勢圖 */}
      <div
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px',
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '220px', display: 'block' }}
        >
          {/* 零軸基準線 */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={svgWidth - padding.right}
            y2={zeroY}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1"
          />

          {/* OSC 直方柱 */}
          {recentCandles.map((c, idx) => {
            const x = padding.left + (idx / Math.max(1, count - 1)) * plotWidth;
            const hVal = c.macdHist ?? 0;
            const barH = (Math.abs(hVal) / maxAbs) * (plotHeight / 2);
            const barY = hVal >= 0 ? zeroY - barH : zeroY;
            return (
              <rect
                key={c.date}
                x={x - 3}
                y={barY}
                width="6"
                height={Math.max(1, barH)}
                fill={hVal >= 0 ? '#ef4444' : '#10b981'}
                opacity={0.8}
              />
            );
          })}

          {/* DIF 線 (亮藍) */}
          {difPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              points={difPoints.join(' ')}
            />
          )}

          {/* MACD 線 (紫色) */}
          {macdPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              points={macdPoints.join(' ')}
            />
          )}
        </svg>
      </div>
    </div>
  );
};

/**
 * 客戶端日 K 降序分頁純函式 (Task 5 Pure Seam)
 */
export function paginateCandles(
  candles: KlineCandleItem[],
  page: number,
  pageSize: number = 10
) {
  const sorted = [...candles].sort((a, b) => b.date.localeCompare(a.date));
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const items = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    items,
    totalPages,
    currentPage,
    totalCount: sorted.length,
  };
}

/**
 * 任務五：原始資料表面板
 */
export const RawDataView: React.FC<TaskPanelProps> = ({ report }) => {
  const [page, setPage] = useState(1);
  const candles = report.klineSystem?.candles ?? [];
  const { items, totalPages, currentPage, totalCount } = paginateCandles(candles, page, 10);

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📑</span> 原始量化數據總表 ({report.symbol} {report.name})
        </h3>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>共 {totalCount} 筆交易日資料</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>日期</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>開盤</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>最高</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>最低</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>收盤</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>成交量</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>MA20</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>KD (K/D)</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>MACD (OSC)</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>RSI</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.date}
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: '#f1f5f9' }}
              >
                <td style={{ padding: '8px' }}>{row.date}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>${row.open.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>${row.high.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>${row.low.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>${row.close.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>{row.volume.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '8px', color: '#38bdf8' }}>
                  {row.ma20 ? `$${row.ma20.toLocaleString()}` : '-'}
                </td>
                <td style={{ textAlign: 'right', padding: '8px' }}>
                  {row.k ?? '-'}/{row.d ?? '-'}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '8px',
                    color: (row.macdHist ?? 0) >= 0 ? '#ef4444' : '#10b981',
                  }}
                >
                  {row.macdHist !== undefined ? (row.macdHist >= 0 ? `+${row.macdHist}` : row.macdHist) : '-'}
                </td>
                <td style={{ textAlign: 'right', padding: '8px' }}>{row.rsi ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 客戶端分頁切換控制列 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '12px',
        }}
      >
        <span style={{ color: '#94a3b8' }}>
          第 {currentPage} / {totalPages} 頁
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              backgroundColor: currentPage <= 1 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(56, 189, 248, 0.15)',
              color: currentPage <= 1 ? '#64748b' : '#38bdf8',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            上一頁
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              backgroundColor:
                currentPage >= totalPages ? 'rgba(255, 255, 255, 0.04)' : 'rgba(56, 189, 248, 0.15)',
              color: currentPage >= totalPages ? '#64748b' : '#38bdf8',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  );
};
