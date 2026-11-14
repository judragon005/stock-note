import React, { useMemo } from 'react';
import { Award } from 'lucide-react';
import { HoldingPosition } from '../../types/stock';
import { DividendContributor } from './DividendHistoryTable';

export interface DividendTopContributorsCardProps {
  activeContributors: DividendContributor[];
  rankMode: 'YEAR' | 'ALL_TIME';
  onRankModeChange: (mode: 'YEAR' | 'ALL_TIME') => void;
  selectedYear: number;
  holdings: HoldingPosition[];
}

export const DividendTopContributorsCard: React.FC<DividendTopContributorsCardProps> = ({
  activeContributors,
  rankMode,
  onRankModeChange,
  selectedYear,
  holdings,
}) => {
  // 建立標的持倉快速比對 Map (不讓已結清帳戶覆蓋活躍持倉)
  const holdingsMap = useMemo(() => {
    const map = new Map<string, HoldingPosition>();
    holdings.forEach((h) => {
      const sym = h.symbol.toUpperCase();
      const existing = map.get(sym);
      if (!existing || (existing.shares <= 0 && h.shares > 0)) {
        map.set(sym, h);
      }
    });
    return map;
  }, [holdings]);

  return (
    <div
      className="glass-card"
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '14px',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#c084fc" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              股息貢獻排行 (Top)
            </h3>
          </div>

          {/* 當年度 vs 全歷史 切換開關 */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(19, 29, 49, 0.8)',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => onRankModeChange('YEAR')}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: 'none',
                background: rankMode === 'YEAR' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
                color: rankMode === 'YEAR' ? '#ffffff' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: rankMode === 'YEAR' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {selectedYear}年
            </button>
            <button
              type="button"
              onClick={() => onRankModeChange('ALL_TIME')}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: 'none',
                background: rankMode === 'ALL_TIME' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
                color: rankMode === 'ALL_TIME' ? '#ffffff' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: rankMode === 'ALL_TIME' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              全歷史
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '190px', overflowY: 'auto' }}>
          {activeContributors.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '30px 0' }}>
              {rankMode === 'YEAR' ? `${selectedYear} 年度尚無股息記錄` : '尚無股息發放紀錄'}
            </div>
          ) : (
            activeContributors.slice(0, 5).map((item, idx) => {
              const holding = holdingsMap.get(item.symbol.toUpperCase());
              const holdingCost = holding?.avgCost || 0;
              return (
                <div key={item.symbol} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#334155',
                          color: '#ffffff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: 700, color: '#ffffff', flexShrink: 0 }}>{item.symbol}</span>
                      <span
                        style={{
                          color: '#94a3b8',
                          maxWidth: '85px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flexShrink: 1,
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      {holdingCost > 0 && holding?.yieldOnCostPercent ? (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.15)',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            flexShrink: 0,
                          }}
                        >
                          YOC: {holding.yieldOnCostPercent.toFixed(1)}%
                        </span>
                      ) : null}
                    </div>
                    <span
                      className="mono"
                      style={{
                        fontWeight: 700,
                        color: '#34d399',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                        marginLeft: '8px',
                      }}
                    >
                      NT$ {item.totalDividendsTWD.toLocaleString()} ({item.percentageOfTotal}%)
                    </span>
                  </div>

                  {/* 進度條 */}
                  <div style={{ width: '100%', height: '5px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, item.percentageOfTotal)}%`,
                        background: 'linear-gradient(90deg, #a855f7 0%, #10b981 100%)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: '#64748b', paddingTop: '8px', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
        {rankMode === 'YEAR' ? `${selectedYear} 年度共 ${activeContributors.length} 檔標的貢獻` : `全歷史共 ${activeContributors.length} 檔標的貢獻`}
      </div>
    </div>
  );
};

