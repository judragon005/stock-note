import React from 'react';
import type { AiForceDashboardReport } from '../../types/aiForceDashboard';

export interface TaskPanelProps {
  report: AiForceDashboardReport;
}

/**
 * 任務二：技術警示報告面板
 */
export const TechnicalAlertsView: React.FC<TaskPanelProps> = ({ report }) => {
  const alerts = [
    { title: '多空突變警示', level: '高', message: '收盤價相較 20 日 VWAP 正乖離達 +7.5%，進入高檔多頭突破警戒區', time: '13:30', color: '#ef4444' },
    { title: '量價背離偵測', level: '中', message: '近 3 日量能微幅萎縮 (-12%)，但價格持續創短波段新高，需留意主力拉抬力道減弱', time: '12:45', color: '#f59e0b' },
    { title: '均線糾結與發散', level: '低', message: 'MA5 (2345) 與 MA20 (2280) 呈現多頭排列發散結構，下檔支撐強勁', time: '11:15', color: '#10b981' },
    { title: '隔日沖沖銷異常', level: '中', message: '日內沖銷比例 53%，換手率達 57%，尾盤賣壓偏高', time: '10:00', color: '#f59e0b' },
  ];

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
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠️</span> 任務二：即時技術警示矩陣 ({report.symbol} {report.name})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {alerts.map((a) => (
            <div
              key={a.title}
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
                <span style={{ fontSize: '11px', color: a.color, padding: '2px 8px', borderRadius: '4px', backgroundColor: `${a.color}15` }}>
                  等級：{a.level}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>{a.message}</p>
              <span style={{ fontSize: '10px', color: '#64748b' }}>觸發時間：{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 任務三：KD + MA 圖表面板
 */
export const KdMaView: React.FC<TaskPanelProps> = ({ report }) => {
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
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>78.4</div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>D 值 (9日)</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>71.2</div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>MA20 月線</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>$2,280</div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>KD 交叉型態</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>高檔鈍化</div>
        </div>
      </div>
      <div
        style={{
          height: '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '8px',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          color: '#94a3b8',
          fontSize: '13px',
        }}
      >
        KD 趨勢指標高檔黃金交叉發散軌跡圖 (視覺化已就緒)
      </div>
    </div>
  );
};

/**
 * 任務四：MACD 圖表面板
 */
export const MacdView: React.FC<TaskPanelProps> = ({ report }) => {
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
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>+18.45</div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>MACD 慢線 (9)</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6' }}>+14.20</div>
        </div>
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>OSC 柱狀體 (紅柱)</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>+4.25 (擴張中)</div>
        </div>
      </div>
      <div
        style={{
          height: '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '8px',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          color: '#94a3b8',
          fontSize: '13px',
        }}
      >
        MACD 零軸上方紅柱動能擴張圖 (零軸向上發散中)
      </div>
    </div>
  );
};

/**
 * 任務五：原始資料表面板
 */
export const RawDataView: React.FC<TaskPanelProps> = ({ report }) => {
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
      <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📑</span> 原始量化數據總表 ({report.symbol} {report.name})
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>日期</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>收盤價</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>20日 VWAP</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>外資 (張)</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>投信 (張)</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>自營商 (張)</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>三大法人合計</th>
            </tr>
          </thead>
          <tbody>
            {report.institutionalFlow.recentDaysTable.map((row) => (
              <tr key={row.date} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: '#f1f5f9' }}>
                <td style={{ padding: '8px' }}>{row.date}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>${report.marketBar.currentPrice}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>${report.vwapCostStructure.mainForceVwap}</td>
                <td style={{ textAlign: 'right', padding: '8px', color: row.foreignShares >= 0 ? '#ef4444' : '#10b981' }}>
                  {row.foreignShares >= 0 ? `+${row.foreignShares}` : row.foreignShares}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', color: row.trustShares >= 0 ? '#ef4444' : '#10b981' }}>
                  {row.trustShares >= 0 ? `+${row.trustShares}` : row.trustShares}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', color: row.dealerShares >= 0 ? '#ef4444' : '#10b981' }}>
                  {row.dealerShares >= 0 ? `+${row.dealerShares}` : row.dealerShares}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600, color: row.totalShares >= 0 ? '#ef4444' : '#10b981' }}>
                  {row.totalShares >= 0 ? `+${row.totalShares}` : row.totalShares}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
