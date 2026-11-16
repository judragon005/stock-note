import React from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UpcomingExDividendRadarItem } from '../../types/dividend';

export interface ExDividendRadarCardProps {
  radarEvents: UpcomingExDividendRadarItem[];
  horizonDays?: number;
  onHorizonChange?: (days: number) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  market?: 'ALL' | 'TW' | 'US';
}

export const ExDividendRadarCard: React.FC<ExDividendRadarCardProps> = ({
  radarEvents = [],
  horizonDays = 60,
  onHorizonChange,
  isExpanded = true,
  onToggleExpand,
  market = 'ALL',
}) => {
  // KPI 統計彙整
  const totalEventsCount = radarEvents.length;
  const totalEstimatedNetTWD = radarEvents.reduce((sum, item) => sum + item.estimatedNetTWD, 0);
  const totalWithholdingTaxTWD = radarEvents.reduce(
    (sum, item) => sum + Math.max(0, item.estimatedGrossTWD - item.estimatedNetTWD),
    0
  );
  const nhiAlertsCount = radarEvents.filter((item) => item.isNhiTriggered).length;
  const totalNhiFeeTWD = radarEvents.reduce((sum, item) => sum + (item.nhiFeeTWD || 0), 0);
  const isUsMarket = market === 'US';

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        padding: '20px',
        borderRadius: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        marginBottom: '20px',
      }}
    >
      {/* 標題與控制器欄 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: isExpanded ? '16px' : '0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
            }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                近日持倉除息行事曆雷達
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  fontWeight: 600,
                }}
              >
                未來 {horizonDays} 天視野
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              {isUsMarket
                ? '雙時序除息前瞻 · 美股 30% 稅負實質折算 · 填息動能評估'
                : '雙時序除息前瞻 · 二代健保臨界警報 · 填息動能評估'}
            </p>
          </div>
        </div>

        {/* 視窗切換開關與折疊按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onHorizonChange && (
            <div
              style={{
                display: 'flex',
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid rgba(71, 85, 105, 0.5)',
              }}
            >
              <button
                type="button"
                onClick={() => onHorizonChange(60)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: horizonDays === 60 ? 600 : 400,
                  color: horizonDays === 60 ? '#38bdf8' : '#94a3b8',
                  background: horizonDays === 60 ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                近 60 天 (確定)
              </button>
              <button
                type="button"
                onClick={() => onHorizonChange(90)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: horizonDays === 90 ? 600 : 400,
                  color: horizonDays === 90 ? '#38bdf8' : '#94a3b8',
                  background: horizonDays === 90 ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                近 90 天 (含推估)
              </button>
            </div>
          )}

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              title={isExpanded ? '收合雷達' : '展開雷達'}
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* KPI 統計條 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          marginBottom: isExpanded ? '16px' : '0',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>預計除息標的</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
            {totalEventsCount} <span style={{ fontSize: '12px', fontWeight: 400 }}>檔</span>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>預估淨入帳總額</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
            NT$ {totalEstimatedNetTWD.toLocaleString()}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {isUsMarket ? '美股 IRS 30% 預扣稅' : '二代健保預警'}
          </span>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: isUsMarket ? '#38bdf8' : nhiAlertsCount > 0 ? '#f59e0b' : '#10b981',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isUsMarket ? (
              <span>已預扣 NT$ {totalWithholdingTaxTWD.toLocaleString()}</span>
            ) : nhiAlertsCount > 0 ? (
              <>
                <AlertTriangle size={14} />
                <span>
                  {nhiAlertsCount} 筆達健保扣費門檻 (預扣 NT$ {totalNhiFeeTWD.toLocaleString()})
                </span>
              </>
            ) : (
              <span>0 筆達門檻 (安全)</span>
            )}
          </div>
        </div>
      </div>

      {/* 清單主體 */}
      {isExpanded && (
        <div>
          {radarEvents.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '12px',
                border: '1px dashed rgba(71, 85, 105, 0.4)',
              }}
            >
              <Clock size={32} style={{ color: '#64748b', marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                未來 {horizonDays} 天內無持倉股票即將除息
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                可透過上方「同步公司行動」抓取臺灣證券交易所或官方最新公佈日程
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {radarEvents.map((item) => {
                const isToday = item.daysUntilEx === 0;
                const isUrgent = item.daysUntilEx <= 7;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: isToday
                        ? 'rgba(239, 68, 68, 0.12)'
                        : isUrgent
                        ? 'rgba(245, 158, 11, 0.08)'
                        : 'rgba(30, 41, 59, 0.5)',
                      border: isToday
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : isUrgent
                        ? '1px solid rgba(245, 158, 11, 0.3)'
                        : '1px solid rgba(51, 65, 85, 0.6)',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    {/* 左側：倒數天數徽章與標的名稱 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                      <div
                        style={{
                          minWidth: '72px',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: isToday
                            ? 'rgba(239, 68, 68, 0.25)'
                            : isUrgent
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(56, 189, 248, 0.15)',
                          color: isToday ? '#f87171' : isUrgent ? '#fbbf24' : '#38bdf8',
                          border: isToday
                            ? '1px solid rgba(239, 68, 68, 0.5)'
                            : isUrgent
                            ? '1px solid rgba(245, 158, 11, 0.4)'
                            : '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                      >
                        {isToday ? '今日除息' : `T-${item.daysUntilEx} 天`}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                            {item.symbol}
                          </span>
                          <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                            {item.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: item.market === 'TW' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                              color: item.market === 'TW' ? '#60a5fa' : '#c084fc',
                            }}
                          >
                            {item.market}
                          </span>
                          {item.accountId && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(100, 116, 139, 0.2)',
                                color: '#94a3b8',
                              }}
                            >
                              {item.accountId}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          持倉 {item.sharesHeld.toLocaleString()} 股 · 配息 {item.cashPerShare} {item.currency}
                        </div>
                      </div>
                    </div>

                    {/* 中間：除息日與入帳發放日程 */}
                    <div style={{ minWidth: '170px' }}>
                      <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                        除息日: <strong style={{ color: '#f8fafc' }}>{item.exDate}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        發放日: {item.payDate}{' '}
                        <span style={{ color: '#38bdf8' }}>
                          (+{item.daysFromExToPay}天入帳)
                        </span>
                      </div>
                    </div>

                    {/* 右側：金額與狀態標籤 */}
                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
                        NT$ {item.estimatedNetTWD.toLocaleString()}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {item.isNhiTriggered && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.2)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              color: '#fbbf24',
                            }}
                            title={`單筆總額 NT$ ${item.estimatedGrossTWD.toLocaleString()} 達二代健保 20,000 元門檻`}
                          >
                            健保 2.11% (-NT$ {item.nhiFeeTWD.toLocaleString()})
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: item.scheduleType === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            border: item.scheduleType === 'CONFIRMED' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)',
                            color: item.scheduleType === 'CONFIRMED' ? '#34d399' : '#94a3b8',
                          }}
                        >
                          {item.scheduleType === 'CONFIRMED' ? '官方確定' : '週期推估'}
                        </span>

                        {item.recoveryRating === 'HIGH_MOMENTUM' && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(52, 211, 153, 0.15)',
                              color: '#34d399',
                            }}
                            title="歷史填息動能強勁"
                          >
                            高填息信心
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
