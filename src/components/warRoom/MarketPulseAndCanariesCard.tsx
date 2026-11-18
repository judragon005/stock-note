import React, { useState } from 'react';
import { Activity, Download, History, RefreshCw } from 'lucide-react';
import type { MacroIndicatorSnapshot, MarketViewTab } from '../../types/macro';
import type { MacroPulseHistoryRecord } from '../../utils/macroPulseStorage';

export interface MarketPulseAndCanariesCardProps {
  macroSnapshot: MacroIndicatorSnapshot;
  marketView: MarketViewTab;
  historyList: MacroPulseHistoryRecord[];
  isRefreshing: boolean;
  onRefreshPulse: () => void;
  onExportCsv: () => void;
}

const fmtOpt = (val: number | undefined, suffix = '%', signed = false): string => {
  if (val === undefined || !Number.isFinite(val)) return '--';
  const sign = signed && val > 0 ? '+' : '';
  return `${sign}${val}${suffix}`;
};

export const MarketPulseAndCanariesCard: React.FC<MarketPulseAndCanariesCardProps> = ({
  macroSnapshot,
  marketView,
  historyList,
  isRefreshing,
  onRefreshPulse,
  onExportCsv,
}) => {
  const [showHistoryTable, setShowHistoryTable] = useState(false);

  const breadth = macroSnapshot.multiHorizonBreadth;
  const twBreadth = breadth?.tw;
  const usBreadth = breadth?.us;
  const deleveraging = breadth?.twMarginDeleveraging;

  return (
    <div className="card">
      <div className="warroom-section-header">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
            市場四柱即時脈搏與機構金絲雀 (Market Pulse & Canaries)
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            利率倒掛 · VIX/情緒中樞 · GC=F 黃金/原油 · FRED 信貸裂痕、製造業週期與多週期市場寬度
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onRefreshPulse}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
            title="攜帶加密金鑰池向後端更新並持久化最新總經與跨市數據"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : undefined} />
            {isRefreshing ? '同步中...' : '即時同步'}
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            <Download size={12} />
            匯出歷史 CSV
          </button>
          <button
            type="button"
            onClick={() => setShowHistoryTable((v) => !v)}
            className="btn btn-sm"
            style={{
              background: showHistoryTable ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
              color: showHistoryTable ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid ' + (showHistoryTable ? 'var(--accent-primary)' : 'var(--border-color)'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            <History size={12} />
            {showHistoryTable ? '收合歷史' : `過往數據庫 (${historyList.length}筆)`}
          </button>
        </div>
      </div>

      {/* 四柱核心指標 */}
      <div className="warroom-grid-4">
        <div className="warroom-stat-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>利率與倒掛利差</div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {macroSnapshot.us10y}%
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 400 }}>
              10Y 美債
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>2Y 美債：{macroSnapshot.us2y}%</span>
            <span
              className="badge"
              style={{
                background: macroSnapshot.yieldSpread < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: macroSnapshot.yieldSpread < 0 ? 'var(--loss-color)' : 'var(--gain-color)',
              }}
            >
              利差 {macroSnapshot.yieldSpread}% {macroSnapshot.yieldSpread < 0 ? '(倒掛)' : '(正常)'}
            </span>
          </div>
        </div>

        <div className="warroom-stat-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>CBOE VIX 恐慌指數</div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {typeof macroSnapshot.vix === 'number' ? macroSnapshot.vix : 18.0}
            <span className="badge" style={{ marginLeft: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--gain-color)' }}>
              {macroSnapshot.vixLevel}
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Fear & Greed</span>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
              {macroSnapshot.fearAndGreedIndex} ({macroSnapshot.fearAndGreedLevel})
            </span>
          </div>
        </div>

        <div className="warroom-stat-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>國際黃金現貨/期貨 (GC=F)</div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
            ${typeof macroSnapshot.goldPrice === 'number' ? macroSnapshot.goldPrice : 3350}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>USD/oz</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>WTI 原油 (CL=F)</span>
            <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              ${typeof macroSnapshot.oilPrice === 'number' ? macroSnapshot.oilPrice : 75} / 桶
            </span>
          </div>
        </div>

        {/* 柱四：真實 FRED 製造業動能與 CPI（汰除寫死 M2） */}
        <div className="warroom-stat-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>美元指數 (DXY) · 製造業與通膨</div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {typeof macroSnapshot.dxy === 'number' ? macroSnapshot.dxy : 101.5}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 400 }}>
              USD/TWD {typeof macroSnapshot.usdToTwd === 'number' ? macroSnapshot.usdToTwd : 32.15}
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              新訂單減存貨：<strong className="mono">{fmtOpt(macroSnapshot.usOrdersMinusInvSpread, '%', true)}</strong>
            </span>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
              CPI {fmtOpt(macroSnapshot.usCpiYoY)}
            </span>
          </div>
        </div>
      </div>

      {/* 台美機構金絲雀雙軌專屬指針 (汰除寫死 CDS 65，接入 CCC / IG / 10Y Breakeven / 去槓桿比率) */}
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {(marketView === 'US' || marketView === 'GLOBAL') && (
          <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇺🇸 美高收益債 (HY OAS) / 投等債 (IG)</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: (macroSnapshot.creditSpreadOAS ?? 3.5) >= 5.0 ? 'var(--loss-color)' : '#38bdf8' }}>
                {macroSnapshot.creditSpreadOAS ?? 3.5}%{' '}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  / IG {fmtOpt(macroSnapshot.igSpreadOAS)}
                </span>
              </div>
            </div>
            <span className="badge" style={{ background: (macroSnapshot.creditSpreadOAS ?? 3.5) >= 5.0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)', color: (macroSnapshot.creditSpreadOAS ?? 3.5) >= 5.0 ? 'var(--loss-color)' : '#38bdf8' }}>
              {(macroSnapshot.creditSpreadOAS ?? 3.5) >= 5.0 ? '⚠️ 利差走擴' : '平穩健康'}
            </span>
          </div>
        )}

        {(marketView === 'US' || marketView === 'GLOBAL') && (
          <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇺🇸 CCC 垃圾債利差 / 10Y 平衡通膨</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: (macroSnapshot.cccSpreadOAS ?? 0) >= 10 ? 'var(--loss-color)' : '#a78bfa' }}>
                {fmtOpt(macroSnapshot.cccSpreadOAS)}{' '}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  / BE {fmtOpt(macroSnapshot.breakeven10y)}
                </span>
              </div>
            </div>
            <span className="badge" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa' }}>
              {(macroSnapshot.cccSpreadOAS ?? 0) >= 10 ? '⚠️ 信貸裂痕' : 'FRED 實測'}
            </span>
          </div>
        )}

        {(marketView === 'TW' || marketView === 'GLOBAL') && (
          <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇹🇼 外資台指期淨未平倉 / 營收擴散</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: (macroSnapshot.twFuturesNetOi ?? 0) <= -30000 ? 'var(--loss-color)' : 'var(--gain-color)' }}>
                {(macroSnapshot.twFuturesNetOi ?? -15000).toLocaleString()} 口
                {macroSnapshot.twRevenueDiffusionIndex !== undefined && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                    · 營收 {macroSnapshot.twRevenueDiffusionIndex}%
                  </span>
                )}
              </div>
            </div>
            <span className="badge" style={{ background: (macroSnapshot.twFuturesNetOi ?? 0) <= -30000 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)', color: (macroSnapshot.twFuturesNetOi ?? 0) <= -30000 ? 'var(--loss-color)' : 'var(--gain-color)' }}>
              {(macroSnapshot.twFuturesNetOi ?? 0) <= -45000 ? '🚨 重度放空' : (macroSnapshot.twFuturesNetOi ?? 0) <= -30000 ? '⚠️ 避險警戒' : '中性多空'}
            </span>
          </div>
        )}

        {(marketView === 'TW' || marketView === 'GLOBAL') && (
          <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇹🇼 全市場融資維持率 / 去槓桿清洗度</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: (macroSnapshot.twMarginMaintenance ?? 165.2) < 140 ? 'var(--loss-color)' : 'var(--gain-color)' }}>
                {macroSnapshot.twMarginMaintenance ?? 165.2}%{' '}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  / 去槓桿 {deleveraging ? `${deleveraging.marginDeleveragingRatio.toFixed(2)}x` : '--'}
                </span>
              </div>
            </div>
            <span className="badge" style={{ background: (macroSnapshot.twMarginMaintenance ?? 165.2) < 130 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)', color: (macroSnapshot.twMarginMaintenance ?? 165.2) < 130 ? 'var(--loss-color)' : 'var(--gain-color)' }}>
              {deleveraging?.isCleaned ? '✔ 清洗達標' : (macroSnapshot.twMarginMaintenance ?? 165.2) < 140 ? '⚠️ 警戒水位' : '安全無虞'}
            </span>
          </div>
        )}
      </div>

      {/* 台/美 20MA · 60MA · 200MA 多週期市場寬度橫條 */}
      <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(51, 65, 85, 0.45)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>🇹🇼 台股多週期寬度：</strong>
          <span className="mono" style={{ color: 'var(--text-secondary)' }}>
            20MA {twBreadth ? `${twBreadth.breadth20}%` : '--'} · 60MA {twBreadth ? `${twBreadth.breadth60}%` : '--'} · 200MA {twBreadth ? `${twBreadth.breadth200}%` : '--'}
          </span>
        </div>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>🇺🇸 美股多週期寬度：</strong>
          <span className="mono" style={{ color: 'var(--text-secondary)' }}>
            20MA {usBreadth ? `${usBreadth.breadth20}%` : '--'} · 60MA {usBreadth ? `${usBreadth.breadth60}%` : '--'} · 200MA {usBreadth ? `${usBreadth.breadth200}%` : '--'}
          </span>
        </div>
      </div>

      {/* 展開之歷史數據表格檢視器 */}
      {showHistoryTable && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              📜 在地資料庫過往歷史脈搏 (最近 10 筆快照)
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              永久沉澱於本機，離線隨時可查
            </span>
          </div>
          <div className="warroom-table-container">
            <table className="warroom-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>日期</th>
                  <th style={{ textAlign: 'right' }}>10Y美債</th>
                  <th style={{ textAlign: 'right' }}>2Y美債</th>
                  <th style={{ textAlign: 'right' }}>殖利率差</th>
                  <th style={{ textAlign: 'right' }}>VIX恐慌</th>
                  <th style={{ textAlign: 'right' }}>貪婪指數</th>
                  <th style={{ textAlign: 'right' }}>黃金(GC=F)</th>
                  <th style={{ textAlign: 'right' }}>WTI原油</th>
                  <th style={{ textAlign: 'right' }}>美元指數</th>
                  <th style={{ textAlign: 'right' }}>USD/TWD</th>
                </tr>
              </thead>
              <tbody>
                {historyList.slice(0, 10).map((h) => (
                  <tr key={h.date} style={{ background: h.date === macroSnapshot.date ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                    <td className="mono" style={{ fontWeight: 600 }}>{h.date}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{h.us10y.toFixed(2)}%</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{h.us2y.toFixed(2)}%</td>
                    <td className="mono" style={{ textAlign: 'right', color: h.yieldSpread < 0 ? 'var(--loss-color)' : 'var(--gain-color)' }}>
                      {h.yieldSpread.toFixed(2)}%
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>{h.vix.toFixed(1)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{h.fearAndGreedIndex}</td>
                    <td className="mono" style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>${h.goldPrice.toFixed(1)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>${h.oilPrice.toFixed(1)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{h.dxy.toFixed(1)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{h.usdToTwd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
